import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { RequireAuth } from '@/routes/RequireAuth'
import { RequireGuest } from '@/routes/RequireGuest'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'

/**
 * Application routes.
 *
 * Phase 1: project scaffold
 * Phase 2.1: auth pages, RequireAuth/RequireGuest guards ← current
 * Phase 2.2: profile page
 * Phase 2.3: friends system
 * Phase 3: /games wired to registry, /game/:roomId with Blackjack
 */
const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      // ── Public (no guard) ──────────────────────────────
      {
        index: true,
        element: <HomePage />,
      },

      // ── Guest only (redirect if already logged in) ─────
      {
        element: <RequireGuest />,
        children: [
          {
            path: 'login',
            element: <LoginPage />,
          },
          {
            path: 'register',
            element: <RegisterPage />,
          },
        ],
      },

      // ── Auth required ──────────────────────────────────
      {
        element: <RequireAuth />,
        children: [
          {
            path: 'friends',
            element: <ComingSoonPage feature="Friends" />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'games',
            element: <ComingSoonPage feature="Games Lobby" />,
          },
          {
            // Phase 3: /game/:roomId
            path: 'game/:roomId',
            element: <ComingSoonPage feature="Game Room" />,
          },
        ],
      },

      // ── Fallback ───────────────────────────────────────
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
