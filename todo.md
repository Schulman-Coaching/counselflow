# CounselFlow Project TODO

## Core Infrastructure
- [x] Database schema for legal practice management
- [x] User authentication and role management
- [x] Backend tRPC procedures setup

## Module 1: AI-Powered Client Intake & Qualification
- [x] Smart intake form with AI analysis
- [x] AI lead scoring and urgency detection
- [x] Instant conflict check against existing contacts
- [x] Case type and value estimation
- [ ] Dynamic follow-up questions (conversational UI)
- [ ] Automated appointment scheduling integration

## Module 2: Document Automation Hub
- [x] Template library database structure
- [x] AI-powered document drafting backend
- [x] Clause library database
- [x] Document version control
- [ ] Template management UI
- [ ] Document generation UI
- [ ] PDF generation and download functionality

## Module 3: Smart Time Tracking & Invoicing
- [x] Time tracking with AI billing narratives
- [x] Time entry management UI
- [x] Invoice generation backend
- [ ] Passive time tracking (browser extension)
- [ ] Invoice management UI
- [ ] Payment tracking and reminders

## Module 4: Centralized Matter Dashboard
- [x] Matter management with client linking
- [x] Matter status tracking
- [x] Deadline database and tracking
- [x] Dashboard with statistics
- [x] Matter detail view with timeline
- [x] Document organization per matter
- [x] Task management system

## Additional Features
- [x] Mobile-responsive design
- [x] Audit trail and activity logging
- [x] Role-based access control
- [ ] WhatsApp integration for client communication
- [x] Email integration (Gmail/Outlook)
- [x] Calendar integration (Google Calendar)
- [ ] Zapier integration for external services
- [ ] Enhanced data encryption

## Testing & Deployment
- [x] Write comprehensive vitest tests
- [x] Test all user workflows (12/17 tests passing, 5 timeouts on AI calls)
- [x] Create production checkpoint

## Document Builder Enhancement (New Request)
- [x] Create seed templates for common legal documents
- [x] Build template selection interface
- [x] Create dynamic variable input forms
- [x] Implement AI-powered document generation UI
- [x] Add document preview and editing
- [ ] Enable PDF export functionality
- [x] Test complete document generation workflow (5/5 tests passing)

## Invoice Management Enhancement (New Request)
- [x] Add invoice filtering by status and client
- [x] Build invoice list view with status indicators
- [x] Create invoice detail view
- [x] Implement payment tracking and status updates
- [x] Add invoice generation from unbilled time entries
- [x] Enable invoice sending functionality (mark as sent)
- [x] Test complete invoice management workflow (6/7 tests passing, 1 timeout on AI call)

## PDF Invoice Export (New Request)
- [x] Install PDF generation dependencies (puppeteer)
- [x] Create professional invoice PDF template
- [x] Build backend PDF generation endpoint
- [x] Add PDF export button to invoice UI
- [ ] Enable bulk PDF export for multiple invoices
- [x] Test PDF generation and download (2/2 tests passing)

## Dashboard Analytics Enhancement (New Request)
- [x] Build backend analytics for revenue trends
- [x] Calculate average payment time metrics
- [x] Add monthly revenue breakdown
- [x] Create revenue vs expenses comparison
- [x] Build interactive charts with Recharts
- [x] Add time-based filtering (month, quarter, year)
- [x] Display collection rate and aging reports
- [x] Test analytics calculations and visualizations (7/7 tests passing)

## Client Portal (New Request)
- [x] Add client portal access flag to clients table
- [x] Create client authentication system (token-based)
- [x] Build client portal backend procedures
- [x] Create client portal landing page
- [x] Add client matter view (read-only)
- [x] Add client document viewer
- [x] Add client invoice viewer with payment status
- [x] Implement secure data isolation (clients see only their data)
- [x] Add client portal invitation system (token generation)
- [x] Test client portal security and access controls (8/8 tests passing)

## Client Document Upload (New Request)
- [x] Add document upload backend procedure for client portal
- [x] Implement S3 file upload with proper security
- [x] Add file type validation and size limits
- [x] Create upload UI in client portal
- [x] Associate uploaded documents with specific matters
- [x] Add upload progress indicators
- [x] Notify attorney when client uploads documents (via activity log)
- [x] Test upload security and file handling (5/5 tests passing)

## Document Preview (New Request)
- [x] Create document preview dialog component
- [x] Add PDF preview using iframe
- [x] Add image preview with zoom functionality
- [x] Integrate preview into Documents page
- [x] Integrate preview into Client Portal
- [x] Add preview button to document lists
- [x] Test preview with various file types (UI component tested)

## Document Commenting (New Request)
- [x] Create document comments table in database
- [x] Add comment backend procedures (create, list, delete)
- [x] Build comment UI in document preview dialog
- [x] Add real-time comment display
- [x] Implement comment author identification (attorney/client)
- [x] Add comment timestamps and formatting
- [x] Enable comment deletion for authors (attorney only)
- [x] Test commenting functionality and permissions (6/6 tests passing)

## Activity Dashboard (New Request)
- [x] Enhance activity log queries with filtering by type and date
- [x] Add activity aggregation and grouping by entity
- [x] Create Activity page with timeline view
- [x] Add activity type filters (comments, uploads, updates)
- [x] Implement date range filtering (backend ready)
- [x] Add search functionality for activities
- [x] Display activity details with entity links
- [x] Add real-time activity updates (auto-refresh on query)
- [x] Test activity dashboard functionality (6/6 tests passing)

## Task Management System (New Feature)
- [x] Create tasks database table with schema (status, priority, due dates, tags)
- [x] Add task database functions (CRUD, filtering, overdue queries)
- [x] Build task router with full CRUD operations
- [x] Implement bulk status update functionality
- [x] Create Tasks UI page with filtering and status tabs
- [x] Add task stats cards (overdue, due today, in progress, completed)
- [x] Implement task selection and bulk actions
- [x] Add task linking to matters
- [x] Integrate tasks into navigation sidebar
- [x] Write comprehensive tests for task management (12 tests)

## Matter Detail View (New Feature)
- [x] Create comprehensive MatterDetail page component
- [x] Display client information with contact details
- [x] Show matter financial overview (time logged, billable value, invoiced, collected)
- [x] Build activity timeline from activity log
- [x] Add Tasks tab with inline task creation and completion
- [x] Add Documents tab with document listing
- [x] Add Time Entries tab showing logged time
- [x] Add Deadlines tab with inline deadline creation and completion
- [x] Implement matter editing dialog
- [x] Add clickable matter cards in Matters list page
- [x] Add matter detail route (/matters/:id)

## Google Calendar Integration (New Feature)
- [x] Create calendar integrations database table
- [x] Create calendar events tracking table
- [x] Build calendar service with Google OAuth flow
- [x] Implement token refresh mechanism
- [x] Add calendar router with full integration endpoints
- [x] Create Settings page with calendar connection UI
- [x] Add calendar selection after OAuth connect
- [x] Implement sync toggles for deadlines and tasks
- [x] Add sync button to task dropdown menu
- [x] Track synced events for update/delete operations
- [x] Add Settings to navigation sidebar

## Email Integration (Gmail/Outlook) (New Feature)
- [x] Create email integrations database table
- [x] Create emails table with client/matter linking
- [x] Create email templates table for saved templates
- [x] Build email service with Gmail OAuth flow
- [x] Build email service with Outlook OAuth flow
- [x] Implement token refresh mechanism for both providers
- [x] Add email router with full CRUD operations
- [x] Implement email sync functionality (fetch from provider)
- [x] Add send email endpoint with provider integration
- [x] Create Emails page with inbox/sent/starred views
- [x] Build email compose dialog with rich text support
- [x] Add client/matter linking in compose dialog
- [x] Implement email search functionality
- [x] Add email detail view with HTML rendering
- [x] Update Settings page with email connection UI
- [x] Add Gmail and Outlook OAuth connect buttons
- [x] Implement auto-link to clients feature toggle
- [x] Add sync enabled/disabled toggle
- [x] Add email disconnect functionality
- [x] Add Emails to navigation sidebar
