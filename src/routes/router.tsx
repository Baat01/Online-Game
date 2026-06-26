import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { RootLayout } from '@/layouts/RootLayout'
import { HomePage } from '@/pages/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ComingSoonPage } from '@/pages/ComingSoonPage'

/**
 * Application routes.
 *
 * Phase 1: placeholder pages for all major routes.
 * Phase 2: /login, /register, auth guards, user-specific home.
 * Phase 3: /games fully wired to registry, /game/:roomId with Blackjack.
 */
const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: 'friends',
        element: <ComingSoonPage feature="Friends" />,
      },
      {
        path: 'games',
        element: <ComingSoonPage feature="Games Lobby" />,
      },
      {
        // Phase 2: /login
        path: 'login',
        element: <ComingSoonPage feature="Login" />,
      },
      {
        // Phase 2: /register
        path: 'register',
        element: <ComingSoonPage feature="Register" />,
      },
      {
        // Phase 3: /game/:roomId
        path: 'game/:roomId',
        element: <ComingSoonPage feature="Game Room" />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
