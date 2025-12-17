# CounselFlow Development Guide

## Quick Start

### Prerequisites
- Node.js 20+
- MySQL 8+ (or Docker)
- npm 10+

### Local Development (Without Docker)

```bash
# 1. Clone the repository
git clone https://github.com/Schulman-Coaching/counselflow.git
cd counselflow

# 2. Install dependencies
npm install

# 3. Set up environment
cp .env.example .env
# Edit .env with your local settings

# 4. Start MySQL (if not using Docker)
# Make sure MySQL is running on port 3306

# 5. Initialize database
npm run db:push

# 6. Start development server
npm run dev

# Client: http://localhost:5173
# Server: http://localhost:3001
```

### Local Development (With Docker)

```bash
# 1. Clone and setup
git clone https://github.com/Schulman-Coaching/counselflow.git
cd counselflow
cp .env.example .env

# 2. Start all services
docker-compose up -d

# 3. Initialize database
npm run db:push

# 4. Access the application
# Frontend: http://localhost:5173
# Backend: http://localhost:3001
# MinIO Console: http://localhost:9001 (minioadmin/minioadmin)

# 5. Stop services
docker-compose down
```

---

## Environment Variables

### Required for Development

```env
# Database
DATABASE_URL=mysql://root:password@localhost:3306/counselflow

# Server
PORT=3001
NODE_ENV=development
APP_URL=http://localhost:5173
SESSION_SECRET=dev-secret-change-in-production
```

### Optional (Features Disabled Without)

```env
# Google OAuth (for Calendar/Gmail)
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-secret
GOOGLE_REDIRECT_URI=http://localhost:5173/settings

# Microsoft OAuth (for Outlook)
OUTLOOK_CLIENT_ID=your-client-id
OUTLOOK_CLIENT_SECRET=your-secret
OUTLOOK_REDIRECT_URI=http://localhost:5173/settings

# OpenAI (for AI features - has mock fallback)
OPENAI_API_KEY=sk-your-key

# S3 (for file storage - uses local ./uploads if not set)
S3_BUCKET_NAME=your-bucket
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=your-key
S3_SECRET_ACCESS_KEY=your-secret
```

---

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server (client + server) |
| `npm run build` | Build for production |
| `npm run start` | Start production server |
| `npm run test` | Run all tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | Run ESLint |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Drizzle Studio |
| `npm run db:generate` | Generate migrations |

---

## Project Structure

```
counselflow/
├── client/                 # Frontend (React + Vite)
│   └── src/
│       ├── pages/         # Page components
│       ├── components/    # UI components
│       ├── lib/          # Utilities
│       ├── hooks/        # Custom hooks
│       └── contexts/     # React contexts
├── server/                # Backend (Express + tRPC)
│   └── src/
│       ├── routers.ts    # API endpoints
│       ├── storage.ts    # File storage
│       ├── db/           # Database schema
│       └── services/     # Business logic
├── shared/               # Shared types
├── tests/                # Test files
├── docs/                 # Documentation
├── .github/workflows/    # CI/CD
├── docker-compose.yml    # Docker config
├── Dockerfile           # Production image
└── package.json
```

---

## Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code
   - Add tests
   - Update documentation

3. **Run checks locally**
   ```bash
   npm run typecheck
   npm run lint
   npm run test
   ```

4. **Commit with conventional commits**
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve bug"
   git commit -m "docs: update readme"
   ```

5. **Push and create PR**
   ```bash
   git push origin feature/your-feature-name
   # Create PR on GitHub
   ```

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production-ready code |
| `develop` | Staging/integration |
| `feature/*` | New features |
| `fix/*` | Bug fixes |
| `hotfix/*` | Urgent production fixes |

---

## Database Operations

### Schema Changes

```bash
# 1. Modify schema in server/src/db/schema.ts

# 2. Push changes to database
npm run db:push

# 3. For production, generate migration
npm run db:generate
```

### Database Inspection

```bash
# Open Drizzle Studio (GUI for database)
npm run db:studio
```

### Reset Database

```bash
# Drop and recreate (development only!)
mysql -u root -p -e "DROP DATABASE counselflow; CREATE DATABASE counselflow;"
npm run db:push
```

---

## Testing

### Run All Tests

```bash
npm run test
```

### Run Specific Test

```bash
npm run test -- --grep "client"
```

### Watch Mode

```bash
npm run test:watch
```

### Test Structure

```
tests/
├── clients.test.ts          # Client CRUD tests
├── matters.test.ts          # Matter tests
├── invoices.test.ts         # Invoice tests
├── clientPortal.test.ts     # Portal security tests
├── analytics.test.ts        # Dashboard tests
└── ...
```

---

## Adding New Features

### 1. Add Database Table

```typescript
// server/src/db/schema.ts
export const newTable = mysqlTable('new_table', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  userId: int('user_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### 2. Add tRPC Router

```typescript
// server/src/routers.ts
newFeature: {
  list: protectedProcedure.query(async ({ ctx }) => {
    return await db.select().from(newTable).where(eq(newTable.userId, ctx.user.id));
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await db.insert(newTable).values({
        name: input.name,
        userId: ctx.user.id,
      });
    }),
}
```

### 3. Add React Page

```typescript
// client/src/pages/NewFeature.tsx
import { trpc } from '@/lib/trpc';

export function NewFeaturePage() {
  const { data, isLoading } = trpc.newFeature.list.useQuery();
  const createMutation = trpc.newFeature.create.useMutation();

  // Component implementation
}
```

### 4. Add Route

```typescript
// client/src/App.tsx
<Route path="/new-feature" component={NewFeaturePage} />
```

### 5. Add Navigation

```typescript
// client/src/components/DashboardLayout.tsx
{ name: 'New Feature', href: '/new-feature', icon: IconName }
```

### 6. Add Tests

```typescript
// tests/newFeature.test.ts
describe('NewFeature', () => {
  it('should create new item', async () => {
    // Test implementation
  });
});
```

---

## API Development

### tRPC Patterns

```typescript
// Query (GET)
myProcedure: protectedProcedure
  .input(z.object({ id: z.number() }))
  .query(async ({ ctx, input }) => {
    return await db.select().from(table).where(eq(table.id, input.id));
  }),

// Mutation (POST/PUT/DELETE)
createItem: protectedProcedure
  .input(z.object({
    name: z.string().min(1),
    email: z.string().email(),
  }))
  .mutation(async ({ ctx, input }) => {
    const [result] = await db.insert(table).values(input);
    return { id: result.insertId };
  }),
```

### Accessing Current User

```typescript
// ctx.user is always available in protectedProcedure
const userId = ctx.user.id;
const userEmail = ctx.user.email;
```

### Error Handling

```typescript
import { TRPCError } from '@trpc/server';

throw new TRPCError({
  code: 'NOT_FOUND',
  message: 'Item not found',
});

throw new TRPCError({
  code: 'FORBIDDEN',
  message: 'Not authorized',
});
```

---

## Debugging

### Server Logs

```bash
# All logs
npm run dev

# Just server
npm run dev:server
```

### Database Queries

```typescript
// Add to drizzle.config.ts for query logging
logger: true,
```

### React DevTools

Install [React DevTools](https://chrome.google.com/webstore/detail/react-developer-tools) for Chrome/Firefox.

### Network Debugging

Use browser DevTools → Network tab to inspect tRPC calls.

---

## Common Issues

### "Module not found" Error

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Database Connection Error

```bash
# Check MySQL is running
mysql -u root -p -e "SELECT 1"

# Verify DATABASE_URL in .env
echo $DATABASE_URL
```

### Port Already in Use

```bash
# Find and kill process on port
lsof -i :3001
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### TypeScript Errors

```bash
# Check types
npm run typecheck

# Restart TS server in VS Code
Cmd+Shift+P → "TypeScript: Restart TS Server"
```

---

## IDE Setup

### VS Code Extensions

- ESLint
- Prettier
- Tailwind CSS IntelliSense
- TypeScript Importer
- Prisma (for schema highlighting)

### VS Code Settings

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.preferences.importModuleSpecifier": "relative",
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  }
}
```

---

## Deployment

See [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for full deployment instructions.

### Quick Deploy Commands

```bash
# Build production
npm run build

# Start production server
npm run start

# Using Docker
docker-compose -f docker-compose.prod.yml up -d
```

---

## Getting Help

- Check [DEEP_DIVE_ANALYSIS.md](./DEEP_DIVE_ANALYSIS.md) for architecture overview
- Check [LAUNCH_CHECKLIST.md](./LAUNCH_CHECKLIST.md) for deployment
- Open an issue on GitHub for bugs
- Contact: [your-email@example.com]

---

*Last updated: December 17, 2025*
