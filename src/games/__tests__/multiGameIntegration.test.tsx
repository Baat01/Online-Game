import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { createLocalSupabaseClient, DEMO_HOST_ID, DEMO_GUEST_ID } from '@/lib/localSupabase'

// ── Mutable active user for simulating 2-player turns ──
let currentTestUserId = DEMO_HOST_ID
let enableOptionalAuthMock = false

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

const getMockAuthValue = () => ({
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
    unlocked_themes:
      currentTestUserId === DEMO_HOST_ID
        ? ['classic', 'royal-fantasy', 'minimalist', 'midnight-neon', 'undertale-tarot', 'kinto-pay-to-win']
        : ['classic', 'royal-fantasy', 'minimalist'],
  },
  loading: false,
  refreshProfile: vi.fn().mockResolvedValue(undefined),
})

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => getMockAuthValue(),
}))

vi.mock('@/contexts/AuthContext', () => ({
  useAuthContext: () => getMockAuthValue(),
  useOptionalAuthContext: () => (enableOptionalAuthMock ? getMockAuthValue() : null),
}))

import { ToastProvider } from '@/components/ui/Toast'
import { GlobalInvitationPopup } from '@/components/lobby/GlobalInvitationPopup'
import { useThemeStore } from '@/stores/themeStore'
import { GameRoomPage } from '@/pages/GameRoomPage'
import { GamesPage } from '@/pages/GamesPage'
import { QuickDrawPage } from '@/pages/QuickDrawPage'
import { SavingThrowPage } from '../saving-throw/pages/SavingThrowPage'
import { BlackjackTwistPage } from '../blackjack-twist/pages/BlackjackTwistPage'
import { FourSeasonsPage } from '../four-seasons/pages/FourSeasonsPage'
import { Arcane23Page } from '../23e-arcane/pages/Arcane23Page'
import {
  CardThemeSelector,
  AnimatedDice,
  AnimatedCoinFlip,
  ThemedCard,
  TarotArcanaCard,
  Dice3D,
  Coin3D,
} from '../_shared/components'
import {
  GASTER_TAROT_ARCANUM,
  UNDERTALE_TAROT_ARCANA,
  UNDERTALE_TAROT_BACK_IMAGE,
  useCardThemeStore,
} from '../_shared/themes'
import { createInitialState } from '../saving-throw/engine/savingThrowEngine'
import { dealInitial } from '../blackjack-twist/engine/twistEngine'
import { dealInitialHands } from '../four-seasons/engine/fourSeasonsEngine'
import { createInitialArcane23State } from '../23e-arcane/engine/arcane23Engine'

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
            <Route path="/games/room/:roomId" element={<GameRoomPage />} />
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

describe('Multi-Game UI, Realtime Room, Yen Wagering & Player-Bound Themes', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.sessionStorage.clear()
    localClient.current = createLocalSupabaseClient()
    currentTestUserId = DEMO_HOST_ID
    enableOptionalAuthMock = false
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

    const cyberBtn = screen.getByRole('button', { name: /^cyber tokyo/i })
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
    fireEvent.click(screen.getByRole('button', { name: /^cyber tokyo/i }))
    expect(useCardThemeStore.getState().frontThemeId).toBe('midnight-neon')
    fireEvent.click(screen.getByRole('button', { name: /fermer/i }))

    fireEvent.click(screen.getByRole('button', { name: /hit \(draw card\)/i }))
    const giveBtn = await screen.findByRole('button', { name: /give opponent \(-3\)/i })
    await waitFor(() => {
      expect(giveBtn).not.toBeDisabled()
    })
    fireEvent.click(giveBtn)

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

  it('plays Four Seasons 2-player turn showing strict next-season rule, opponent back & player front', async () => {
    const state = dealInitialHands([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    state.activeSeason = 'hearts'
    state.discardPile = [{ id: 'h3', suit: 'hearts', rank: '3', ownerId: DEMO_GUEST_ID }]
    state.playersRecord[DEMO_HOST_ID].hand = [
      { id: 'd5', suit: 'diamonds', rank: '5', ownerId: DEMO_HOST_ID },
      { id: 'h9', suit: 'hearts', rank: '9', ownerId: DEMO_HOST_ID },
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

    // Current season (hearts) is ALSO disallowed under strict next-season rule
    const sameSeasonCard = screen.getByRole('button', { name: /play 9 of hearts/i })
    expect(sameSeasonCard).toBeDisabled()

    // Opponent's hidden card back uses Sam's card_back_theme ('engei-crimson')
    const hiddenCards = screen.getAllByLabelText('Hidden card')
    expect(hiddenCards[0]).toHaveAttribute('data-back-theme', 'engei-crimson')

    const illegalCard = screen.getByRole('button', { name: /play 9 of clubs/i })
    expect(illegalCard).toBeDisabled()

    fireEvent.click(playableCard)

    await waitFor(() => {
      expect(screen.getByText(/saison actuelle : summer/i)).toBeInTheDocument()
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

  it('shows GlobalInvitationPopup across routes and allows joining /games/room/:roomId or declining', async () => {
    const client = localClient.current!
    const { data: room } = await client
      .from('game_rooms')
      .insert({
        game_slug: 'four-seasons',
        host_id: DEMO_HOST_ID,
        state: 'waiting',
        max_players: 2,
        metadata: { stakeYen: 500, potYen: 1000 } as never,
      })
      .select('id')
      .single()

    const roomId = (room as { id: string }).id
    await client.from('game_invitations').insert({
      sender_id: DEMO_HOST_ID,
      receiver_id: DEMO_GUEST_ID,
      game_slug: 'four-seasons',
      room_id: roomId,
      status: 'pending',
    })

    await client.auth.signInWithPassword({ email: 'sam@engei.local', password: 'password123' })
    currentTestUserId = DEMO_GUEST_ID
    const view = renderGameRoute('/friends', '/friends', <GlobalInvitationPopup />)

    expect(await screen.findByText(/invitation engei/i)).toBeInTheDocument()
    expect(screen.getByText('Alex Rivera')).toBeInTheDocument()
    expect(await screen.findByText(/mise : 500 ¥/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /rejoindre la partie/i }))

    await waitFor(() => {
      expect(screen.getByText('Four Seasons')).toBeInTheDocument()
    })
    view.unmount()
  })

  it('toggles Day/Night theme classes and renders illustrated Court Cards, Tarot, Kinto Dice & Coin', () => {
    useThemeStore.getState().setTheme('light')
    expect(document.documentElement.classList.contains('light')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')

    useThemeStore.getState().toggleTheme()
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')

    render(
      <div>
        <ThemedCard suit="hearts" rank="J" frontThemeId="classic" />
        <ThemedCard suit="spades" rank="Q" frontThemeId="royal-fantasy" />
        <ThemedCard suit="diamonds" rank="K" frontThemeId="kinto-pay-to-win" />
        <TarotArcanaCard arcanum={UNDERTALE_TAROT_ARCANA[20]} />
        <AnimatedDice
          tens={4}
          units={2}
          combinedScore={42}
          diceThemeId="kinto-gacha-dice"
          rollKey="k1"
        />
        <AnimatedCoinFlip choice="heads" result="heads" coinThemeId="kinto-railgun-coin" />
      </div>,
    )

    expect(document.querySelector('[data-court-illustration="J"]')).toBeInTheDocument()
    expect(document.querySelector('[data-court-illustration="Q"]')).toBeInTheDocument()
    expect(document.querySelector('[data-court-illustration="K"]')).toBeInTheDocument()

    const tarotCard = screen.getByLabelText(/XX — Sans/i)
    expect(tarotCard).toHaveAttribute('data-tarot-arcana', 'Sans')
    expect(screen.getByAltText('XX — Sans')).toBeInTheDocument()

    expect(document.querySelector('[data-dice-theme="kinto-gacha-dice"]')).toBeInTheDocument()
    expect(document.querySelector('[data-coin-theme="kinto-railgun-coin"]')).toBeInTheDocument()
  })

  it('supports Interactive 3D Theme Inspector, Shop Purchase, and Quick Draw Sandbox tabs', async () => {
    enableOptionalAuthMock = true
    // Non-admin Sam opens CardThemeSelector, inspects locked Kinto Pay-To-Win front & buys it
    await localClient.current!.auth.signInWithPassword({ email: 'sam@engei.local', password: 'password123' })
    currentTestUserId = DEMO_GUEST_ID

    const vShop = render(
      <MemoryRouter>
        <CardThemeSelector mode="inline" />
      </MemoryRouter>,
    )

    expect(screen.getByTestId('inspector-3d-stage')).toBeInTheDocument()
    // undertale-tarot is NOT in the 52-card face list
    const frontGroup = screen.getByRole('group', { name: /face des cartes/i })
    expect(frontGroup.textContent).not.toMatch(/undertale/i)

    fireEvent.click(screen.getByRole('button', { name: /pay-to-win minimaliste/i }))
    const buyBtn = await screen.findByRole('button', { name: /acheter/i })
    fireEvent.click(buyBtn)

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(/débloqué/i)
    })
    vShop.unmount()

    // Now test QuickDrawPage as Host (Admin with Undertale Tarot unlocked)
    await localClient.current!.auth.signInWithPassword({ email: 'alex@engei.local', password: 'password123' })
    currentTestUserId = DEMO_HOST_ID
    const vQuick = renderGameRoute('/quick-draw', '/quick-draw', <QuickDrawPage />)

    // Tab 1: Standard 54 cards
    fireEvent.click(screen.getByRole('button', { name: /tirer une carte/i }))
    expect(screen.getByText(/53 cartes restantes/i)).toBeInTheDocument()

    // Tab 2: Undertale Tarot
    fireEvent.click(screen.getByRole('tab', { name: /tarot undertale/i }))
    fireEvent.click(screen.getByRole('button', { name: /tirage 3 cartes/i }))
    expect(screen.getByText(/^passé(\s·\srenversé)?$/i)).toBeInTheDocument()
    expect(screen.getByText(/^présent(\s·\srenversé)?$/i)).toBeInTheDocument()
    expect(screen.getByText(/^futur(\s·\srenversé)?$/i)).toBeInTheDocument()

    // Tab 3: Dice
    fireEvent.click(screen.getByRole('tab', { name: /lancer de dé/i }))
    fireEvent.click(screen.getByRole('button', { name: /^d20$/i }))
    fireEvent.click(screen.getByRole('button', { name: /lancer d20/i }))
    expect(screen.getAllByText(/D20/).length).toBeGreaterThan(0)

    // Tab 4: Coin
    fireEvent.click(screen.getByRole('tab', { name: /lancer de pièce/i }))
    fireEvent.click(screen.getByRole('button', { name: /lancer la pièce 3d/i }))
    expect(screen.getByLabelText(/coin landed on/i)).toBeInTheDocument()
    vQuick.unmount()
  })

  it('supports interactive 3D Dice & Coin drag rotation, polyhedra, and Tarot card back image', () => {
    render(
      <div>
        <Dice3D dieType="d20" value={20} diceThemeId="astral-crystal" rollKey="d20-1" />
        <Dice3D dieType="d6" value={6} diceThemeId="kinto-gacha-dice" rollKey="d6-1" />
        <Coin3D face="tails" coinThemeId="kinto-railgun-coin" flipKey="c1" />
        <TarotArcanaCard arcanum={UNDERTALE_TAROT_ARCANA[6]} revealed={false} />
      </div>,
    )

    const d20 = document.querySelector('[data-dice-type="d20"]') as HTMLElement
    expect(d20).toBeInTheDocument()
    expect(d20).toHaveAttribute('data-dice-theme', 'astral-crystal')
    fireEvent.pointerDown(d20, { clientX: 50, clientY: 50 })
    fireEvent.pointerMove(d20, { clientX: 85, clientY: 30 })
    fireEvent.pointerUp(d20)
    expect(Number(d20.getAttribute('data-rotation-y'))).not.toBe(-18)

    const d6 = document.querySelector('[data-dice-type="d6"]') as HTMLElement
    expect(d6).toHaveAttribute('data-dice-theme', 'kinto-gacha-dice')

    const coin = screen.getByTestId('coin-3d-canvas')
    expect(coin).toHaveAttribute('data-coin-face', 'tails')
    expect(coin).toHaveAttribute('data-coin-theme', 'kinto-railgun-coin')
    fireEvent.pointerDown(coin, { clientX: 40, clientY: 40 })
    fireEvent.pointerMove(coin, { clientX: 70, clientY: 55 })
    fireEvent.pointerUp(coin)
    expect(Number(coin.getAttribute('data-rotation-y'))).not.toBe(12)

    const tarotBackImg = screen.getByAltText('Dos du Tarot Undertale') as HTMLImageElement
    expect(tarotBackImg.getAttribute('src')).toBe(UNDERTALE_TAROT_BACK_IMAGE)
  })

  it('plays Le 23e Arcane sequentially (Classic -> Tarot Spotlight -> Click-to-Continue) & inspects Tarot modal', async () => {
    const state = createInitialArcane23State([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    state.playersRecord[DEMO_HOST_ID].classicDeck = [
      { id: 'hearts-A', suit: 'hearts', rank: 'A' },
    ]
    state.playersRecord[DEMO_GUEST_ID].classicDeck = [
      { id: 'clubs-2', suit: 'clubs', rank: '2' },
    ]
    state.tarotDeck = [3] // III. L'Impératrice (+2 rounds)
    const roomId = await seedRoom('23e-arcane', state as unknown as Record<string, unknown>)

    // Host chooses Tarot
    currentTestUserId = DEMO_HOST_ID
    const v1 = renderGameRoute(
      '/room/:roomId/play/23e-arcane',
      `/room/${roomId}/play/23e-arcane`,
      <Arcane23Page />,
    )
    const tarotBtn = await screen.findByRole('button', { name: /invoquer un arcane/i })
    fireEvent.click(tarotBtn)
    await waitFor(() => {
      expect(screen.getByText(/votre choix secret.*verrouillé/i)).toBeInTheDocument()
    })
    v1.unmount()

    // Guest locks in classic -> Étape 1 (CLASSIC_REVEAL) displays, then click anywhere advances to Étape 2 (TAROT_1)
    currentTestUserId = DEMO_GUEST_ID
    const v2 = renderGameRoute(
      '/room/:roomId/play/23e-arcane',
      `/room/${roomId}/play/23e-arcane`,
      <Arcane23Page />,
    )
    const guestBtn = await screen.findByRole('button', { name: /tirer carte classique/i })
    fireEvent.click(guestBtn)

    // Étape 1 — Révélation des cartes classiques
    expect(await screen.findByTestId('classic-reveal-banner')).toBeInTheDocument()

    // Click anywhere to advance to Étape 2 — Carte de Tarot n° 1 au premier plan
    fireEvent.click(screen.getByTestId('click-anywhere-continue'))
    const spotlight = await screen.findByTestId('tarot-spotlight-stage')
    expect(spotlight).toBeInTheDocument()
    expect(spotlight).toHaveTextContent(/impératrice/i)

    // Verify top-right "Joué par <Player>" badge on spotlight card
    const playedByBadge = screen.getByTestId('tarot-played-by-badge')
    expect(playedByBadge).toHaveTextContent(/joué par/i)
    expect(playedByBadge).toHaveTextContent(/alex rivera/i)

    // Click on the Tarot card itself inside spotlight to open detailed effect modal with "Joué par" badge
    const tarotImgs = screen.getAllByAltText(/III —/i)
    fireEvent.click(tarotImgs[0])
    expect(await screen.findByTestId('tarot-detail-modal')).toBeInTheDocument()
    expect(screen.getByTestId('tarot-modal-played-by-badge')).toHaveTextContent(/alex rivera/i)
    fireEvent.click(screen.getByRole('button', { name: /fermer la fiche tarot/i }))

    // Click anywhere again to resolve the round
    fireEvent.click(screen.getByTestId('click-anywhere-continue'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /manche suivante/i })).toBeInTheDocument()
    })
    v2.unmount()

    // Test XX. Le Jugement 2-step preview + separate confirm button copying IX. L'Ermite
    const judgState = createInitialArcane23State([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    judgState.tarotDeck = [20, 3]
    judgState.tarotDiscard = [9]
    judgState.playersRecord[DEMO_HOST_ID].choice = 'tarot'
    judgState.playersRecord[DEMO_GUEST_ID].choice = 'tarot'
    judgState.playersRecord[DEMO_HOST_ID].drawnTarot = 20
    judgState.playersRecord[DEMO_HOST_ID].effectiveTarot = 20
    judgState.playersRecord[DEMO_HOST_ID].tarotRevealed = true
    judgState.playersRecord[DEMO_GUEST_ID].drawnTarot = 3
    judgState.playersRecord[DEMO_GUEST_ID].effectiveTarot = 3
    judgState.tarotDrawOrder = [DEMO_HOST_ID, DEMO_GUEST_ID]
    judgState.phase = 'INTERACTION'
    judgState.presentationStep = 'TAROT_1'
    judgState.pendingPrompts = [
      {
        id: 'judgment-1',
        type: 'JUDGMENT_COPY_DISCARD',
        playerId: DEMO_HOST_ID,
        availableArcana: [9],
      },
    ]
    const judgRoomId = await seedRoom('23e-arcane', judgState as unknown as Record<string, unknown>)

    currentTestUserId = DEMO_HOST_ID
    const vJudg = renderGameRoute(
      '/room/:roomId/play/23e-arcane',
      `/room/${judgRoomId}/play/23e-arcane`,
      <Arcane23Page />,
    )

    // Clicking the discarded Arcana previews it WITHOUT validating immediately
    const ermiteChoiceBtn = await screen.findByRole('button', { name: /IX\. Gerson/i })
    fireEvent.click(ermiteChoiceBtn)
    expect(await screen.findByTestId('judgment-preview-panel')).toBeInTheDocument()
    expect(screen.queryByTestId('ermite-decision-panel')).not.toBeInTheDocument()

    // Clicking the separate confirm button validates and reveals Hermit's Play/Cancel choice (even vs Tarot opponent!)
    fireEvent.click(screen.getByTestId('judgment-confirm-btn'))
    expect(await screen.findByTestId('ermite-decision-panel')).toBeInTheDocument()
    expect(screen.getByText(/a également choisi le tarot/i)).toBeInTheDocument()
    vJudg.unmount()

    // Verify D4, D10, D12, D16 and 666. Gaster rendering
    render(
      <div>
        <Dice3D dieType="d4" value={4} />
        <Dice3D dieType="d10" value={9} />
        <Dice3D dieType="d12" value={12} />
        <Dice3D dieType="d16" value={16} />
        <TarotArcanaCard arcanum={GASTER_TAROT_ARCANUM} />
      </div>,
    )
    expect(document.querySelector('[data-dice-type="d4"]')).toBeInTheDocument()
    expect(document.querySelector('[data-dice-type="d10"]')).toBeInTheDocument()
    expect(document.querySelector('[data-dice-type="d12"]')).toBeInTheDocument()
    expect(document.querySelector('[data-dice-type="d16"]')).toBeInTheDocument()
    expect(screen.getByAltText(/666 — Gaster/i)).toBeInTheDocument()
  })

  it('displays public waiting/playing rooms in GamesPage, lets Guest join, and opens GameRulesModal in Lobby & in-game', async () => {
    const client = localClient.current!
    // Host creates a public waiting room for Le 23e Arcane
    const { data: waitingRoom } = await client
      .from('game_rooms')
      .insert({
        game_slug: '23e-arcane',
        host_id: DEMO_HOST_ID,
        state: 'waiting',
        max_players: 2,
        is_public: true,
        metadata: { stakeYen: 100 } as never,
      })
      .select('id')
      .single()

    const waitingId = (waitingRoom as { id: string }).id

    // Guest opens GamesPage -> sees the public room and opens Rules modal
    await client.auth.signInWithPassword({ email: 'sam@engei.local', password: 'password123' })
    currentTestUserId = DEMO_GUEST_ID
    const vLobby = renderGameRoute('/games', '/games', <GamesPage />)

    expect(await screen.findByTestId('public-rooms-section')).toBeInTheDocument()
    expect(await screen.findByText('Alex Rivera')).toBeInTheDocument()

    // Open Rules modal from Lobby and verify 23e Arcane index appears
    fireEvent.click(screen.getByRole('button', { name: /règles de le 23e arcane/i }))
    expect(await screen.findByTestId('game-rules-modal')).toBeInTheDocument()
    expect(screen.getByText(/index complet des 22 arcanes/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /fermer les règles/i }))

    // Join the public room -> navigates into GameRoomPage
    fireEvent.click(screen.getByRole('button', { name: /^rejoindre$/i }))
    await waitFor(() => {
      expect(screen.getByText(/players — 2 \/ 2/i)).toBeInTheDocument()
    })
    vLobby.unmount()

    // Trigger mobile visibilitychange wake while Host is on GameRoomPage
    await client.auth.signInWithPassword({ email: 'alex@engei.local', password: 'password123' })
    currentTestUserId = DEMO_HOST_ID
    const vHostRoom = renderGameRoute('/room/:roomId', `/room/${waitingId}`, <GameRoomPage />)
    await screen.findByText('Sam Chen')

    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'visible',
    })
    document.dispatchEvent(new Event('visibilitychange'))
    expect(screen.getByText('Sam Chen')).toBeInTheDocument()
    vHostRoom.unmount()
  })

  it('plays X. La Roue de la Fortune 3D coin flip (call -> launch -> AnimatedCoinFlip 3D result for both players) & opens in-game Rules', async () => {
    const wheelState = createInitialArcane23State([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    wheelState.tarotDeck = [10]
    wheelState.playersRecord[DEMO_HOST_ID].choice = 'tarot'
    wheelState.playersRecord[DEMO_GUEST_ID].choice = 'classic'
    wheelState.playersRecord[DEMO_HOST_ID].drawnTarot = 10
    wheelState.playersRecord[DEMO_HOST_ID].effectiveTarot = 10
    wheelState.playersRecord[DEMO_HOST_ID].tarotRevealed = true
    wheelState.tarotDrawOrder = [DEMO_HOST_ID]
    wheelState.phase = 'INTERACTION'
    wheelState.presentationStep = 'TAROT_1'
    wheelState.pendingPrompts = [
      {
        id: 'wheel-call-1',
        type: 'WHEEL_CALL_COIN',
        playerId: DEMO_GUEST_ID,
        ownerId: DEMO_HOST_ID,
      },
    ]

    const roomId = await seedRoom('23e-arcane', wheelState as unknown as Record<string, unknown>)

    // Step 1: Opponent (Guest) chooses Pile or Face
    currentTestUserId = DEMO_GUEST_ID
    const vGuestCall = renderGameRoute(
      '/room/:roomId/play/23e-arcane',
      `/room/${roomId}/play/23e-arcane`,
      <Arcane23Page />,
    )

    // Verify in-game Rules modal opens cleanly without advancing the game
    fireEvent.click(await screen.findByRole('button', { name: /^règles$/i }))
    expect(await screen.findByTestId('game-rules-modal')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /fermer les règles/i }))

    expect(await screen.findByTestId('wheel-call-panel')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /parier face/i }))

    await waitFor(() => {
      expect(screen.getByText(/lance la pièce 3d/i)).toBeInTheDocument()
    })
    vGuestCall.unmount()

    // Step 2: Drawer (Host) clicks "Lancer la pièce" -> 3D Coin Flip result mounts with Host's coin_theme
    currentTestUserId = DEMO_HOST_ID
    const vHostFlip = renderGameRoute(
      '/room/:roomId/play/23e-arcane',
      `/room/${roomId}/play/23e-arcane`,
      <Arcane23Page />,
    )

    expect(await screen.findByTestId('wheel-flip-panel')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /lancer la pièce/i }))

    const resultPanel = await screen.findByTestId('wheel-coin-3d-result')
    expect(resultPanel).toBeInTheDocument()
    expect(resultPanel).toHaveTextContent(/\+2 manches/i)
    const coinCanvas = screen.getByTestId('coin-3d-canvas')
    expect(coinCanvas).toHaveAttribute('data-coin-theme', 'momobami-seal')
    vHostFlip.unmount()

    // Step 3: Opponent also sees the exact same 3D Coin Flip result overlay with Host's coin_theme
    currentTestUserId = DEMO_GUEST_ID
    const vGuestResult = renderGameRoute(
      '/room/:roomId/play/23e-arcane',
      `/room/${roomId}/play/23e-arcane`,
      <Arcane23Page />,
    )
    expect(await screen.findByTestId('wheel-coin-3d-result')).toBeInTheDocument()
    expect(screen.getByTestId('coin-3d-canvas')).toHaveAttribute('data-coin-theme', 'momobami-seal')

    // Click to continue resolves the round
    fireEvent.click(screen.getByTestId('click-anywhere-continue'))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /manche suivante/i })).toBeInTheDocument()
    })
    vGuestResult.unmount()
  })

  it('syncs bidirectional J1/J2 choices via atomic commit_game_state (even after conflict & rejoin) and handles manual delete + 30m expiration', async () => {
    const client = localClient.current!
    const state = createInitialArcane23State([DEMO_HOST_ID, DEMO_GUEST_ID], DEMO_HOST_ID)
    state.playersRecord[DEMO_HOST_ID].classicDeck = [{ id: 'hK', suit: 'hearts', rank: 'K' }]
    state.playersRecord[DEMO_GUEST_ID].classicDeck = [{ id: 'c8', suit: 'clubs', rank: '8' }]
    const roomId = await seedRoom('23e-arcane', state as unknown as Record<string, unknown>)

    // Simulate J1 making their choice while J2 is about to submit on stale version 0 (concurrent conflict!)
    const { data: rpc1 } = await (client as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ ok: boolean; conflict: boolean; state_version: number }> }>
    }).rpc('commit_game_state', {
      p_room_id: roomId,
      p_new_metadata: {
        ...state,
        playersRecord: {
          ...state.playersRecord,
          [DEMO_HOST_ID]: { ...state.playersRecord[DEMO_HOST_ID], choice: 'classic' },
        },
      },
      p_expected_version: 0,
      p_mark_finished: false,
    })
    expect(rpc1[0].ok).toBe(true)
    expect(rpc1[0].state_version).toBe(1)

    // A stale write with expected_version 0 detects conflict instead of overwriting J1's choice
    const { data: rpcConflict } = await (client as unknown as {
      rpc: (fn: string, args: Record<string, unknown>) => Promise<{ data: Array<{ ok: boolean; conflict: boolean; state_version: number }> }>
    }).rpc('commit_game_state', {
      p_room_id: roomId,
      p_new_metadata: state,
      p_expected_version: 0,
      p_mark_finished: false,
    })
    expect(rpcConflict[0].ok).toBe(false)
    expect(rpcConflict[0].conflict).toBe(true)
    expect(rpcConflict[0].state_version).toBe(1)

    // J2 opens Arcane23Page, clicks classic -> commits via commit_game_state (version -> 2) and reveals both cards!
    currentTestUserId = DEMO_GUEST_ID
    const vGuest = renderGameRoute(
      '/room/:roomId/play/23e-arcane',
      `/room/${roomId}/play/23e-arcane`,
      <Arcane23Page />,
    )
    fireEvent.click(await screen.findByRole('button', { name: /tirer carte classique/i }))
    expect(await screen.findByTestId('classic-reveal-banner')).toBeInTheDocument()
    vGuest.unmount()

    // J1 leaves and rejoins the table -> immediately gets server version 2 (CLASSIC_REVEAL), NEVER stuck waiting for J2!
    currentTestUserId = DEMO_HOST_ID
    const vHostRejoin = renderGameRoute(
      '/room/:roomId/play/23e-arcane',
      `/room/${roomId}/play/23e-arcane`,
      <Arcane23Page />,
    )
    expect(await screen.findByTestId('classic-reveal-banner')).toBeInTheDocument()
    vHostRejoin.unmount()

    // Manual room deletion: Guest seated in GameRoomPage is redirected to /games with toast when Host deletes the room
    const { data: delRoom } = await client
      .from('game_rooms')
      .insert({
        game_slug: 'four-seasons',
        host_id: DEMO_HOST_ID,
        state: 'waiting',
        max_players: 2,
        is_public: true,
      })
      .select('id')
      .single()
    const delRoomId = (delRoom as { id: string }).id
    await client.from('room_players').insert({
      room_id: delRoomId,
      user_id: DEMO_GUEST_ID,
      ready: false,
    })

    currentTestUserId = DEMO_GUEST_ID
    const vGuestSeated = renderGameRoute('/room/:roomId', `/room/${delRoomId}`, <GameRoomPage />)
    await screen.findByText('Sam Chen')

    await client.from('game_rooms').delete().eq('id', delRoomId)

    await waitFor(() => {
      expect(screen.getByText('Games Catalog')).toBeInTheDocument()
      expect(screen.getByText(/ce salon a été supprimé/i)).toBeInTheDocument()
    })
    vGuestSeated.unmount()

    // Automatic 30-minute inactivity cleanup removes stale rooms while keeping active ones
    const staleTimestamp = new Date(Date.now() - 35 * 60 * 1000).toISOString()
    const { data: staleRoom } = await client
      .from('game_rooms')
      .insert({
        game_slug: 'saving-throw',
        host_id: DEMO_HOST_ID,
        state: 'waiting',
        max_players: 2,
        is_public: true,
        last_activity_at: staleTimestamp,
      })
      .select('id')
      .single()
    const staleId = (staleRoom as { id: string }).id

    const { data: cleaned } = await (client as unknown as {
      rpc: (fn: string) => Promise<{ data: number }>
    }).rpc('cleanup_inactive_rooms')
    expect(cleaned).toBeGreaterThanOrEqual(1)

    const { data: afterCleanup } = await client
      .from('game_rooms')
      .select('id')
      .eq('id', staleId)
      .maybeSingle()
    expect(afterCleanup).toBeNull()
  })
})
