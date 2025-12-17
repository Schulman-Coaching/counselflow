# CounselFlow Launch Checklist

## Pre-Launch Requirements

### Phase 1: Infrastructure Setup (Days 1-3)

#### Database
- [ ] Provision MySQL 8+ database
  - [ ] Option A: AWS RDS MySQL
  - [ ] Option B: PlanetScale
  - [ ] Option C: Railway MySQL
  - [ ] Option D: DigitalOcean Managed MySQL
- [ ] Create production database: `counselflow_prod`
- [ ] Create staging database: `counselflow_staging`
- [ ] Set up database user with appropriate permissions
- [ ] Configure connection pooling (recommended: 20 connections)
- [ ] Run schema migrations: `npm run db:push`
- [ ] Verify all 20 tables created successfully
- [ ] Set up automated daily backups
- [ ] Document connection strings (DO NOT commit to git)

#### File Storage
- [ ] Create AWS S3 bucket: `counselflow-documents`
- [ ] Configure bucket policy (private, signed URLs)
- [ ] Set up CORS for frontend access
- [ ] Create IAM user with S3 permissions
- [ ] Generate access key and secret
- [ ] Test file upload/download
- [ ] Configure lifecycle rules (optional: archive after 1 year)

#### OAuth Credentials

**Google OAuth:**
- [ ] Go to [Google Cloud Console](https://console.cloud.google.com)
- [ ] Create new project: "CounselFlow"
- [ ] Enable APIs:
  - [ ] Google Calendar API
  - [ ] Gmail API
- [ ] Configure OAuth consent screen
  - [ ] App name: CounselFlow
  - [ ] User support email
  - [ ] Authorized domains
  - [ ] Scopes: calendar, gmail.readonly, gmail.send, gmail.compose
- [ ] Create OAuth 2.0 credentials
  - [ ] Application type: Web application
  - [ ] Authorized redirect URIs:
    - `https://app.counselflow.com/settings`
    - `http://localhost:5173/settings` (for dev)
- [ ] Save Client ID and Client Secret

**Microsoft OAuth:**
- [ ] Go to [Azure Portal](https://portal.azure.com)
- [ ] Register new application: "CounselFlow"
- [ ] Configure API permissions:
  - [ ] Microsoft Graph: Calendars.ReadWrite
  - [ ] Microsoft Graph: Mail.ReadWrite
  - [ ] Microsoft Graph: Mail.Send
- [ ] Create client secret
- [ ] Configure redirect URIs:
  - `https://app.counselflow.com/settings`
  - `http://localhost:5173/settings`
- [ ] Save Application (client) ID and Client Secret

**OpenAI:**
- [ ] Create API key at [OpenAI Platform](https://platform.openai.com)
- [ ] Set usage limits to prevent unexpected charges
- [ ] Test API connectivity

---

### Phase 2: Environment Configuration (Day 4)

#### Create Production Environment File
```bash
# Copy template
cp .env.example .env.production

# Edit with production values
```

#### Required Environment Variables
```env
# Database
DATABASE_URL=mysql://user:password@host:3306/counselflow_prod

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_REDIRECT_URI=https://app.counselflow.com/settings

# Microsoft OAuth
OUTLOOK_CLIENT_ID=your-azure-app-id
OUTLOOK_CLIENT_SECRET=your-azure-secret
OUTLOOK_REDIRECT_URI=https://app.counselflow.com/settings

# OpenAI
OPENAI_API_KEY=sk-your-api-key

# S3 Storage
S3_BUCKET_NAME=counselflow-documents
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=AKIA...
S3_SECRET_ACCESS_KEY=your-secret-key

# Application
APP_URL=https://app.counselflow.com
PORT=3001
NODE_ENV=production

# Session (generate with: openssl rand -base64 32)
SESSION_SECRET=your-secure-random-string
```

---

### Phase 3: Deployment Setup (Days 5-7)

#### Backend Deployment (Choose One)

**Option A: Railway (Recommended for MVP)**
- [ ] Create Railway account
- [ ] Create new project
- [ ] Connect GitHub repository
- [ ] Add environment variables
- [ ] Deploy and verify health check
- [ ] Configure custom domain

**Option B: Heroku**
- [ ] Create Heroku app
- [ ] Add MySQL add-on or connect external DB
- [ ] Set config vars (environment variables)
- [ ] Deploy via Git or GitHub integration

**Option C: AWS EC2/ECS**
- [ ] Provision EC2 instance or ECS cluster
- [ ] Install Node.js 18+
- [ ] Configure security groups
- [ ] Set up load balancer (optional)
- [ ] Deploy with PM2 or Docker

#### Frontend Deployment

**Option A: Vercel (Recommended)**
- [ ] Connect GitHub repository
- [ ] Configure build settings:
  - Build command: `npm run build`
  - Output directory: `dist/client`
- [ ] Add environment variables (VITE_ prefix for client-side)
- [ ] Deploy and verify
- [ ] Configure custom domain

**Option B: Netlify**
- [ ] Connect repository
- [ ] Configure build settings
- [ ] Deploy and verify

#### DNS Configuration
- [ ] Purchase/configure domain: counselflow.com
- [ ] Create DNS records:
  - `app.counselflow.com` → Frontend (Vercel/Netlify)
  - `api.counselflow.com` → Backend (Railway/Heroku)
- [ ] Configure SSL certificates (usually automatic)

---

### Phase 4: Testing & Verification (Days 8-9)

#### Functional Testing
- [ ] User registration/login works
- [ ] Client CRUD operations
- [ ] Matter CRUD operations
- [ ] Time entry logging
- [ ] Invoice generation
- [ ] PDF export working
- [ ] Email integration (Gmail)
- [ ] Email integration (Outlook)
- [ ] Calendar sync (Google)
- [ ] Calendar sync (Outlook)
- [ ] Client portal login
- [ ] Document upload/download
- [ ] AI features (intake analysis, narratives)

#### Security Testing
- [ ] HTTPS enforced on all endpoints
- [ ] CORS configured correctly
- [ ] API authentication working
- [ ] Client portal data isolation verified
- [ ] No sensitive data in logs
- [ ] SQL injection prevention verified
- [ ] XSS prevention verified

#### Performance Testing
- [ ] Page load time < 3 seconds
- [ ] API response time < 500ms (p95)
- [ ] PDF generation < 10 seconds
- [ ] File upload works for 10MB files

---

### Phase 5: Launch Preparation (Day 10)

#### Documentation
- [ ] User onboarding guide created
- [ ] FAQ document prepared
- [ ] Video tutorials recorded (optional)
- [ ] Support email configured

#### Monitoring Setup
- [ ] Error tracking (Sentry) configured
- [ ] Uptime monitoring (UptimeRobot/Pingdom)
- [ ] Log aggregation (optional: Logtail, Axiom)
- [ ] Performance monitoring (optional: Vercel Analytics)

#### Legal & Compliance
- [ ] Privacy policy published
- [ ] Terms of service published
- [ ] Cookie consent (if applicable)
- [ ] Data processing agreement template

#### Payment Setup (Optional for Beta)
- [ ] Stripe account created
- [ ] Products/prices configured
- [ ] Checkout integration tested
- [ ] Webhook endpoints configured

---

### Phase 6: Launch Day

#### Pre-Launch (Morning)
- [ ] Final deployment verification
- [ ] Database backup completed
- [ ] Team notified
- [ ] Support channels ready

#### Launch
- [ ] DNS propagation verified
- [ ] First user signup tested
- [ ] Announcement sent (email, social)
- [ ] Monitor for errors

#### Post-Launch (First 24 Hours)
- [ ] Monitor error rates
- [ ] Respond to support requests
- [ ] Fix critical bugs immediately
- [ ] Collect initial feedback

---

## Post-Launch Tasks (Week 2+)

### Week 2
- [ ] Analyze user feedback
- [ ] Fix non-critical bugs
- [ ] Optimize slow queries
- [ ] Add requested features

### Week 3-4
- [ ] Set up CI/CD pipeline
- [ ] Implement automated testing
- [ ] Add monitoring dashboards
- [ ] Plan feature roadmap

### Month 2+
- [ ] Scale infrastructure as needed
- [ ] Implement user-requested features
- [ ] Marketing and growth initiatives
- [ ] Consider mobile app development

---

## Emergency Contacts

| Role | Contact |
|------|---------|
| Technical Lead | [Your contact] |
| Database Admin | [Contact] |
| Cloud Provider Support | [Support link] |
| Domain Registrar | [Support link] |

---

## Rollback Plan

### If Critical Bug Found:
1. Identify affected component
2. Revert to previous deployment
3. Restore database backup if needed
4. Notify users of temporary issue
5. Fix bug in staging
6. Re-deploy after verification

### Database Rollback:
```bash
# Restore from backup
mysql -u user -p counselflow_prod < backup_YYYYMMDD.sql
```

### Deployment Rollback:
```bash
# Railway
railway rollback

# Vercel
vercel rollback

# Git-based
git revert HEAD
git push origin main
```

---

## Success Metrics

### Week 1
- [ ] 10+ user signups
- [ ] 0 critical bugs
- [ ] 99% uptime

### Month 1
- [ ] 50+ user signups
- [ ] 5+ paying customers
- [ ] < 5 support tickets/day

### Month 3
- [ ] 200+ users
- [ ] 20+ paying customers
- [ ] NPS > 30

---

*Last updated: December 17, 2025*
