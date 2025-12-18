# Jumpseat Sales Tracker

## Overview

A lightweight, fast web application for tracking sales leads for Jumpseat. This is a Kanban-style CRM with two pipelines (Jumpseat and Community) displayed on a single page. Each lead is represented as a card with a name, tags, follow-up dates, and action flags. Clicking a card reveals a detail panel with notes and call recording information.

The application integrates with Fathom AI for automatic meeting transcription and Google Calendar for scheduling visibility.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Query for server state, React Context for local UI state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with CSS variables for theming
- **Drag & Drop**: @dnd-kit for Kanban board interactions
- **Build Tool**: Vite

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript compiled with tsx
- **API Design**: RESTful JSON API under `/api/*` prefix
- **Database ORM**: Drizzle ORM with PostgreSQL dialect

### Data Storage
- **Database**: PostgreSQL (configured via DATABASE_URL environment variable)
- **Schema Location**: `shared/schema.ts` (shared between client and server)
- **Migrations**: Drizzle Kit with `db:push` command

### Key Data Models
- **Leads**: Core entity with name, email, tags, pipeline type, stage, follow-up dates, action flags, notes, and history
- **Blockers**: Sales objection patterns with category, response playbook, and count
- **Users**: Basic authentication support (username/password)

### Application Pages
- **Pipeline** (`/`): Main Kanban board with Jumpseat and Community pipelines
- **Onboarding** (`/onboarding`): Separate Kanban for client onboarding stages
- **Today** (`/today`): Daily task view with calendar integration
- **Fathom** (`/fathom`): Meeting import from Fathom AI
- **Blockers** (`/blockers`): Objection pattern library
- **Settings** (`/settings`): Integration configuration

## External Dependencies

### Third-Party Services
- **Fathom AI**: Meeting recording and transcription service. Configured via `FATHOM_API_KEY` environment variable. Used to automatically import leads from sales calls.
- **Google Calendar**: Calendar integration via Replit Connectors. Uses OAuth tokens managed by Replit infrastructure. Displays upcoming meetings on the Today page.

### Database
- **PostgreSQL**: Primary data store. Connection string provided via `DATABASE_URL` environment variable. Must be provisioned before running the application.

### Key npm Dependencies
- `drizzle-orm` / `drizzle-kit`: Database ORM and migration tooling
- `@tanstack/react-query`: Server state management
- `@dnd-kit/*`: Drag and drop functionality
- `@radix-ui/*`: Accessible UI primitives
- `date-fns`: Date manipulation
- `canvas-confetti`: Celebration effects for closed deals