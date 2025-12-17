#!/bin/bash
# CounselFlow AWS Infrastructure Setup Script
# Run this script to create all required AWS resources

set -e

# Configuration
APP_NAME="counselflow"
REGION="${AWS_REGION:-us-east-1}"
DB_INSTANCE_CLASS="db.t3.micro"  # Free tier eligible
DB_NAME="counselflow"
DB_USERNAME="counselflow_admin"
DB_PASSWORD=$(openssl rand -base64 16 | tr -dc 'a-zA-Z0-9' | head -c 16)
S3_BUCKET="${APP_NAME}-documents-$(openssl rand -hex 4)"

echo "=========================================="
echo "CounselFlow AWS Infrastructure Setup"
echo "=========================================="
echo "Region: $REGION"
echo "App Name: $APP_NAME"
echo ""

# Save credentials
CREDENTIALS_FILE="$HOME/.counselflow-aws-credentials"
echo "# CounselFlow AWS Credentials - $(date)" > "$CREDENTIALS_FILE"
echo "# KEEP THIS FILE SECURE - DO NOT COMMIT TO GIT" >> "$CREDENTIALS_FILE"
chmod 600 "$CREDENTIALS_FILE"

# ============================================
# 1. Create VPC Security Group for RDS
# ============================================
echo "[1/7] Creating Security Group..."
SG_ID=$(aws ec2 create-security-group \
    --group-name "${APP_NAME}-db-sg" \
    --description "Security group for CounselFlow RDS" \
    --region "$REGION" \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
        --group-names "${APP_NAME}-db-sg" \
        --region "$REGION" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)

# Allow MySQL access from anywhere (restrict in production!)
aws ec2 authorize-security-group-ingress \
    --group-id "$SG_ID" \
    --protocol tcp \
    --port 3306 \
    --cidr 0.0.0.0/0 \
    --region "$REGION" 2>/dev/null || true

echo "  Security Group: $SG_ID"

# ============================================
# 2. Create RDS MySQL Instance
# ============================================
echo "[2/7] Creating RDS MySQL Instance (this takes 5-10 minutes)..."

# Check if instance already exists
EXISTING_DB=$(aws rds describe-db-instances \
    --db-instance-identifier "${APP_NAME}-db" \
    --region "$REGION" \
    --query 'DBInstances[0].DBInstanceIdentifier' \
    --output text 2>/dev/null || echo "")

if [ "$EXISTING_DB" = "${APP_NAME}-db" ]; then
    echo "  RDS instance already exists, skipping creation..."
    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier "${APP_NAME}-db" \
        --region "$REGION" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
else
    aws rds create-db-instance \
        --db-instance-identifier "${APP_NAME}-db" \
        --db-instance-class "$DB_INSTANCE_CLASS" \
        --engine mysql \
        --engine-version "8.0" \
        --master-username "$DB_USERNAME" \
        --master-user-password "$DB_PASSWORD" \
        --allocated-storage 20 \
        --db-name "$DB_NAME" \
        --vpc-security-group-ids "$SG_ID" \
        --publicly-accessible \
        --backup-retention-period 7 \
        --storage-type gp2 \
        --region "$REGION" \
        --no-multi-az \
        --tags Key=Project,Value=CounselFlow

    echo "  Waiting for RDS instance to be available..."
    aws rds wait db-instance-available \
        --db-instance-identifier "${APP_NAME}-db" \
        --region "$REGION"

    DB_ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier "${APP_NAME}-db" \
        --region "$REGION" \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
fi

echo "  RDS Endpoint: $DB_ENDPOINT"
echo "" >> "$CREDENTIALS_FILE"
echo "# Database" >> "$CREDENTIALS_FILE"
echo "DB_ENDPOINT=$DB_ENDPOINT" >> "$CREDENTIALS_FILE"
echo "DB_USERNAME=$DB_USERNAME" >> "$CREDENTIALS_FILE"
echo "DB_PASSWORD=$DB_PASSWORD" >> "$CREDENTIALS_FILE"
echo "DATABASE_URL=mysql://$DB_USERNAME:$DB_PASSWORD@$DB_ENDPOINT:3306/$DB_NAME" >> "$CREDENTIALS_FILE"

# ============================================
# 3. Create S3 Bucket
# ============================================
echo "[3/7] Creating S3 Bucket..."

# Check if bucket exists
if aws s3api head-bucket --bucket "$S3_BUCKET" 2>/dev/null; then
    echo "  Bucket already exists"
else
    aws s3api create-bucket \
        --bucket "$S3_BUCKET" \
        --region "$REGION" \
        $([ "$REGION" != "us-east-1" ] && echo "--create-bucket-configuration LocationConstraint=$REGION")
    echo "  Created bucket: $S3_BUCKET"
fi

echo "" >> "$CREDENTIALS_FILE"
echo "# S3 Storage" >> "$CREDENTIALS_FILE"
echo "S3_BUCKET_NAME=$S3_BUCKET" >> "$CREDENTIALS_FILE"
echo "S3_REGION=$REGION" >> "$CREDENTIALS_FILE"

# ============================================
# 4. Configure S3 CORS
# ============================================
echo "[4/7] Configuring S3 CORS..."

cat > /tmp/cors-config.json << 'EOF'
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
            "AllowedOrigins": ["http://localhost:5173", "https://*.counselflow.com"],
            "ExposeHeaders": ["ETag"],
            "MaxAgeSeconds": 3600
        }
    ]
}
EOF

aws s3api put-bucket-cors \
    --bucket "$S3_BUCKET" \
    --cors-configuration file:///tmp/cors-config.json

# Block public access but allow signed URLs
aws s3api put-public-access-block \
    --bucket "$S3_BUCKET" \
    --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "  CORS configured"

# ============================================
# 5. Create IAM User for Application
# ============================================
echo "[5/7] Creating IAM User..."

IAM_USER="${APP_NAME}-app"

# Create user if doesn't exist
aws iam create-user --user-name "$IAM_USER" 2>/dev/null || true

# Create policy for S3 access
cat > /tmp/s3-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:DeleteObject",
                "s3:ListBucket"
            ],
            "Resource": [
                "arn:aws:s3:::$S3_BUCKET",
                "arn:aws:s3:::$S3_BUCKET/*"
            ]
        }
    ]
}
EOF

# Create and attach policy
aws iam put-user-policy \
    --user-name "$IAM_USER" \
    --policy-name "${APP_NAME}-s3-access" \
    --policy-document file:///tmp/s3-policy.json

# Create access key
ACCESS_KEY_JSON=$(aws iam create-access-key --user-name "$IAM_USER" 2>/dev/null || echo "")
if [ -n "$ACCESS_KEY_JSON" ]; then
    ACCESS_KEY_ID=$(echo "$ACCESS_KEY_JSON" | grep -o '"AccessKeyId": "[^"]*' | cut -d'"' -f4)
    SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_JSON" | grep -o '"SecretAccessKey": "[^"]*' | cut -d'"' -f4)

    echo "S3_ACCESS_KEY_ID=$ACCESS_KEY_ID" >> "$CREDENTIALS_FILE"
    echo "S3_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY" >> "$CREDENTIALS_FILE"
    echo "  IAM user created with access key"
else
    echo "  IAM user already exists (access key not regenerated)"
fi

# ============================================
# 6. Create ECR Repository
# ============================================
echo "[6/7] Creating ECR Repository..."

aws ecr create-repository \
    --repository-name "$APP_NAME" \
    --region "$REGION" \
    --image-scanning-configuration scanOnPush=true 2>/dev/null || true

ECR_URI=$(aws ecr describe-repositories \
    --repository-names "$APP_NAME" \
    --region "$REGION" \
    --query 'repositories[0].repositoryUri' \
    --output text)

echo "" >> "$CREDENTIALS_FILE"
echo "# ECR" >> "$CREDENTIALS_FILE"
echo "ECR_REPOSITORY=$ECR_URI" >> "$CREDENTIALS_FILE"
echo "  ECR Repository: $ECR_URI"

# ============================================
# 7. Generate Session Secret
# ============================================
echo "[7/7] Generating secrets..."

SESSION_SECRET=$(openssl rand -base64 32)
echo "" >> "$CREDENTIALS_FILE"
echo "# Application Secrets" >> "$CREDENTIALS_FILE"
echo "SESSION_SECRET=$SESSION_SECRET" >> "$CREDENTIALS_FILE"

# ============================================
# Summary
# ============================================
echo ""
echo "=========================================="
echo "AWS Infrastructure Setup Complete!"
echo "=========================================="
echo ""
echo "Resources created:"
echo "  - RDS MySQL: $DB_ENDPOINT"
echo "  - S3 Bucket: $S3_BUCKET"
echo "  - IAM User: $IAM_USER"
echo "  - ECR Repo: $ECR_URI"
echo ""
echo "Credentials saved to: $CREDENTIALS_FILE"
echo ""
echo "Next steps:"
echo "  1. Copy credentials to your .env.production file"
echo "  2. Run database migrations: DATABASE_URL=<url> npm run db:push"
echo "  3. Build and push Docker image to ECR"
echo "  4. Deploy to ECS or App Runner"
echo ""
echo "To view credentials:"
echo "  cat $CREDENTIALS_FILE"
echo ""
