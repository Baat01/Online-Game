import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createLocalSupabaseClient, DEMO_HOST_ID, DEMO_GUEST_ID } from '@/lib/localSupabase'

const { localClient } = vi.hoisted(() => ({
  localClient: { current: null as ReturnType<typeof createLocalSupabaseClient> | null },
}))

vi.mock('@/lib/supabase', () => ({
  get supabase() {
    if (!localClient.current) {
      localClient.current = createLocalSupabaseClient()
    }
    return localClient.current
  },
  isLocalDemoMode: true,
}))

import {
  formatYen,
  setRoomStake,
  lockRoomEscrow,
  settleRoomPayout,
  adminAdjustYenBalance,
  updatePlayerCardThemes,
  getRoomStake,
  getRoomPot,
} from '../walletService'

async function createTwoPlayerRoom(stakeYen = 0) {
  const client = localClient.current!
  const { data: room } = await client
    .from('game_rooms')
    .insert({
      game_slug: 'saving-throw',
      host_id: DEMO_HOST_ID,
      state: 'waiting',
      max_players: 2,
      metadata: { stakeYen, potYen: stakeYen * 2 },
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

describe('walletService (Banque des 6 Lances)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    localClient.current = createLocalSupabaseClient()
  })

  it('formats Yen balances and admin infinity badge', () => {
    expect(formatYen(10000)).toBe('10 000 ¥')
    expect(formatYen(0)).toBe('0 ¥')
    expect(formatYen(500000, true, true)).toBe('∞ ¥')
    expect(formatYen(500000, true, false)).toBe('500 000 ¥')
  })

  it('allows standard host preset stakes within player balance and resets Ready flags', async () => {
    const roomId = await createTwoPlayerRoom(0)

    // Make guest host temporarily or test standard user validation
    await localClient.current!
      .from('game_rooms')
      .update({ host_id: DEMO_GUEST_ID })
      .eq('id', roomId)

    const res = await setRoomStake(roomId, 1000, { id: DEMO_GUEST_ID, is_admin: false })
    expect(res).toEqual({ stakeYen: 1000, potYen: 2000 })

    // Verify ready was reset to false
    const { data: rps } = await localClient.current!
      .from('room_players')
      .select('ready')
      .eq('room_id', roomId)
    expect((rps as Array<{ ready: boolean }>).every((p) => p.ready === false)).toBe(true)

    // Non-preset custom amount rejected for non-admin
    await expect(
      setRoomStake(roomId, 1234, { id: DEMO_GUEST_ID, is_admin: false }),
    ).rejects.toThrow(/administrateur/i)
  })

  it('allows Admin to set arbitrary custom stakes without balance cap and adjust Yen', async () => {
    const roomId = await createTwoPlayerRoom(0)

    const res = await setRoomStake(roomId, 250000, { id: DEMO_HOST_ID, is_admin: true })
    expect(res).toEqual({ stakeYen: 250000, potYen: 500000 })

    const { data: room } = await localClient.current!
      .from('game_rooms')
      .select('metadata')
      .eq('id', roomId)
      .single()
    expect(getRoomStake({ metadata: (room as { metadata: Record<string, unknown> }).metadata })).toBe(250000)
    expect(getRoomPot({ metadata: (room as { metadata: Record<string, unknown> }).metadata })).toBe(500000)

    const newGuestBal = await adminAdjustYenBalance(DEMO_GUEST_ID, 5000, 'add')
    expect(newGuestBal).toBe(15000)
  })

  it('locks escrow once and settles winner payout idempotently without duplicate credit on refresh', async () => {
    const roomId = await createTwoPlayerRoom(0)
    await setRoomStake(roomId, 1000, { id: DEMO_HOST_ID, is_admin: true })

    // Lock escrow (deducts 1000 from non-admin Sam Chen: 10000 -> 9000; Admin Alex unchanged)
    const lock1 = await lockRoomEscrow(roomId)
    expect(lock1.locked).toBe(true)
    expect(lock1.potYen).toBe(2000)

    // Second lock call is idempotent
    await lockRoomEscrow(roomId)

    const { data: guestAfterLock } = await localClient.current!
      .from('profiles')
      .select('yen_balance')
      .eq('id', DEMO_GUEST_ID)
      .single()
    expect((guestAfterLock as { yen_balance: number }).yen_balance).toBe(9000)

    // Settle payout to Sam Chen (+2000 -> 11000)
    const pay1 = await settleRoomPayout(roomId, DEMO_GUEST_ID)
    expect(pay1).toEqual({ settled: true, potYen: 2000, payoutType: 'win' })

    // Refresh / duplicate settle call is idempotent
    const pay2 = await settleRoomPayout(roomId, DEMO_GUEST_ID)
    expect(pay2).toEqual({ settled: false, potYen: 0, payoutType: 'none' })

    const { data: guestAfterWin } = await localClient.current!
      .from('profiles')
      .select('yen_balance')
      .eq('id', DEMO_GUEST_ID)
      .single()
    expect((guestAfterWin as { yen_balance: number }).yen_balance).toBe(11000)
  })

  it('refunds stake on draw and persists player card themes', async () => {
    const roomId = await createTwoPlayerRoom(0)
    await setRoomStake(roomId, 500, { id: DEMO_HOST_ID, is_admin: true })
    await lockRoomEscrow(roomId)

    const payDraw = await settleRoomPayout(roomId, 'draw')
    expect(payDraw).toEqual({ settled: true, potYen: 1000, payoutType: 'draw' })

    const { data: guestAfterDraw } = await localClient.current!
      .from('profiles')
      .select('yen_balance')
      .eq('id', DEMO_GUEST_ID)
      .single()
    expect((guestAfterDraw as { yen_balance: number }).yen_balance).toBe(10000)

    await updatePlayerCardThemes(DEMO_GUEST_ID, {
      card_front_theme: 'midnight-neon',
      card_back_theme: 'bami-gold',
    })
    const { data: updatedProf } = await localClient.current!
      .from('profiles')
      .select('card_front_theme, card_back_theme')
      .eq('id', DEMO_GUEST_ID)
      .single()
    expect(updatedProf).toMatchObject({
      card_front_theme: 'midnight-neon',
      card_back_theme: 'bami-gold',
    })
  })
})
