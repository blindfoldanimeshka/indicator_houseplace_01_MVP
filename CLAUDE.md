# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a React/Vite application for housing rentals (прямая аренда жилья без посредников) that uses Supabase as its backend. The project provides both user and rental listing functionality with real-time chat capabilities.

## Commands

### Package Management
```bash
npm install                    # Install dependencies
```

### Development & Build
```bash
npm run dev                    # Start development server (http://localhost:5173)
npm run build                  # Create production build (output to dist/)
npm run preview                # Preview production build
```

### Testing
```bash
npm run test                   # Run all tests (59 tests total)
npm run test:watch             # Run tests in watch mode
```

### Running Single Tests
Based on the test structure in README:
- **Unit tests**: `npm test` includes listings.test.js (10 tests), chats.test.js (9 tests), auth.test.jsx (7 tests), helpers.test.js (15 tests)
- **Integration tests**: register-flow.test.js (3), listing-flow.test.js (2), chat-flow.test.js (2), filter-flow.test.js (5)
- **RLS tests**: rls-policies.test.js (6)

### Test Structure
```
tests/
├── unit/                    # API and component unit tests
│   ├── listings.test.js
│   ├── chats.test.js        
│   ├── auth.test.jsx
│   └── helpers.test.js
├── integration/             # End-to-end tests via MSW
│   ├── register-flow.test.js
│   ├── listing-flow.test.js
│   ├── chat-flow.test.js
│   └── filter-flow.test.js
└── db/                      # RLS policy tests
    └── rls-policies.test.js
```

## Architecture

### Frontend Stack
- **React 18** with **Vite 5** builder
- **TypeScript** for type safety
- **Tailwind CSS 3** for styling
- **lucide-react** for icons

### Backend
- **Supabase** providing:
  - PostgreSQL database (managed)
  - Auth (email/password registration/login)
  - Realtime (WebSocket for chat)
  - Storage (for listing photos)

### Application Structure
- **Single Page Application (SPA)** with client-side routing
- **Unified App.jsx component** using view state for navigation (feed, new, mine, chats, thread)
- **No react-router** - navigation handled by condition rendering

### Key Components
- **Auth.jsx**: Login/registration screen
- **ListingCard**: Display of rental listings
- **DirectionTag**: "Сдаётся"/"Ищут" badges
- **NavButton**: Navigation bar with icons

### API Layer
- **Client-side Supabase** integration in `lib/supabase.js`
- **Direct database access** through React components
- **No separate REST API** - client connects directly to Supabase

### Database Schema
Located in `supabase/schema.sql`:
- **users**: Profile data
- **listings**: Rental listings (soft delete via `deleted_at`)
- **chats**: Chat rooms linked to listings
- **chat_participants**: Chat membership
- **messages**: Chat messages

### Security
- **RLS (Row Level Security)** policies on all tables
- **Service role** used for server-side operations
- **Authorizations** checked at multiple levels (client + DB)

## File Structure

```
src/
├── App.jsx                    # Main application component with view-based routing
├── lib/
│   ├── supabase.js           # Supabase client configuration
│   └── utils.js              # Helper functions (formatPrice, timeAgo, validation)
├── components/                # Reusable UI components
│   └── Auth.jsx              # Authentication interface
├── api/                      # API functions (Supabase queries)
│   ├── listings.js           # Listing CRUD operations
│   └── chats.js              # Chat operations
├── index.css                # Tailwind CSS configuration
└── main.jsx                 # Entry point (ReactDOM.createRoot)

supabase/
└── schema.sql              # Database schema and RLS policies
docs/
└── README.md               # Documentation index
```

## Code Architecture

### Views and State Management
The application uses a simple view state system instead of react-router:

```javascript
// View states: 'feed', 'new', 'mine', 'chats', 'thread'
const [view, setView] = useState('feed');

// Conditional rendering based on view
{view === 'feed' && <FeedComponent />}
{view === 'new' && <NewListingForm />}
```

### Data Flow
1. **User authenticates** via Supabase Auth
2. **Load user's profile** from `users` table
3. **Navigate** based on view state
4. **Fetch listings** from Supabase with filtering
5. **Real-time updates** via Supabase Realtime for messages

### Directory Structure Notes

- **No subdirectories** - single-page application with flat component structure
- **No separate backend** - Supabase serves as backend
- **All logic in frontend** - database queries executed via Supabase client
- **Monolithic App component** - this is the design pattern, though may benefit from refactoring

## Testing Notes

### Test Environment
- **Vitest** with **Testing Library** for unit tests
- **MSW** (Mock Service Worker) for integration tests
- **Supabase mocking** for unit testing without external dependencies

### Testing Approach
- **Unit tests**: Mock Supabase client, test business logic
- **Integration tests**: Test complete user flows via MSW
- **RLS tests**: Directly test PostgreSQL policies

### Common Test Patterns
1. **Mock supabase.auth.getSession()** to simulate authenticated/unauthenticated states
2. **Create mock listings and users** using helpers in `tests/helpers/create-mock.js`
3. **Test filtering logic** in API functions before Supabase calls
4. **Test real-time subscription** setup in chat components

## Current State

### Changes Not Yet Committed
The git status shows several files have been deleted:
```
.gitignore        index.html        package-lock.json   package.json
postcss.config.js  src/App.jsx      src/api/chats.js   src/api/listings.js
src/components/Auth.jsx  src/index.css  src/lib/supabase.js   src/lib/utils.js
src/main.jsx      src/storageShim.js  tailwind.config.js
tests/__mocks__/handlers.js      tests/__mocks__/msw-server.js  tests/__mocks__/supabase.js
tests/db/rls-policies.test.js   tests/helpers/create-mock.js  tests/integration/chat-flow.test.js
tests/integration/filter-flow.test.js  tests/integration/listing-flow.test.js  tests/integration/register-flow.test.js
tests/setup.js      tests/unit/auth.test.jsx    tests/unit/chats.test.js   tests/unit/helpers.test.js
tests/unit/listings.test.js  vite.config.js  vitest.config.js
```

### Using Current Environment
While many source files are missing, `README.md` and `docs/` contain the architectural documentation. To work on this project:
1. **Restore missing source files** from git history
2. **Use committed files** as reference for implementation
3. **Follow the existing patterns** in the remaining code

### Available Documentation
- **docs/README.md**: Project documentation index (real stack: React 19 + Vite + Supabase)
- **docs/progress.md**: Primary progress index by phase — read this first for current state
- **docs/frontend.md**: Frontend architecture and components
- **docs/backend.md**: Backend/API details (Supabase)
- **docs/db.md**: Database schema and RLS policies
- **docs/security-review.md**: Security/R entertained isolation matrix
- **docs/technical-specification-roadmap.md**: Detailed technical specifications (original TЗ)
- **docs/out-of-code/**: Tasks needing external keys / user decisions / legal review (incl. legacy Next.js plan)
- Note: `docs/plan.md` was moved to `docs/out-of-code/plan-legacy-nextjs.md` — it is DEPRECATED (Next.js alternative not chosen).