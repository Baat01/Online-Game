# CardArena 🃏

A real-time multiplayer card game platform built with **React + Vite + TypeScript + Tailwind CSS + Supabase**.

Play Blackjack and more card games with friends — right in your browser.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript 6 |
| Styling | Tailwind CSS v4 |
| State | Zustand (UI), React Query (server) |
| Routing | React Router v6 |
| Backend | Supabase (Auth + DB + Realtime) |
| Testing | Vitest + React Testing Library |
| Deployment | GitHub Pages |

---

## Quick Start

### 1. Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) account and project

### 2. Clone & Install

```bash
git clone https://github.com/your-username/card-arena.git
cd card-arena
npm install
```

### 3. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Find these values in your Supabase dashboard under **Settings → API**.

### 4. Set Up the Database

Run the SQL migrations in order in the **Supabase SQL Editor**:

1. `supabase/migrations/0001_initial_schema.sql`
2. `supabase/migrations/0002_realtime_publication.sql`

Or use the Supabase CLI:
```bash
npx supabase db push
```

### 5. Run Locally

```bash
npm run dev
```

Open http://localhost:5173

---

## Available Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview the production build |
| `npm run type-check` | Run TypeScript compiler check |
| `npm run lint` | Run OxLint on `src/` |
| `npm run format` | Format with Prettier |
| `npm run test` | Run Vitest tests |
| `npm run test:watch` | Run Vitest in watch mode |

---

## Project Structure

```
src/
├── app/            # Root component, providers
├── components/ui/  # Reusable UI primitives (Button, Card, Input, Spinner)
├── games/          # Game plugin system
│   └── registry.ts # Register games here — no other changes needed
├── hooks/          # Custom React hooks
├── layouts/        # Page layouts (RootLayout with nav)
├── lib/            # Supabase client singleton
├── pages/          # Route-level page components
├── routes/         # React Router configuration
├── stores/         # Zustand stores
├── test/           # Test setup
└── types/          # TypeScript types (database, game interfaces)
```

---

## Adding a New Game

1. Create `src/games/<your-game>/` with:
   - `index.ts` — exports an `IGamePlugin` object
   - `engine/` — pure game logic (no UI)
   - `components/` — game UI
   - `store/` — game state
2. Import and add to `src/games/registry.ts`

That's it. The lobby, routing, and room system pick it up automatically.

---

## Deployment to GitHub Pages

### Automated (CI/CD)

Push to `main` → GitHub Actions builds and deploys automatically.

**Setup:**
1. Go to your repo → **Settings → Secrets and variables → Actions**
2. Add secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Go to **Settings → Pages → Source** → set to `gh-pages` branch

### Manual

```bash
npm run build
# Then deploy the dist/ folder to your gh-pages branch
```

---

## Phases

| Phase | Status | Description |
|---|---|---|
| Phase 1 | ✅ Complete | Project setup, architecture, Supabase schema |
| Phase 2 | 🔜 Next | Auth (login/register), profile, friends system |
| Phase 3 | 🔜 Planned | Blackjack game engine + realtime multiplayer |
| Phase 4 | 🔜 Planned | Lobby, room creation, game history |

---

## License

MIT
