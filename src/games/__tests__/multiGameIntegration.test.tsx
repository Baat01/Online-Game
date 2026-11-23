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
      email: currentTestUserId === DEMO_HOST_ID ? 'alex@engei.local' : 'sam@engei.local',
    },
    profile: {
      id: currentTestUserId,
      username: currentTestUserId === DEMO_HOST_ID ? 'alex_host' : 'sam_challenger',
      display_name: currentTestUserId === DEMO_HOST_ID ? 'Alex Rivera' : 'Sam Chen',
      avatar_url: null,
      yen_balance: currentTestUserId === DEMO_HOST_ID ? 500000 : 10000,
      is_admin: currentTestUserId === DEMO_HOST_ID,
      clan_title: currentTestUserId === DEMO_HOST_ID ? 'Clan Momobami' : 'Clan Jabami',
      card_back_theme: currentTestUserId === DEMO_HOST_ID ? 'bami-gold' : 'engei-crimson',
      card_front_theme: currentTestUserId === DEMO_HOST_ID ? 'royal-fantasy' : 'classic',
    },
    loading: false,
    refreshProfile: vi.fn().mockResolvedValue(undefined),
  }),
}))

import { ToastProvider } from '@/components/ui/Toast'
import { GameRoomPage } from '@/pages/GameRoomPage'
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
        <ToastProvider>
          <Routes>
            <Route path={pathPattern} element={element} />
            <Route path="/room/:roomId" element={<GameRoomPage />} />
            <Route path="/room/:roomId/play/saving-throw" element={<div>Saving Throw Table</div>} />
            <Route path="/games" element={<div>Games Catalog</div>} />
          </Routes>
        </ToastProvider>
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

describe('Phase 5 & 6 Multi-Game UI, Realtime Room, Yen Wagering & Player-Bound Themes', () => {
  beforeEach(() => {
    window.localStorage.clear()
    localClient.current = createLocalSupabaseClient()
    currentTestUserId = DEMO_HOST_ID
    useCardThemeStore.getState().setFrontThemeId('classic')
    useCardThemeStore.getState().setBackThemeId('engei-crimson')
  })

  it('updates Host room live when Player 2 joins & readies, and auto-launches Player 2 on start', async () => {
    const client = localClient.current!
    const { data: room } = await client
      .from('game_rooms')
      .insert({
        game_slug: 'saving-throw',
        host_id: DEMO_HOST_ID,
        state: 'waiting',
        max_players: 2,
        metadata: { stakeYen: 0, potYen: 0 } as never,
      })
      .select('id')
      .single()

    const roomId = (room as { id: string }).id

    // Render Host's GameRoomPage
    currentTestUserId = DEMO_HOST_ID
    const hostView = renderGameRoute('/room/:roomId', `/room/${roomId}`, <GameRoomPage />)

    await waitFor(() => {
      expect(screen.getByText(/waiting for players/i)).toBeInTheDocument()
    })

    // Simulate Player 2 joining and marking ready in another tab (without Host refreshing)
    await client.from('room_players').insert({
      room_id: roomId,
      user_id: DEMO_GUEST_ID,
      ready: true,
    })
    await client
      .from('room_players')
      .update({ ready: true })
      .eq('room_id', roomId)
      .eq('user_id', DEMO_HOST_ID)

    // Host UI updates automatically via realtime without F5
    await waitFor(() => {
      expect(screen.getByText('Sam Chen')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /launch game/i })).toBeInTheDocument()
    })
    hostView.unmount()

    // Now render Player 2's GameRoomPage and simulate Host launching the game
    currentTestUserId = DEMO_GUEST_ID
    const guestView = renderGameRoute('/room/:roomId', `/room/${roomId}`, <GameRoomPage />)
    await screen.findByText('Sam Chen')

    await client.from('game_rooms').update({ state: 'playing' }).eq('id', roomId)

    await waitFor(() => {
      expect(screen.getByText('Saving Throw Table')).toBeInTheDocument()
    })
    guestView.unmount()
  })

  it('switches player-bound Front & Back card themes independently with live Recto/Verso preview', () => {
    render(<CardThemeSelector mode="inline" />)

    expect(screen.getByLabelText(/aperçu recto/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/aperçu verso/i)).toBeInTheDocument()

    const cyberBtn = screen.getByRole('button', { name: /cyber tokyo/i })
    fireEvent.click(cyberBtn)
    expect(useCardThemeStore.getState().frontThemeId).toBe('midnight-neon')

    const bamiBtn = screen.getByRole('button', { name: /bami gold crest/i })
    fireEvent.click(bamiBtn)
    expect(useCardThemeStore.getState().backThemeId).toBe('bami-gold')

    const epureBtn = screen.getByRole('button', { name: /épuré/i })
    fireEvent.click(epureBtn)
    expect(useCardThemeStore.getState().frontThemeId).toBe('minimalist')
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

    const { data: roomAfterFlip } = await localClient.current!
      .from('game_rooms')
      .select('metadata')
      .eq('id', roomId)
      .single()
    const meta1 = (roomAfterFlip as unknown as { metadata: ReturnType<typeof createInitialState> })
      .metadata
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

    fireEvent.click(await screen.findByRole('button', { name: /roll 2d10/i }))
    fireEvent.click(await screen.findByRole('button', { name: /keep score/i }))

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

    fireEvent.click(await screen.findByRole('button', { name: /roll 2d10/i }))
    fireEvent.click(await screen.findByRole('button', { name: /keep score/i }))

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

  it('plays Blackjack Twist 2-player match with player-bound fronts, sabotage, and shared reveal', async () => {
    const state = dealInitial([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    state.playersRecord[DEMO_HOST_ID].hand = [
      { id: 'h10', suit: 'hearts', rank: '10', ownerId: DEMO_HOST_ID },
    ]
    state.playersRecord[DEMO_HOST_ID].score = 10
    state.playersRecord[DEMO_GUEST_ID].hand = [
      { id: 'd9', suit: 'diamonds', rank: '9', ownerId: DEMO_GUEST_ID },
    ]
    state.playersRecord[DEMO_GUEST_ID].score = 9
    state.sharedHiddenCard = { id: 'cA', suit: 'clubs', rank: 'A', isHidden: true }
    state.deck = [{ id: 'sJ', suit: 'spades', rank: 'J' }]

    const roomId = await seedRoom('blackjack-twist', state as unknown as Record<string, unknown>)

    // Host opens Mes Cartes modal, switches front theme, draws Jack, and gives (-3) to Sam
    currentTestUserId = DEMO_HOST_ID
    const v1 = renderGameRoute(
      '/room/:roomId/play/blackjack-twist',
      `/room/${roomId}/play/blackjack-twist`,
      <BlackjackTwistPage />,
    )

    fireEvent.click(await screen.findByRole('button', { name: /mes cartes/i }))
    fireEvent.click(screen.getByRole('button', { name: /cyber tokyo/i }))
    expect(useCardThemeStore.getState().frontThemeId).toBe('midnight-neon')
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }))

    fireEvent.click(screen.getByRole('button', { name: /hit \(draw card\)/i }))
    fireEvent.click(await screen.findByRole('button', { name: /give opponent \(-3\)/i }))

    await waitFor(() => {
      expect(screen.getByText(/waiting for opponent/i)).toBeInTheDocument()
    })

    // Host's sabotaged Jack in Sam's hand carries Alex's front theme ('royal-fantasy' from profile)
    const jackCardEl = screen.getByLabelText('J of spades')
    expect(jackCardEl).toHaveAttribute('data-front-theme', 'royal-fantasy')
    const nineCardEl = screen.getByLabelText('9 of diamonds')
    expect(nineCardEl).toHaveAttribute('data-front-theme', 'classic')
    v1.unmount()

    // Player 2 stands
    currentTestUserId = DEMO_GUEST_ID
    const v2 = renderGameRoute(
      '/room/:roomId/play/blackjack-twist',
      `/room/${roomId}/play/blackjack-twist`,
      <BlackjackTwistPage />,
    )
    fireEvent.click(await screen.findByRole('button', { name: /^stand$/i }))
    await waitFor(() => {
      expect(screen.getByText(/you stood — waiting for opponent/i)).toBeInTheDocument()
    })
    v2.unmount()

    // Host stands -> game resolves, shared card revealed
    currentTestUserId = DEMO_HOST_ID
    const v3 = renderGameRoute(
      '/room/:roomId/play/blackjack-twist',
      `/room/${roomId}/play/blackjack-twist`,
      <BlackjackTwistPage />,
    )
    fireEvent.click(await screen.findByRole('button', { name: /^stand$/i }))

    await waitFor(() => {
      expect(screen.getByText(/victory! you won!/i)).toBeInTheDocument()
      expect(screen.getByText(/revealed: a of clubs/i)).toBeInTheDocument()
    })
    v3.unmount()
  })

  it('plays Four Seasons 2-player turn showing opponent back theme & player front theme on discard', async () => {
    const state = dealInitialHands([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    state.activeSeason = 'hearts'
    state.discardPile = [{ id: 'h3', suit: 'hearts', rank: '3', ownerId: DEMO_GUEST_ID }]
    state.playersRecord[DEMO_HOST_ID].hand = [
      { id: 'd5', suit: 'diamonds', rank: '5', ownerId: DEMO_HOST_ID },
      { id: 'c9', suit: 'clubs', rank: '9', ownerId: DEMO_HOST_ID },
    ]
    state.playersRecord[DEMO_GUEST_ID].hand = [
      { id: 's7', suit: 'spades', rank: '7', ownerId: DEMO_GUEST_ID },
    ]

    const roomId = await seedRoom('four-seasons', state as unknown as Record<string, unknown>)

    currentTestUserId = DEMO_HOST_ID
    const v1 = renderGameRoute(
      '/room/:roomId/play/four-seasons',
      `/room/${roomId}/play/four-seasons`,
      <FourSeasonsPage />,
    )

    const playableCard = await screen.findByRole('button', { name: /play 5 of diamonds/i })
    expect(playableCard).toHaveAttribute('data-front-theme', 'royal-fantasy')

    // Opponent's hidden card back uses Sam's card_back_theme ('engei-crimson')
    const hiddenCards = screen.getAllByLabelText('Hidden card')
    expect(hiddenCards[0]).toHaveAttribute('data-back-theme', 'engei-crimson')

    const illegalCard = screen.getByRole('button', { name: /play 9 of clubs/i })
    expect(illegalCard).toBeDisabled()

    fireEvent.click(playableCard)

    await waitFor(() => {
      expect(screen.getByText(/active season: summer/i)).toBeInTheDocument()
    })
    v1.unmount()

    // Player 2 refreshes into the room and plays their final card to win
    currentTestUserId = DEMO_GUEST_ID
    const v2 = renderGameRoute(
      '/room/:roomId/play/four-seasons',
      `/room/${roomId}/play/four-seasons`,
      <FourSeasonsPage />,
    )

    // Discard pile top card (5 of diamonds played by Host) shows Host's front theme ('royal-fantasy')
    const topDiscard = await screen.findByLabelText('5 of diamonds')
    expect(topDiscard).toHaveAttribute('data-front-theme', 'royal-fantasy')

    const winCard = screen.getByRole('button', { name: /play 7 of spades/i })
    expect(winCard).toHaveAttribute('data-front-theme', 'classic')
    fireEvent.click(winCard)

    await waitFor(() => {
      expect(screen.getByText(/victory! your hand is empty!/i)).toBeInTheDocument()
    })
    v2.unmount()
  })
})
