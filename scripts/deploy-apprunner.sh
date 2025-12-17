#!/bin/bash
# CounselFlow AWS App Runner Deployment Script

set -e

APP_NAME="counselflow"
REGION="us-east-1"
ECR_URI="111238651930.dkr.ecr.us-east-1.amazonaws.com/counselflow:latest"

echo "=========================================="
echo "Deploying CounselFlow to AWS App Runner"
echo "=========================================="

# ============================================
# 1. Create IAM Role for App Runner to Access ECR
# ============================================
echo "[1/4] Creating IAM role for App Runner..."

# Trust policy for App Runner
cat > /tmp/apprunner-trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "build.apprunner.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create the role
aws iam create-role \
    --role-name "${APP_NAME}-apprunner-ecr-role" \
    --assume-role-policy-document file:///tmp/apprunner-trust-policy.json \
    --region "$REGION" 2>/dev/null || echo "Role already exists"

# Attach ECR access policy
aws iam attach-role-policy \
    --role-name "${APP_NAME}-apprunner-ecr-role" \
    --policy-arn "arn:aws:iam::aws:policy/service-role/AWSAppRunnerServicePolicyForECRAccess" 2>/dev/null || true

ROLE_ARN=$(aws iam get-role --role-name "${APP_NAME}-apprunner-ecr-role" --query 'Role.Arn' --output text)
echo "  Role ARN: $ROLE_ARN"

# Wait for role to propagate
echo "  Waiting for IAM role to propagate..."
sleep 10

# ============================================
# 2. Create App Runner Service
# ============================================
echo "[2/4] Creating App Runner service..."

# Read credentials
source ~/.counselflow-aws-credentials

# Create service configuration
cat > /tmp/apprunner-service.json << EOF
{
  "ServiceName": "${APP_NAME}",
  "SourceConfiguration": {
    "ImageRepository": {
      "ImageIdentifier": "${ECR_URI}",
      "ImageConfiguration": {
        "Port": "3001",
        "RuntimeEnvironmentVariables": {
          "NODE_ENV": "production",
          "PORT": "3001",
          "DATABASE_URL": "${DATABASE_URL}",
          "S3_BUCKET_NAME": "${S3_BUCKET_NAME}",
          "S3_REGION": "${S3_REGION}",
          "S3_ACCESS_KEY_ID": "${S3_ACCESS_KEY_ID}",
          "S3_SECRET_ACCESS_KEY": "${S3_SECRET_ACCESS_KEY}",
          "SESSION_SECRET": "${SESSION_SECRET}",
          "GOOGLE_CLIENT_ID": "${GOOGLE_CLIENT_ID}",
          "GOOGLE_CLIENT_SECRET": "${GOOGLE_CLIENT_SECRET}",
          "GOOGLE_REDIRECT_URI": "https://app.counselflow.com/settings",
          "AI_PROVIDER": "openai"
        }
      },
      "ImageRepositoryType": "ECR"
    },
    "AutoDeploymentsEnabled": true,
    "AuthenticationConfiguration": {
      "AccessRoleArn": "${ROLE_ARN}"
    }
  },
  "InstanceConfiguration": {
    "Cpu": "1024",
    "Memory": "2048"
  },
  "HealthCheckConfiguration": {
    "Protocol": "HTTP",
    "Path": "/health",
    "Interval": 10,
    "Timeout": 5,
    "HealthyThreshold": 1,
    "UnhealthyThreshold": 3
  }
}
EOF

# Check if service exists
EXISTING_SERVICE=$(aws apprunner list-services --region "$REGION" --query "ServiceSummaryList[?ServiceName=='${APP_NAME}'].ServiceArn" --output text 2>/dev/null || echo "")

if [ -n "$EXISTING_SERVICE" ] && [ "$EXISTING_SERVICE" != "None" ]; then
    echo "  Service already exists, updating..."
    # For updates, we'd use update-service, but for simplicity let's just report
    SERVICE_URL=$(aws apprunner describe-service --service-arn "$EXISTING_SERVICE" --region "$REGION" --query 'Service.ServiceUrl' --output text)
else
    # Create new service
    SERVICE_RESPONSE=$(aws apprunner create-service \
        --cli-input-json file:///tmp/apprunner-service.json \
        --region "$REGION")

    SERVICE_ARN=$(echo "$SERVICE_RESPONSE" | grep -o '"ServiceArn": "[^"]*' | cut -d'"' -f4)
    echo "  Service ARN: $SERVICE_ARN"
fi

# ============================================
# 3. Wait for Deployment
# ============================================
echo "[3/4] Waiting for service to be running..."

if [ -z "$SERVICE_ARN" ]; then
    SERVICE_ARN="$EXISTING_SERVICE"
fi

# Poll for service status
for i in {1..60}; do
    STATUS=$(aws apprunner describe-service \
        --service-arn "$SERVICE_ARN" \
        --region "$REGION" \
        --query 'Service.Status' \
        --output text 2>/dev/null || echo "PENDING")

    echo "  Status: $STATUS (attempt $i/60)"

    if [ "$STATUS" = "RUNNING" ]; then
        break
    elif [ "$STATUS" = "CREATE_FAILED" ] || [ "$STATUS" = "DELETE_FAILED" ]; then
        echo "ERROR: Service deployment failed!"
        exit 1
    fi

    sleep 10
done

# ============================================
# 4. Get Service URL
# ============================================
echo "[4/4] Getting service URL..."

SERVICE_URL=$(aws apprunner describe-service \
    --service-arn "$SERVICE_ARN" \
    --region "$REGION" \
    --query 'Service.ServiceUrl' \
    --output text)

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "Backend URL: https://${SERVICE_URL}"
echo ""
echo "Next steps:"
echo "  1. Test the health endpoint: curl https://${SERVICE_URL}/health"
echo "  2. Deploy frontend to Vercel/S3/CloudFront"
echo "  3. Configure custom domain (optional)"
echo "  4. Update OAuth redirect URIs if needed"
echo ""
