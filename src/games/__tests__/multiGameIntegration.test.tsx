import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createLocalSupabaseClient, DEMO_HOST_ID, DEMO_GUEST_ID } from '@/lib/localSupabase'

// ── Mutable active user for simulating 2-player turns ──
let currentTestUserId = DEMO_HOST_ID

const { localClient } = vi.hoisted(() => ({
  localClient: { current: null as ReturnType<typeof createLocalSupabaseClient> | null },
}))

vi.mock('@/lib/supabase', () => {
  return {
    get supabase() {
      if (!localClient.current) {
        localClient.current = createLocalSupabaseClient()
      }
      return localClient.current
    },
    isLocalDemoMode: true,
  }
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: currentTestUserId,
      email: currentTestUserId === DEMO_HOST_ID ? 'alex@cardarena.local' : 'sam@cardarena.local',
    },
    profile: {
      id: currentTestUserId,
      username: currentTestUserId === DEMO_HOST_ID ? 'alex_host' : 'sam_challenger',
      display_name: currentTestUserId === DEMO_HOST_ID ? 'Alex Rivera' : 'Sam Chen',
      avatar_url: null,
    },
    loading: false,
  }),
}))

import { SavingThrowPage } from '../saving-throw/pages/SavingThrowPage'
import { BlackjackTwistPage } from '../blackjack-twist/pages/BlackjackTwistPage'
import { FourSeasonsPage } from '../four-seasons/pages/FourSeasonsPage'
import { CardThemeSelector, AnimatedDice, AnimatedCoinFlip } from '../_shared/components'
import { useCardThemeStore } from '../_shared/themes'
import { createInitialState } from '../saving-throw/engine/savingThrowEngine'
import { dealInitial } from '../blackjack-twist/engine/twistEngine'
import { dealInitialHands } from '../four-seasons/engine/fourSeasonsEngine'

function renderGameRoute(pathPattern: string, initialEntry: string, element: React.ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <QueryClientProvider client={queryClient}>
        <Routes>
          <Route path={pathPattern} element={element} />
          <Route path="/room/:roomId" element={<div>Room Lobby</div>} />
          <Route path="/games" element={<div>Games Catalog</div>} />
        </Routes>
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

async function seedRoom(gameSlug: string, metadata: Record<string, unknown>) {
  const client = localClient.current!
  const { data: room } = await client
    .from('game_rooms')
    .insert({
      game_slug: gameSlug,
      host_id: DEMO_HOST_ID,
      state: 'playing',
      max_players: 2,
      metadata: metadata as never,
    })
    .select('id')
    .single()

  const roomId = (room as { id: string }).id
  await client.from('room_players').insert({
    room_id: roomId,
    user_id: DEMO_GUEST_ID,
    ready: true,
  })
  return roomId
}

describe('Phase 5 Multi-Game UI, Themes & 2-Player Integration', () => {
  beforeEach(() => {
    window.localStorage.clear()
    localClient.current = createLocalSupabaseClient()
    currentTestUserId = DEMO_HOST_ID
    useCardThemeStore.getState().setThemeId('classic')
  })

  it('switches custom visual card themes live and persists selection', () => {
    render(<CardThemeSelector />)

    const neonBtn = screen.getByRole('button', { name: /midnight neon/i })
    fireEvent.click(neonBtn)
    expect(useCardThemeStore.getState().themeId).toBe('midnight-neon')
    expect(neonBtn).toHaveAttribute('aria-pressed', 'true')

    const fantasyBtn = screen.getByRole('button', { name: /royal fantasy/i })
    fireEvent.click(fantasyBtn)
    expect(useCardThemeStore.getState().themeId).toBe('royal-fantasy')

    const minimalBtn = screen.getByRole('button', { name: /minimalist/i })
    fireEvent.click(minimalBtn)
    expect(useCardThemeStore.getState().themeId).toBe('minimalist')
  })

  it('renders AnimatedDice and AnimatedCoinFlip with roll/reroll and call/result', () => {
    const { rerender } = render(
      <AnimatedDice tens={4} units={7} combinedScore={47} hasRerolled={false} rollKey="r1" />,
    )
    expect(screen.getByText('40')).toBeInTheDocument()
    expect(screen.getByText('7')).toBeInTheDocument()
    expect(screen.getByText('47')).toBeInTheDocument()

    rerender(
      <AnimatedDice tens={2} units={3} combinedScore={23} hasRerolled={true} rollKey="r2" />,
    )
    expect(screen.getByText('23')).toBeInTheDocument()
    expect(screen.getByText(/rerolled/i)).toBeInTheDocument()

    render(<AnimatedCoinFlip choice="heads" result="tails" label="Match Start" />)
    expect(screen.getByText('Match Start')).toBeInTheDocument()
    expect(screen.getByLabelText(/coin landed on tails/i)).toBeInTheDocument()
  })

  it('plays Saving Throw 2-player coin flip, dice rolls, round resolution & restores on refresh', async () => {
    const initial = createInitialState([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    const roomId = await seedRoom('saving-throw', initial as unknown as Record<string, unknown>)

    // Player 2 (Challenger) flips coin
    currentTestUserId = DEMO_GUEST_ID
    const view1 = renderGameRoute(
      '/room/:roomId/play/saving-throw',
      `/room/${roomId}/play/saving-throw`,
      <SavingThrowPage />,
    )

    const callHeadsBtn = await screen.findByRole('button', { name: /call heads/i })
    fireEvent.click(callHeadsBtn)

    await waitFor(() => {
      expect(screen.getByText(/round 1/i)).toBeInTheDocument()
    })

    // Read who became 'first' from persisted DB
    const { data: roomAfterFlip } = await localClient.current!
      .from('game_rooms')
      .select('metadata')
      .eq('id', roomId)
      .single()
    const meta1 = (roomAfterFlip as unknown as { metadata: ReturnType<typeof createInitialState> }).metadata
    const firstId = meta1.currentTurnUserId!
    const secondId = firstId === DEMO_HOST_ID ? DEMO_GUEST_ID : DEMO_HOST_ID
    view1.unmount()

    // First player rolls 2d10 and keeps score
    currentTestUserId = firstId
    const view2 = renderGameRoute(
      '/room/:roomId/play/saving-throw',
      `/room/${roomId}/play/saving-throw`,
      <SavingThrowPage />,
    )

    const rollBtn1 = await screen.findByRole('button', { name: /roll 2d10/i })
    fireEvent.click(rollBtn1)

    const keepBtn1 = await screen.findByRole('button', { name: /keep score/i })
    fireEvent.click(keepBtn1)

    await waitFor(() => {
      expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument()
    })
    view2.unmount()

    // Second player rolls 2d10 and keeps score -> Round 1 finishes
    currentTestUserId = secondId
    const view3 = renderGameRoute(
      '/room/:roomId/play/saving-throw',
      `/room/${roomId}/play/saving-throw`,
      <SavingThrowPage />,
    )

    const rollBtn2 = await screen.findByRole('button', { name: /roll 2d10/i })
    fireEvent.click(rollBtn2)

    const keepBtn2 = await screen.findByRole('button', { name: /keep score/i })
    fireEvent.click(keepBtn2)

    await waitFor(() => {
      expect(screen.getByText(/won round 1/i)).toBeInTheDocument()
    })
    view3.unmount()

    // Simulate page refresh with fresh QueryClient — verify round result restores accurately
    currentTestUserId = DEMO_HOST_ID
    const refreshed = renderGameRoute(
      '/room/:roomId/play/saving-throw',
      `/room/${roomId}/play/saving-throw`,
      <SavingThrowPage />,
    )
    await waitFor(() => {
      expect(screen.getByText(/won round 1/i)).toBeInTheDocument()
    })
    refreshed.unmount()
  })

  it('plays Blackjack Twist 2-player match with face-card sabotage, theme switch, and shared reveal', async () => {
    const state = dealInitial([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    state.playersRecord[DEMO_HOST_ID].hand = [{ id: 'h10', suit: 'hearts', rank: '10' }]
    state.playersRecord[DEMO_HOST_ID].score = 10
    state.playersRecord[DEMO_GUEST_ID].hand = [{ id: 'd9', suit: 'diamonds', rank: '9' }]
    state.playersRecord[DEMO_GUEST_ID].score = 9
    state.sharedHiddenCard = { id: 'cA', suit: 'clubs', rank: 'A', isHidden: true }
    // Next card drawn will be Jack of Spades
    state.deck = [{ id: 'sJ', suit: 'spades', rank: 'J' }]

    const roomId = await seedRoom('blackjack-twist', state as unknown as Record<string, unknown>)

    // Host draws Jack and gives (-3) to opponent
    currentTestUserId = DEMO_HOST_ID
    const v1 = renderGameRoute(
      '/room/:roomId/play/blackjack-twist',
      `/room/${roomId}/play/blackjack-twist`,
      <BlackjackTwistPage />,
    )

    // Switch card theme live
    fireEvent.click(await screen.findByRole('button', { name: /midnight neon/i }))
    expect(useCardThemeStore.getState().themeId).toBe('midnight-neon')

    fireEvent.click(screen.getByRole('button', { name: /hit \(draw card\)/i }))
    const giveJackBtn = await screen.findByRole('button', { name: /give opponent \(-3\)/i })
    fireEvent.click(giveJackBtn)

    await waitFor(() => {
      expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument()
    })
    v1.unmount()

    // Player 2 stands
    currentTestUserId = DEMO_GUEST_ID
    const v2 = renderGameRoute(
      '/room/:roomId/play/blackjack-twist',
      `/room/${roomId}/play/blackjack-twist`,
      <BlackjackTwistPage />,
    )
    const p2StandBtn = await screen.findByRole('button', { name: /^stand$/i })
    fireEvent.click(p2StandBtn)
    await waitFor(() => {
      expect(screen.getByText(/you stood — waiting for opponent/i)).toBeInTheDocument()
    })
    v2.unmount()

    // Host stands -> game resolves, shared card revealed (10 + 11 = 21 vs 9 - 3 + 11 = 17)
    currentTestUserId = DEMO_HOST_ID
    const v3 = renderGameRoute(
      '/room/:roomId/play/blackjack-twist',
      `/room/${roomId}/play/blackjack-twist`,
      <BlackjackTwistPage />,
    )
    const p1StandBtn = await screen.findByRole('button', { name: /^stand$/i })
    fireEvent.click(p1StandBtn)

    await waitFor(() => {
      expect(screen.getByText(/victory! you won!/i)).toBeInTheDocument()
      expect(screen.getByText(/revealed: a of clubs/i)).toBeInTheDocument()
    })
    v3.unmount()
  })

  it('plays Four Seasons 2-player turn, enforces seasonal rules, and restores state on refresh', async () => {
    const state = dealInitialHands([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    state.activeSeason = 'hearts'
    state.discardPile = [{ id: 'h3', suit: 'hearts', rank: '3' }]
    state.playersRecord[DEMO_HOST_ID].hand = [
      { id: 'd5', suit: 'diamonds', rank: '5' },
      { id: 'c9', suit: 'clubs', rank: '9' },
    ]
    state.playersRecord[DEMO_GUEST_ID].hand = [{ id: 's7', suit: 'spades', rank: '7' }]

    const roomId = await seedRoom('four-seasons', state as unknown as Record<string, unknown>)

    currentTestUserId = DEMO_HOST_ID
    const v1 = renderGameRoute(
      '/room/:roomId/play/four-seasons',
      `/room/${roomId}/play/four-seasons`,
      <FourSeasonsPage />,
    )

    // 5 of diamonds (Summer) is playable after Spring (hearts)
    const playableCard = await screen.findByRole('button', { name: /play 5 of diamonds/i })
    expect(playableCard).not.toBeDisabled()

    // 9 of clubs (Winter) is NOT playable on Spring
    const illegalCard = screen.getByRole('button', { name: /play 9 of clubs/i })
    expect(illegalCard).toBeDisabled()

    fireEvent.click(playableCard)

    await waitFor(() => {
      expect(screen.getByText(/active season: summer/i)).toBeInTheDocument()
    })
    v1.unmount()

    // Player 2 refreshes into the room and plays their final card (7 of spades on Summer -> Autumn) to win
    currentTestUserId = DEMO_GUEST_ID
    const v2 = renderGameRoute(
      '/room/:roomId/play/four-seasons',
      `/room/${roomId}/play/four-seasons`,
      <FourSeasonsPage />,
    )

    const winCard = await screen.findByRole('button', { name: /play 7 of spades/i })
    fireEvent.click(winCard)

    await waitFor(() => {
      expect(screen.getByText(/victory! your hand is empty!/i)).toBeInTheDocument()
    })
    v2.unmount()
  })
})
