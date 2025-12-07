# CounselFlow

AI-powered legal practice management platform.

## Features

- **Client Management** - Track clients, contacts, and relationships
- **Matter Management** - Organize cases with detailed timelines and status tracking
- **Task Management** - Create, assign, and track tasks with priorities and due dates
- **Document Management** - Store, preview, and generate legal documents
- **Time Tracking** - Log billable hours with AI-generated narratives
- **Invoicing** - Generate and manage invoices with PDF export
- **Email Integration** - Connect Gmail or Outlook to sync communications
- **Calendar Integration** - Sync deadlines and tasks with Google Calendar
- **Client Portal** - Secure portal for clients to view their matters and documents
- **Activity Dashboard** - Track all system activity with filtering and search

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, tRPC
- **Database**: MySQL with Drizzle ORM
- **Testing**: Vitest

## Getting Started

### Prerequisites

- Node.js 18+
- MySQL 8+

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/counselflow.git
cd counselflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database credentials and API keys
```

4. Set up the database:
```bash
npm run db:push
```

5. Start the development server:
```bash
npm run dev
```

The app will be available at http://localhost:5173

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run test` - Run tests
- `npm run db:push` - Push schema changes to database
- `npm run db:studio` - Open Drizzle Studio

## License

MIT
