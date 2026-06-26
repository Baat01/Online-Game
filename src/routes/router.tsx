import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { RequireAuth } from '@/routes/RequireAuth'
import { RequireGuest } from '@/routes/RequireGuest'
import { HomePage } from '@/pages/HomePage'
import { LoginPage } from '@/pages/LoginPage'
import { RegisterPage } from '@/pages/RegisterPage'
import { ProfilePage } from '@/pages/ProfilePage'
import { FriendsPage } from '@/pages/FriendsPage'
import { GamesPage } from '@/pages/GamesPage'
import { GameRoomPage } from '@/pages/GameRoomPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { BlackjackPage } from '@/games/blackjack/pages/BlackjackPage'
import { SavingThrowPage } from '@/games/saving-throw/pages/SavingThrowPage'
import { BlackjackTwistPage } from '@/games/blackjack-twist/pages/BlackjackTwistPage'
import { FourSeasonsPage } from '@/games/four-seasons/pages/FourSeasonsPage'
import { ReplayPage } from '@/platform/replay/pages/ReplayPage'

/**
 * Application routes.
 *
 * Phase 1: project scaffold
 * Phase 2.1: auth pages, RequireAuth/RequireGuest guards
 * Phase 2.2: profile page
 * Phase 2.3: friends system
 * Phase 2.4: presence
 * Phase 3: /games + /room/:roomId ← current
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
            element: <FriendsPage />,
          },
          {
            path: 'profile',
            element: <ProfilePage />,
          },
          {
            path: 'games',
            element: <GamesPage />,
          },
          {
            path: 'room/:roomId',
            element: <GameRoomPage />,
          },
          {
            path: 'room/:roomId/play',
            element: <BlackjackPage />, // Fallback for existing blackjack path
          },
          {
            path: 'room/:roomId/play/blackjack',
            element: <BlackjackPage />,
          },
          {
            path: 'room/:roomId/play/saving-throw',
            element: <SavingThrowPage />,
          },
          {
            path: 'room/:roomId/play/blackjack-twist',
            element: <BlackjackTwistPage />,
          },
          {
            path: 'room/:roomId/play/four-seasons',
            element: <FourSeasonsPage />,
          },
        ],
      },
      {
        path: 'replay/:roomId',
        element: <ReplayPage />,
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
