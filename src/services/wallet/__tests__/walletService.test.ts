import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createLocalSupabaseClient, DEMO_HOST_ID, DEMO_GUEST_ID, listDemoAccounts } from '@/lib/localSupabase'

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
  adminSetThemeUnlock,
  adminUnlockAllThemes,
  adminCreateAccount,
  resolveUserPermissions,
  updatePlayerCardThemes,
  transferYen,
  getRecentYenTransactions,
  purchaseTheme,
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

describe('walletService (Trésorerie ENGEI)', () => {
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

  it('allows Admin to grant, revoke, and unlock all special themes for a player', async () => {
    const granted = await adminSetThemeUnlock(DEMO_GUEST_ID, 'undertale-tarot', true)
    expect(granted).toContain('undertale-tarot')

    const revoked = await adminSetThemeUnlock(DEMO_GUEST_ID, 'undertale-tarot', false)
    expect(revoked).not.toContain('undertale-tarot')

    const all = await adminUnlockAllThemes(DEMO_GUEST_ID)
    expect(all).toContain('undertale-tarot')
    expect(all).toContain('astral-crystal')
    expect(all).toContain('railgun-coin')
    expect(all).toContain('kinto-pay-to-win')
  })

  it('supports P2P Yen transfers and records yen_transactions history', async () => {
    // Reject invalid / self transfers
    await expect(transferYen(DEMO_GUEST_ID, DEMO_GUEST_ID, 100)).rejects.toThrow(/vous-même/i)
    await expect(transferYen(DEMO_GUEST_ID, DEMO_HOST_ID, 999999)).rejects.toThrow(/insuffisant/i)

    // Non-admin Sam transfers 1 500 ¥ to Alex
    const res = await transferYen(DEMO_GUEST_ID, DEMO_HOST_ID, 1500, 'Dette Engei')
    expect(res.senderBalance).toBe(8500)
    expect(res.recipientBalance).toBe(501500)
    expect(res.transaction.amount).toBe(1500)
    expect(res.transaction.note).toBe('Dette Engei')

    // Admin Alex transfers 2 500 ¥ back without losing unlimited balance
    const adminRes = await transferYen(DEMO_HOST_ID, DEMO_GUEST_ID, 2500, 'Prime Bami')
    expect(adminRes.senderBalance).toBe(501500)
    expect(adminRes.recipientBalance).toBe(11000)

    const history = await getRecentYenTransactions(DEMO_GUEST_ID)
    expect(history.length).toBeGreaterThanOrEqual(2)
    expect(history[0].amount).toBe(2500)
  })

  it('allows players to purchase unlockable themes with Yen in Shop', async () => {
    const res = await purchaseTheme(DEMO_GUEST_ID, 'kinto-gacha-dice')
    expect(res.priceYen).toBe(600)
    expect(res.newBalance).toBe(9400)
    expect(res.unlockedThemes).toContain('kinto-gacha-dice')

    // Purchasing again does not double-charge
    const dup = await purchaseTheme(DEMO_GUEST_ID, 'kinto-gacha-dice')
    expect(dup.priceYen).toBe(0)
    expect(dup.newBalance).toBe(9400)
  })

  it('allows Admin to provision new accounts with custom permissions, Yen balance, clan, and themes', async () => {
    // Non-admin Sam cannot create accounts
    await expect(
      adminCreateAccount(DEMO_GUEST_ID, {
        username: 'unauth_user',
        email: 'unauth@engei.local',
        password: 'password123',
      }),
    ).rejects.toThrow(/permission/i)

    // Admin creates Kirari with custom stakes + unlimited yen + all themes, but not can_create_accounts
    const created = await adminCreateAccount(DEMO_HOST_ID, {
      username: 'kirari_bami',
      display_name: 'Kirari Momobami',
      email: 'kirari@engei.local',
      password: 'password123',
      is_admin: false,
      permissions: {
        can_create_accounts: false,
        can_grant_themes: true,
        can_set_custom_stakes: true,
        unlimited_yen: true,
      },
      yen_balance: 250000,
      clan_title: 'Clan Momobami',
      unlock_all_themes: true,
    })

    expect(created.username).toBe('kirari_bami')
    expect(created.yen_balance).toBe(250000)
    expect(created.clan_title).toBe('Clan Momobami')
    expect(created.unlocked_themes).toContain('kinto-pay-to-win')
    expect(created.unlocked_themes).toContain('undertale-tarot')

    const perms = resolveUserPermissions(created)
    expect(perms.can_set_custom_stakes).toBe(true)
    expect(perms.unlimited_yen).toBe(true)
    expect(perms.can_create_accounts).toBe(false)

    // Duplicate username rejected
    await expect(
      adminCreateAccount(DEMO_HOST_ID, {
        username: 'kirari_bami',
        email: 'kirari2@engei.local',
        password: 'password123',
      }),
    ).rejects.toThrow(/déjà utilisé/i)

    // Custom stake permission lets Kirari set non-preset stakes
    const roomId = await createTwoPlayerRoom(0)
    const customStake = await setRoomStake(roomId, 7777, created)
    expect(customStake.stakeYen).toBe(7777)

    // Newly created account is exposed in demo account list
    const demoList = listDemoAccounts()
    expect(demoList.some((a) => a.username === 'kirari_bami')).toBe(true)
  })
})
