# 🧠 AI Booking & Voice Assistant – Master Prompt

> **Purpose**: This document is the single source of truth for rebuilding a production‑ready AI‑powered Booking & Voice Assistant using **JavaScript, TypeScript, React, and Railway**.

Use this prompt inside ChatGPT, Claude, Cursor, or any AI coding tool to generate consistent, clean‑architecture code.

---

## 🎯 Goal

Create a **production‑ready, scalable AI Booking & Voice Assistant** that supports:

- Chat & voice‑based bookings
- Google Calendar synchronization
- CRM contact creation (HubSpot)
- Embedded website chatbot widget
- Retrieval‑Augmented AI responses (RAG) (based on knowledge_base folder; added, website:https://metalogics.io/)

The system must follow **Clean Architecture**, strict typing, and be deployable on **Railway**.

---

## 🧱 Tech Stack

### Core

- **Language**: TypeScript (strict mode)
- **Runtime**: Node.js v20+
- **Package Manager**: PNPM (workspaces)
- **Build Tool**: Vite

### Backend

- Express.js
- Prisma ORM
- PostgreSQL
- Zod (validation)
- Winston (logging)
- Bottleneck (rate limiting)
- googleapis (Calendar)
- Google Gemini API
- Retell AI (voice)
- HubSpot API

### Frontend & Widget

- React 19
- Vite
- TailwindCSS
- Shadow DOM (widget isolation)

---

## 🗂️ Monorepo Structure (Required)

```
/apps
  /backend
    /src
      /config
      /controllers
      /services
      /repositories
      /integrations
      /routes
      /middlewares
      server.ts
  /frontend
  /widget

/packages
  /shared
    /types
    /schemas
    index.ts

/prisma
  schema.prisma
  migrations
```

---

## 🧩 Architecture Rules (Strict)

- **Controller → Service → Repository**
- Controllers:
  - Validate input using Zod
  - Handle HTTP only (no business logic)
- Services:
  - Contain all business logic
  - Handle transactions
  - Log success & failure
- Repositories:
  - Prisma‑only database access
- Integrations:
  - One class per external service
  - Graceful error handling
- Shared Types:
  - API request/response types live in `packages/shared`

---

## 🗄️ Database Schema (Prisma)

### Booking Model (`prisma/schema.prisma`)

```prisma
model Booking {
  id                 String   @id @default(uuid())
  name               String
  email              String
  phone              String?
  inquiry            String?
  startTime          DateTime
  duration           Int
  status             BookingStatus @default(PENDING)
  confirmationSent   Boolean  @default(false)
  reminderSent       Boolean  @default(false)
  calendarEventId    String?
  crmContactId       String?
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@index([startTime])
  @@index([email])
}

enum BookingStatus {
  PENDING
  CONFIRMED
  CANCELLED
  NO_SHOW
  COMPLETED
}
```

---

## 🔧 Backend Responsibilities (`apps/backend`)

### Required Services

#### 1. BookingService

- Check slot availability
- Prevent double booking (transactional)
- Create booking
- Trigger:
  - Google Calendar sync
  - HubSpot contact creation

#### 2. GoogleCalendarService

- Create / update / delete events
- Uses `googleapis`
- Rate‑limited using Bottleneck
- Stores `calendarEventId`

#### 3. HubSpotService

- Create or update contacts
- Attach booking metadata

#### 4. RetellService

- Handle Retell AI webhooks
- Parse function calls:
  - `book_appointment`
  - `check_availability`
- Calls BookingService internally

#### 5. GeminiService

- Chat completion
- Function calling
- RAG‑aware responses

#### 6. KnowledgeService

- Embed documents
- Simple vector search
- Inject context into Gemini prompts

---

## 🛑 Global Error Handling

- Centralized error middleware
- Typed JSON error responses

```json
{
  "error": {
    "code": "BOOKING_CONFLICT",
    "message": "Slot already booked"
  }
}
```

---

## 🖥️ Frontend & Widget Rules

- Use shared API types from `packages/shared`
- Widget must:
  - Work independently
  - Support iframe or script embed
  - Prefer Shadow DOM for CSS isolation
- TailwindCSS only (no inline styles)

---

## ⚙️ Development Experience

### Environment Validation (Fail Fast)

On startup, throw an error if missing:

- `DATABASE_URL`
- `GOOGLE_CALENDAR_CREDENTIALS`
- `RETELL_API_KEY`
- `GEMINI_API_KEY`
- `HUBSPOT_API_KEY`

### Scripts

```json
"dev": "concurrently \"pnpm --filter backend dev\" \"pnpm --filter frontend dev\" \"pnpm --filter widget dev\"",
"seed": "pnpm --filter backend prisma db seed"
```

---

## 🚄 Railway Deployment Rules

- **Single GitHub Monorepo**
- **Multiple Railway Services**

| Service  | Path            | Type          |
| -------- | --------------- | ------------- |
| backend  | `apps/backend`  | Node.js       |
| frontend | `apps/frontend` | Static (Vite) |
| widget   | `apps/widget`   | Static (Vite) |
| postgres | Railway Plugin  | Database      |

### Prisma on Railway

```bash
pnpm prisma migrate deploy
```

---

## 🧠 Monorepo Decision

✅ **Use Monorepo**

Reasons:

- Shared types across backend, frontend, widget
- Faster refactors
- Cleaner CI/CD
- Railway friendly

---

## 🎯 Task Execution Order

1. Generate backend core:
   - `server.ts`
   - `prisma/schema.prisma`
   - `BookingService` with Google Calendar integration
2. Implement Voice (Retell AI)
3. Implement AI (Gemini + RAG)
4. Enforce strict typing & clean architecture

---

## 📌 Usage Instruction

Paste **this entire file** into an AI chat or system prompt.

Then guide execution step‑by‑step, for example:

> Generate `apps/backend/src/server.ts` following this document strictly.

---

🧭 **This file is the architecture contract. Do not violate it.**
