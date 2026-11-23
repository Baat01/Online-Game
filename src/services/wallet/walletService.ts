import { supabase, isLocalDemoMode } from '@/lib/supabase'
import { registerLocalAccountRecord } from '@/lib/localSupabase'
import {
  DEFAULT_UNLOCKED_THEMES,
  SPECIAL_UNLOCKABLE_THEMES,
  getThemePriceYen,
} from '@/games/_shared/themes'
import type { Json } from '@/types/database'
import type { GameRoom } from '@/types/lobby'
import type { Profile, UserPermissions } from '@/types/auth'

export const DEFAULT_USER_PERMISSIONS: UserPermissions = {
  can_create_accounts: false,
  can_grant_themes: false,
  can_set_custom_stakes: false,
  unlimited_yen: false,
}

export function resolveUserPermissions(
  user?: { is_admin?: boolean; permissions?: Partial<UserPermissions> | null } | null,
): UserPermissions {
  const isAdmin = Boolean(user?.is_admin)
  const p = user?.permissions
  return {
    can_create_accounts: p?.can_create_accounts ?? isAdmin,
    can_grant_themes: p?.can_grant_themes ?? isAdmin,
    can_set_custom_stakes: p?.can_set_custom_stakes ?? isAdmin,
    unlimited_yen: p?.unlimited_yen ?? isAdmin,
  }
}

export const PRESET_YEN_STAKES = [0, 100, 500, 1000, 5000] as const
export const DEFAULT_YEN_BALANCE = 10000

export function formatYen(
  amount: number | undefined | null,
  isAdmin = false,
  showInfinityForAdmin = false,
): string {
  if (showInfinityForAdmin && isAdmin) {
    return '∞ ¥'
  }
  const safe = Math.max(0, Math.floor(amount ?? 0))
  const formatted = safe.toLocaleString('fr-FR').replace(/\u202f|\u00a0/g, ' ')
  return `${formatted} ¥`
}

export function getRoomStake(room: Pick<GameRoom, 'metadata'> | null | undefined): number {
  const raw = room?.metadata?.stakeYen
  if (typeof raw !== 'number' || !Number.isFinite(raw) || raw < 0) return 0
  return Math.floor(raw)
}

export function getRoomPot(room: Pick<GameRoom, 'metadata'> | null | undefined): number {
  const rawPot = room?.metadata?.potYen
  if (typeof rawPot === 'number' && Number.isFinite(rawPot) && rawPot >= 0) {
    return Math.floor(rawPot)
  }
  return getRoomStake(room) * 2
}

interface RoomPlayerWithProfile {
  user_id: string
  profiles: {
    id: string
    yen_balance?: number
    is_admin?: boolean
    permissions?: Partial<UserPermissions> | null
  } | null
}

async function fetchRoomContext(roomId: string) {
  const { data: roomRow, error: roomErr } = await supabase
    .from('game_rooms')
    .select('id, host_id, state, metadata')
    .eq('id', roomId)
    .single()

  if (roomErr || !roomRow) throw roomErr ?? new Error('Salle introuvable')

  const { data: playerRows, error: playersErr } = await supabase
    .from('room_players')
    .select('user_id, profiles!inner(id, yen_balance, is_admin, permissions)')
    .eq('room_id', roomId)

  if (playersErr) throw playersErr

  const players = (playerRows ?? []) as unknown as RoomPlayerWithProfile[]
  const metadata =
    roomRow.metadata && typeof roomRow.metadata === 'object' && !Array.isArray(roomRow.metadata)
      ? { ...(roomRow.metadata as Record<string, unknown>) }
      : {}

  return { roomRow, players, metadata }
}

export async function setRoomStake(
  roomId: string,
  stakeYen: number,
  caller: { id: string; is_admin?: boolean; permissions?: Partial<UserPermissions> | null } | null,
): Promise<{ stakeYen: number; potYen: number }> {
  const cleanStake = Math.floor(stakeYen)
  if (!Number.isFinite(cleanStake) || cleanStake < 0) {
    throw new Error('La mise en ¥ doit être positive ou nulle.')
  }

  const { roomRow, players, metadata } = await fetchRoomContext(roomId)

  const callerPerms = resolveUserPermissions(caller)
  const canCustomStake = Boolean(caller?.is_admin || callerPerms.can_set_custom_stakes)
  if (!canCustomStake && roomRow.host_id !== caller?.id) {
    throw new Error("Seul l'hôte ou un administrateur peut modifier la mise.")
  }

  if (!canCustomStake) {
    const isPreset = (PRESET_YEN_STAKES as readonly number[]).includes(cleanStake)
    if (!isPreset) {
      throw new Error('Seul un administrateur peut définir une mise personnalisée.')
    }
    if (cleanStake > 0) {
      for (const p of players) {
        const pPerms = resolveUserPermissions(p.profiles)
        if (!pPerms.unlimited_yen && (p.profiles?.yen_balance ?? DEFAULT_YEN_BALANCE) < cleanStake) {
          throw new Error("Solde en ¥ insuffisant pour l'un des joueurs de la salle.")
        }
      }
    }
  }

  const potYen = cleanStake * Math.max(2, players.length)
  const nextMetadata: Record<string, unknown> = {
    ...metadata,
    stakeYen: cleanStake,
    potYen,
    escrowLocked: false,
    payoutSettled: false,
    stakeSetByAdmin: canCustomStake,
  }

  // Reset ready flags so every player explicitly confirms the updated stake
  await supabase
    .from('room_players')
    .update({ ready: false })
    .eq('room_id', roomId)

  const nextRoomState = roomRow.state === 'ready' ? 'waiting' : roomRow.state
  const { error: updateErr } = await supabase
    .from('game_rooms')
    .update({
      metadata: nextMetadata as Json,
      state: nextRoomState,
    })
    .eq('id', roomId)

  if (updateErr) throw updateErr

  return { stakeYen: cleanStake, potYen }
}

export async function lockRoomEscrow(
  roomId: string,
): Promise<{ stakeYen: number; potYen: number; locked: boolean }> {
  const { players, metadata } = await fetchRoomContext(roomId)
  const stakeYen = Math.max(0, Math.floor(Number(metadata.stakeYen ?? 0)))

  if (stakeYen <= 0) {
    return { stakeYen: 0, potYen: 0, locked: false }
  }
  if (metadata.escrowLocked === true) {
    return {
      stakeYen,
      potYen: Math.floor(Number(metadata.potYen ?? stakeYen * players.length)),
      locked: true,
    }
  }

  for (const p of players) {
    const prof = p.profiles
    if (prof && !resolveUserPermissions(prof).unlimited_yen) {
      const current = prof.yen_balance ?? DEFAULT_YEN_BALANCE
      const nextBal = Math.max(0, current - stakeYen)
      await supabase
        .from('profiles')
        .update({ yen_balance: nextBal, updated_at: new Date().toISOString() })
        .eq('id', prof.id)
    }
  }

  const potYen = stakeYen * Math.max(2, players.length)
  const nextMetadata: Record<string, unknown> = {
    ...metadata,
    stakeYen,
    potYen,
    escrowLocked: true,
    payoutSettled: false,
  }

  await supabase
    .from('game_rooms')
    .update({ metadata: nextMetadata as Json })
    .eq('id', roomId)

  return { stakeYen, potYen, locked: true }
}

export async function settleRoomPayout(
  roomId: string,
  winnerId: string | null,
): Promise<{ settled: boolean; potYen: number; payoutType: 'win' | 'draw' | 'none' }> {
  const { players, metadata } = await fetchRoomContext(roomId)
  const stakeYen = Math.max(0, Math.floor(Number(metadata.stakeYen ?? 0)))
  const potYen = Math.max(0, Math.floor(Number(metadata.potYen ?? stakeYen * players.length)))

  if (stakeYen <= 0 || metadata.escrowLocked !== true || metadata.payoutSettled === true) {
    return { settled: false, potYen: 0, payoutType: 'none' }
  }

  // Mark settled first for idempotency across refreshes
  const settledMetadata: Record<string, unknown> = {
    ...metadata,
    payoutSettled: true,
    payoutWinnerId: winnerId,
    payoutType: !winnerId || winnerId === 'draw' ? 'draw' : 'win',
  }

  await supabase
    .from('game_rooms')
    .update({ metadata: settledMetadata as Json })
    .eq('id', roomId)

  if (!winnerId || winnerId === 'draw') {
    for (const p of players) {
      const prof = p.profiles
      if (prof && !resolveUserPermissions(prof).unlimited_yen) {
        const current = prof.yen_balance ?? 0
        await supabase
          .from('profiles')
          .update({ yen_balance: current + stakeYen, updated_at: new Date().toISOString() })
          .eq('id', prof.id)
      }
    }
    return { settled: true, potYen, payoutType: 'draw' }
  }

  const winnerRow = players.find((p) => p.user_id === winnerId)
  if (winnerRow?.profiles && !resolveUserPermissions(winnerRow.profiles).unlimited_yen) {
    const current = winnerRow.profiles.yen_balance ?? 0
    await supabase
      .from('profiles')
      .update({ yen_balance: current + potYen, updated_at: new Date().toISOString() })
      .eq('id', winnerId)
  }

  return { settled: true, potYen, payoutType: 'win' }
}

export async function adminAdjustYenBalance(
  targetUserId: string,
  amount: number,
  mode: 'add' | 'set' = 'add',
): Promise<number> {
  const clean = Math.floor(amount)
  const { data: prof, error: fetchErr } = await supabase
    .from('profiles')
    .select('yen_balance')
    .eq('id', targetUserId)
    .single()

  if (fetchErr) throw fetchErr
  const current = (prof as { yen_balance?: number } | null)?.yen_balance ?? DEFAULT_YEN_BALANCE
  const nextBalance = mode === 'set' ? Math.max(0, clean) : Math.max(0, current + clean)

  const { error: updErr } = await supabase
    .from('profiles')
    .update({ yen_balance: nextBalance, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (updErr) throw updErr
  return nextBalance
}

export async function updatePlayerCardThemes(
  userId: string,
  themes: {
    card_front_theme?: string
    card_back_theme?: string
    dice_theme?: string
    coin_theme?: string
  },
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({
      ...themes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (error) throw error
}

export const updatePlayerCosmetics = updatePlayerCardThemes

export async function listProfilesForAdmin(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('username')
    .limit(50)

  if (error) throw error
  return (data ?? []) as Profile[]
}

export async function adminSetThemeUnlock(
  targetUserId: string,
  themeId: string,
  unlocked: boolean,
): Promise<string[]> {
  const { data: prof, error: fetchErr } = await supabase
    .from('profiles')
    .select('unlocked_themes')
    .eq('id', targetUserId)
    .single()

  if (fetchErr) throw fetchErr
  const existing = Array.isArray((prof as { unlocked_themes?: unknown } | null)?.unlocked_themes)
    ? ((prof as { unlocked_themes: string[] }).unlocked_themes)
    : [...DEFAULT_UNLOCKED_THEMES]

  const set = new Set<string>(existing)
  if (unlocked) {
    set.add(themeId)
  } else {
    set.delete(themeId)
  }

  const next = Array.from(set)
  const { error: updErr } = await supabase
    .from('profiles')
    .update({ unlocked_themes: next, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (updErr) throw updErr
  return next
}

export async function adminUnlockAllThemes(targetUserId: string): Promise<string[]> {
  const all = Array.from(
    new Set([...DEFAULT_UNLOCKED_THEMES, ...SPECIAL_UNLOCKABLE_THEMES.map((t) => t.id)]),
  )
  const { error } = await supabase
    .from('profiles')
    .update({ unlocked_themes: all, updated_at: new Date().toISOString() })
    .eq('id', targetUserId)

  if (error) throw error
  return all
}

export interface YenTransaction {
  id: string
  sender_id: string | null
  recipient_id: string | null
  amount: number
  transaction_type: 'transfer' | 'shop_purchase' | 'admin_grant' | string
  note: string | null
  created_at: string
}

export async function transferYen(
  senderId: string,
  recipientId: string,
  amount: number,
  note?: string,
): Promise<{
  senderBalance: number
  recipientBalance: number
  transaction: YenTransaction
}> {
  const cleanAmount = Math.floor(amount)
  if (!Number.isFinite(cleanAmount) || cleanAmount <= 0) {
    throw new Error('Le montant du virement doit être supérieur à 0 ¥.')
  }
  if (!senderId || !recipientId || senderId === recipientId) {
    throw new Error('Impossible d’effectuer un virement vers vous-même.')
  }

  const { data: senderRow, error: senderErr } = await supabase
    .from('profiles')
    .select('id, yen_balance, is_admin, permissions')
    .eq('id', senderId)
    .single()

  if (senderErr || !senderRow) throw senderErr ?? new Error('Expéditeur introuvable.')

  const { data: recipientRow, error: recipErr } = await supabase
    .from('profiles')
    .select('id, yen_balance')
    .eq('id', recipientId)
    .single()

  if (recipErr || !recipientRow) throw recipErr ?? new Error('Destinataire introuvable.')

  const senderUnlimited = resolveUserPermissions(
    senderRow as { is_admin?: boolean; permissions?: Partial<UserPermissions> | null },
  ).unlimited_yen
  const currentSenderBal = (senderRow as { yen_balance?: number }).yen_balance ?? DEFAULT_YEN_BALANCE
  const currentRecipientBal =
    (recipientRow as { yen_balance?: number }).yen_balance ?? DEFAULT_YEN_BALANCE

  if (!senderUnlimited && currentSenderBal < cleanAmount) {
    throw new Error('Solde en ¥ insuffisant pour effectuer ce virement.')
  }

  const nextSenderBal = senderUnlimited ? currentSenderBal : currentSenderBal - cleanAmount
  const nextRecipientBal = currentRecipientBal + cleanAmount
  const now = new Date().toISOString()

  if (!senderUnlimited) {
    const { error: deductErr } = await supabase
      .from('profiles')
      .update({ yen_balance: nextSenderBal, updated_at: now })
      .eq('id', senderId)
    if (deductErr) throw deductErr
  }

  const { error: creditErr } = await supabase
    .from('profiles')
    .update({ yen_balance: nextRecipientBal, updated_at: now })
    .eq('id', recipientId)

  if (creditErr) throw creditErr

  const cleanNote = note?.trim() ? note.trim().slice(0, 140) : null
  const { data: txRow, error: txErr } = await supabase
    .from('yen_transactions')
    .insert({
      sender_id: senderId,
      recipient_id: recipientId,
      amount: cleanAmount,
      transaction_type: 'transfer',
      note: cleanNote,
    })
    .select('id, sender_id, recipient_id, amount, transaction_type, note, created_at')
    .single()

  if (txErr || !txRow) throw txErr ?? new Error('Erreur lors de l’enregistrement du virement.')

  return {
    senderBalance: nextSenderBal,
    recipientBalance: nextRecipientBal,
    transaction: txRow as YenTransaction,
  }
}

export async function getRecentYenTransactions(
  userId: string,
  limit = 15,
): Promise<YenTransaction[]> {
  if (!userId) return []
  const { data, error } = await supabase
    .from('yen_transactions')
    .select('id, sender_id, recipient_id, amount, transaction_type, note, created_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) throw error
  return ((data ?? []) as YenTransaction[])
    .filter((tx) => tx.sender_id === userId || tx.recipient_id === userId)
    .slice(0, limit)
}

export async function purchaseTheme(
  userId: string,
  themeId: string,
): Promise<{
  unlockedThemes: string[]
  newBalance: number
  priceYen: number
}> {
  const priceYen = getThemePriceYen(themeId)
  const { data: prof, error: fetchErr } = await supabase
    .from('profiles')
    .select('id, yen_balance, is_admin, permissions, unlocked_themes')
    .eq('id', userId)
    .single()

  if (fetchErr || !prof) throw fetchErr ?? new Error('Profil introuvable.')

  const hasUnlimited = resolveUserPermissions(
    prof as { is_admin?: boolean; permissions?: Partial<UserPermissions> | null },
  ).unlimited_yen
  const currentBal = (prof as { yen_balance?: number }).yen_balance ?? DEFAULT_YEN_BALANCE
  const existing = Array.isArray((prof as { unlocked_themes?: unknown }).unlocked_themes)
    ? ((prof as { unlocked_themes: string[] }).unlocked_themes)
    : [...DEFAULT_UNLOCKED_THEMES]

  if (existing.includes(themeId)) {
    return { unlockedThemes: existing, newBalance: currentBal, priceYen: 0 }
  }

  if (!hasUnlimited && currentBal < priceYen) {
    throw new Error(`Solde insuffisant (${formatYen(priceYen)} requis).`)
  }

  const nextBalance = hasUnlimited ? currentBal : currentBal - priceYen
  const nextUnlocked = Array.from(new Set([...existing, themeId]))

  const { error: updErr } = await supabase
    .from('profiles')
    .update({
      yen_balance: nextBalance,
      unlocked_themes: nextUnlocked,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)

  if (updErr) throw updErr

  if (priceYen > 0) {
    await supabase.from('yen_transactions').insert({
      sender_id: userId,
      recipient_id: null,
      amount: priceYen,
      transaction_type: 'shop_purchase',
      note: `Achat Boutique ENGEI : ${themeId}`,
    })
  }

  return { unlockedThemes: nextUnlocked, newBalance: nextBalance, priceYen }
}

export interface AdminCreateAccountPayload {
  username: string
  display_name?: string
  email: string
  password: string
  is_admin?: boolean
  permissions?: Partial<UserPermissions>
  yen_balance?: number
  clan_title?: string
  unlock_all_themes?: boolean
  unlocked_themes?: string[]
}

export async function adminCreateAccount(
  adminId: string,
  payload: AdminCreateAccountPayload,
): Promise<Profile> {
  const { data: caller, error: callerErr } = await supabase
    .from('profiles')
    .select('id, is_admin, permissions')
    .eq('id', adminId)
    .single()

  if (callerErr || !caller) throw callerErr ?? new Error('Administrateur introuvable.')

  const callerPerms = resolveUserPermissions(
    caller as { is_admin?: boolean; permissions?: Partial<UserPermissions> | null },
  )
  if (!callerPerms.can_create_accounts) {
    throw new Error("Vous n'avez pas la permission de créer des comptes.")
  }

  const cleanUsername = payload.username.trim()
  const cleanEmail = payload.email.trim().toLowerCase()
  if (cleanUsername.length < 2) {
    throw new Error("Le nom d'utilisateur doit contenir au moins 2 caractères.")
  }
  if (!cleanEmail.includes('@')) {
    throw new Error('Adresse e-mail invalide.')
  }
  if (payload.password.length < 4) {
    throw new Error('Le mot de passe / PIN doit contenir au moins 4 caractères.')
  }

  const { data: existingUsers } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('username', cleanUsername)
    .limit(1)

  if (Array.isArray(existingUsers) && existingUsers.length > 0) {
    throw new Error(`Le nom d'utilisateur « ${cleanUsername} » est déjà utilisé.`)
  }

  const isAdmin = Boolean(payload.is_admin)
  const perms: UserPermissions = {
    can_create_accounts: payload.permissions?.can_create_accounts ?? isAdmin,
    can_grant_themes: payload.permissions?.can_grant_themes ?? isAdmin,
    can_set_custom_stakes: payload.permissions?.can_set_custom_stakes ?? isAdmin,
    unlimited_yen: payload.permissions?.unlimited_yen ?? isAdmin,
  }

  const allThemes = Array.from(
    new Set([...DEFAULT_UNLOCKED_THEMES, ...SPECIAL_UNLOCKABLE_THEMES.map((t) => t.id)]),
  )
  const unlockedThemes = payload.unlock_all_themes
    ? allThemes
    : Array.from(new Set([...DEFAULT_UNLOCKED_THEMES, ...(payload.unlocked_themes ?? [])]))

  const yenBalance = Math.max(0, Math.floor(payload.yen_balance ?? DEFAULT_YEN_BALANCE))
  const clanTitle = payload.clan_title?.trim() || 'Académie Engei'
  const displayName = payload.display_name?.trim() || cleanUsername
  const now = new Date().toISOString()

  let userId: string
  if (isLocalDemoMode) {
    userId = registerLocalAccountRecord({
      email: cleanEmail,
      password: payload.password,
      username: cleanUsername,
    })
  } else {
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
      email: cleanEmail,
      password: payload.password,
      options: { data: { username: cleanUsername } },
    })
    if (signUpErr || !signUpData.user) {
      throw signUpErr ?? new Error('Échec de création du compte Auth.')
    }
    userId = signUpData.user.id
  }

  const { data: inserted, error: insertErr } = await supabase
    .from('profiles')
    .insert({
      id: userId,
      username: cleanUsername,
      display_name: displayName,
      bio: `${clanTitle} — Membre ENGEI`,
      avatar_url: null,
      is_online: true,
      last_seen: now,
      created_at: now,
      updated_at: now,
      yen_balance: yenBalance,
      is_admin: isAdmin,
      permissions: perms,
      clan_title: clanTitle,
      card_back_theme: 'engei-crimson',
      card_front_theme: 'classic',
      dice_theme: 'obsidian-gold',
      coin_theme: 'classic-yen',
      unlocked_themes: unlockedThemes,
    })
    .select('*')
    .single()

  if (insertErr || !inserted) throw insertErr ?? new Error('Échec de création du profil.')

  await supabase.from('presence').upsert({ user_id: userId, is_online: true, last_seen: now })

  return inserted as unknown as Profile
}
