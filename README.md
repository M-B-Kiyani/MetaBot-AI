# AI Booking Voice Assistant

A production-ready AI-powered booking and voice assistant system built with TypeScript, React, and deployed on Railway. The system supports chat and voice-based bookings, Google Calendar synchronization, CRM integration, and embedded website functionality.

## Architecture

This project follows a monorepo structure with Clean Architecture principles:

```
/
├── apps/
│   ├── backend/          # Express.js API server
│   ├── frontend/         # React web application
│   └── widget/           # Embeddable chat widget
├── packages/
│   └── shared/           # Shared TypeScript types and schemas
└── prisma/               # Database schema and migrations
```

## Features

- **Multi-channel Booking**: Support for web chat, voice calls, and embedded widgets
- **AI-Powered Assistant**: Google Gemini integration with RAG capabilities
- **Voice Integration**: Retell AI for voice-based interactions
- **Calendar Sync**: Google Calendar integration for appointment management
- **CRM Integration**: HubSpot contact management
- **Type Safety**: Shared TypeScript types across all applications
- **Property-Based Testing**: Comprehensive testing with fast-check

## Technology Stack

- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM, PostgreSQL
- **Frontend**: React 18, TypeScript, TailwindCSS, Vite
- **Widget**: React, Shadow DOM, TypeScript
- **AI**: Google Gemini API, RAG with vector search
- **Voice**: Retell AI integration
- **Testing**: Jest, fast-check for property-based testing
- **Build**: PNPM workspaces, TypeScript project references

## Getting Started

### Prerequisites

- Node.js 18+
- PNPM 8+
- PostgreSQL database

### Installation

1. Install dependencies:

```bash
pnpm install
```

2. Set up environment variables:

```bash
cp apps/backend/.env.example apps/backend/.env
# Edit .env with your configuration
```

3. Generate Prisma client:

```bash
pnpm run db:generate
```

4. Run database migrations:

```bash
pnpm run db:migrate
```

### Development

Start all applications in development mode:

```bash
pnpm run dev
```

This will start:

- Backend API on http://localhost:3000
- Frontend app on http://localhost:3000
- Widget on http://localhost:3002

### Testing

Run all tests:

```bash
pnpm run test
```

Run property-based tests:

```bash
pnpm run test -- --testPathPattern=property.test.ts
```

### Building

Build all applications:

```bash
pnpm run build
```

## Project Structure

### Backend (`apps/backend/`)

- Express.js API server with TypeScript
- Clean Architecture: Controllers → Services → Repositories
- Prisma ORM for database operations
- Winston logging and structured error handling
- Rate limiting and security middleware

### Frontend (`apps/frontend/`)

- React 18 application with TypeScript
- TailwindCSS for styling
- Vite for fast development and building
- React Router for navigation

### Widget (`apps/widget/`)

- Embeddable React widget
- Shadow DOM for CSS isolation
- Independent operation when embedded
- Support for iframe and script tag embedding

### Shared (`packages/shared/`)

- Common TypeScript types and interfaces
- Zod schemas for validation
- Shared constants and enums
- Ensures type safety across all applications

## API Integration

The system integrates with several external services:

- **Google Calendar**: Appointment scheduling and management
- **HubSpot**: CRM contact management
- **Google Gemini**: AI chat responses and function calling
- **Retell AI**: Voice interaction processing

## Deployment

The application is designed for deployment on Railway with separate services for:

- Backend API
- Frontend application
- Widget distribution
- PostgreSQL database

## Contributing

1. Follow the established Clean Architecture patterns
2. Maintain type safety with shared types
3. Write property-based tests for core business logic
4. Use conventional commit messages
5. Ensure all tests pass before submitting PRs

## License

This project is proprietary software. All rights reserved.
