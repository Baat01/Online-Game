/**
 * Local Demo Supabase Client
 *
 * Used automatically when VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY are unset or
 * still pointing at placeholder values, enabling full local multiplayer testing
 * across browser tabs (via localStorage + BroadcastChannel + storage events)
 * without a remote DB.
 */
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

const STORAGE_KEY = 'card_arena_local_db_v1'
const LAST_EVENT_KEY = 'card_arena_local_db_event_v1'
const CHANNEL_NAME = 'card_arena_realtime_v1'
const ACTIVE_USER_SESSION_KEY = 'card_arena_active_user_id'

export const DEMO_HOST_ID = '00000000-0000-4000-8000-000000000001'
export const DEMO_GUEST_ID = '00000000-0000-4000-8000-000000000002'
export const BAMI_ADMIN_ID = '00000000-0000-4000-8000-000000000003'

type Row = Record<string, unknown>
type TableData = Record<string, Row[]>

interface LocalDbState {
  tables: TableData
  users: Array<{ id: string; email: string; password: string; username: string }>
}

function nowIso(): string {
  return new Date().toISOString()
}

function makeUuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

function createInitialDb(): LocalDbState {
  const ts = nowIso()
  return {
    users: [
      { id: DEMO_HOST_ID, email: 'alex@engei.local', password: 'password123', username: 'alex_host' },
      { id: DEMO_GUEST_ID, email: 'sam@engei.local', password: 'password123', username: 'sam_challenger' },
      { id: BAMI_ADMIN_ID, email: 'bami@gmail.fr', password: 'admin0', username: 'bami' },
    ],
    tables: {
      profiles: [
        {
          id: BAMI_ADMIN_ID,
          username: 'bami',
          display_name: 'Bami',
          bio: 'Administrateur — Cercle Bami',
          avatar_url: null,
          is_online: true,
          last_seen: ts,
          created_at: ts,
          updated_at: ts,
          yen_balance: 500000,
          is_admin: true,
          permissions: {
            can_create_accounts: true,
            can_grant_themes: true,
            can_set_custom_stakes: true,
            unlimited_yen: true,
          },
          clan_title: 'Clan Momobami',
          card_back_theme: 'bami-gold',
          card_front_theme: 'royal-fantasy',
          dice_theme: 'obsidian-gold',
          coin_theme: 'momobami-seal',
          unlocked_themes: [
            'classic', 'royal-fantasy', 'minimalist', 'midnight-neon', 'undertale-tarot', 'kinto-pay-to-win',
            'engei-crimson', 'bami-gold', 'obsidian-minimalist', 'kinto-sovereign-back',
            'obsidian-gold', 'crimson-engei', 'ivory-academy', 'cyber-tokyo', 'astral-crystal', 'kinto-gacha-dice',
            'classic-yen', 'momobami-seal', 'engei-scarlet', 'railgun-coin', 'eclipse-medal', 'kinto-railgun-coin',
          ],
        },
        {
          id: DEMO_HOST_ID,
          username: 'alex_host',
          display_name: 'Alex Rivera',
          bio: 'Conseil Bami — Trésorier de l’Académie ENGEI',
          avatar_url: null,
          is_online: true,
          last_seen: ts,
          created_at: ts,
          updated_at: ts,
          yen_balance: 500000,
          is_admin: true,
          permissions: {
            can_create_accounts: true,
            can_grant_themes: true,
            can_set_custom_stakes: true,
            unlimited_yen: true,
          },
          clan_title: 'Clan Momobami',
          card_back_theme: 'bami-gold',
          card_front_theme: 'royal-fantasy',
          dice_theme: 'obsidian-gold',
          coin_theme: 'momobami-seal',
          unlocked_themes: [
            'classic', 'royal-fantasy', 'minimalist', 'midnight-neon', 'undertale-tarot', 'kinto-pay-to-win',
            'engei-crimson', 'bami-gold', 'obsidian-minimalist', 'kinto-sovereign-back',
            'obsidian-gold', 'crimson-engei', 'ivory-academy', 'cyber-tokyo', 'astral-crystal', 'kinto-gacha-dice',
            'classic-yen', 'momobami-seal', 'engei-scarlet', 'railgun-coin', 'eclipse-medal', 'kinto-railgun-coin',
          ],
        },
        {
          id: DEMO_GUEST_ID,
          username: 'sam_challenger',
          display_name: 'Sam Chen',
          bio: 'Élève de l’Académie Engei — Joueur de haut vol',
          avatar_url: null,
          is_online: true,
          last_seen: ts,
          created_at: ts,
          updated_at: ts,
          yen_balance: 10000,
          is_admin: false,
          permissions: {
            can_create_accounts: false,
            can_grant_themes: false,
            can_set_custom_stakes: false,
            unlimited_yen: false,
          },
          clan_title: 'Clan Jabami',
          card_back_theme: 'engei-crimson',
          card_front_theme: 'classic',
          dice_theme: 'crimson-engei',
          coin_theme: 'classic-yen',
          unlocked_themes: [
            'classic', 'royal-fantasy', 'minimalist',
            'engei-crimson', 'bami-gold', 'obsidian-minimalist',
            'obsidian-gold', 'crimson-engei', 'ivory-academy',
            'classic-yen', 'momobami-seal',
          ],
        },
      ],
      presence: [
        { user_id: DEMO_HOST_ID, is_online: true, last_seen: ts },
        { user_id: DEMO_GUEST_ID, is_online: true, last_seen: ts },
      ],
      friends: [
        { id: '10000000-0000-4000-8000-000000000001', user_id: DEMO_HOST_ID, friend_id: DEMO_GUEST_ID, created_at: ts },
        { id: '10000000-0000-4000-8000-000000000002', user_id: DEMO_GUEST_ID, friend_id: DEMO_HOST_ID, created_at: ts },
      ],
      friend_requests: [],
      game_catalog: [
        {
          id: '20000000-0000-4000-8000-000000000001',
          slug: 'blackjack',
          name: 'Blackjack',
          description: 'Classic card game — beat the dealer without going over 21.',
          min_players: 2,
          max_players: 6,
          enabled: true,
          created_at: ts,
        },
        {
          id: '20000000-0000-4000-8000-000000000002',
          slug: 'saving-throw',
          name: 'Saving Throw',
          description: 'Best of 5 rounds. First rolls 2d10, second must roll lower.',
          min_players: 2,
          max_players: 2,
          enabled: true,
          created_at: ts,
        },
        {
          id: '20000000-0000-4000-8000-000000000003',
          slug: 'blackjack-twist',
          name: 'Blackjack Twist',
          description: 'Blackjack with a shared hidden card and face-card sabotage.',
          min_players: 2,
          max_players: 2,
          enabled: true,
          created_at: ts,
        },
        {
          id: '20000000-0000-4000-8000-000000000004',
          slug: 'four-seasons',
          name: 'Four Seasons',
          description: 'First to empty their hand wins. Follow the seasonal order.',
          min_players: 2,
          max_players: 2,
          enabled: true,
          created_at: ts,
        },
        {
          id: '20000000-0000-4000-8000-000000000005',
          slug: '23e-arcane',
          name: 'Le 23e Arcane',
          description: 'Duel asymétrique en 5 manches : 52 cartes, 22 Arcanes du Tarot et anomalie 1/666 Gaster.',
          min_players: 2,
          max_players: 2,
          enabled: true,
          created_at: ts,
        },
      ],
      game_rooms: [],
      room_players: [],
      game_invitations: [],
      game_events: [],
      game_history: [],
      rankings: [],
      notifications: [],
      blackjack_games: [],
      blackjack_players: [],
      blackjack_actions: [],
      yen_transactions: [],
    },
  }
}

function hydrateProfileDefaults(profile: Row): Row {
  const legacyPhrase = ['Banque des', String.fromCharCode(54), 'Lances'].join(' ')
  const cleanBio =
    typeof profile.bio === 'string'
      ? profile.bio.replace(new RegExp(legacyPhrase, 'gi'), 'Trésorerie ENGEI')
      : profile.bio
  return {
    yen_balance: profile.id === DEMO_HOST_ID ? 500000 : 10000,
    is_admin: profile.id === DEMO_HOST_ID,
    permissions:
      profile.id === DEMO_HOST_ID
        ? {
            can_create_accounts: true,
            can_grant_themes: true,
            can_set_custom_stakes: true,
            unlimited_yen: true,
          }
        : {
            can_create_accounts: false,
            can_grant_themes: false,
            can_set_custom_stakes: false,
            unlimited_yen: false,
          },
    clan_title: profile.id === DEMO_HOST_ID ? 'Clan Momobami' : 'Clan Jabami',
    card_back_theme: profile.id === DEMO_HOST_ID ? 'bami-gold' : 'engei-crimson',
    card_front_theme: profile.id === DEMO_HOST_ID ? 'royal-fantasy' : 'classic',
    dice_theme: profile.id === DEMO_HOST_ID ? 'obsidian-gold' : 'crimson-engei',
    coin_theme: profile.id === DEMO_HOST_ID ? 'momobami-seal' : 'classic-yen',
    unlocked_themes:
      profile.id === DEMO_HOST_ID
        ? [
          'classic', 'royal-fantasy', 'minimalist', 'midnight-neon', 'undertale-tarot', 'kinto-pay-to-win',
          'engei-crimson', 'bami-gold', 'obsidian-minimalist', 'kinto-sovereign-back',
          'obsidian-gold', 'crimson-engei', 'ivory-academy', 'cyber-tokyo', 'astral-crystal', 'kinto-gacha-dice',
          'classic-yen', 'momobami-seal', 'engei-scarlet', 'railgun-coin', 'eclipse-medal', 'kinto-railgun-coin',
        ]
        : [
          'classic', 'royal-fantasy', 'minimalist',
          'engei-crimson', 'bami-gold', 'obsidian-minimalist',
          'obsidian-gold', 'crimson-engei', 'ivory-academy',
          'classic-yen', 'momobami-seal',
        ],
    ...profile,
    bio: cleanBio,
  }
}

function loadDb(): LocalDbState {
  if (typeof window === 'undefined' || !window.localStorage) {
    return createInitialDb()
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initial = createInitialDb()
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(initial))
      return initial
    }
    const parsed = JSON.parse(raw) as LocalDbState
    if (!parsed.tables) return createInitialDb()
    parsed.tables.yen_transactions ??= []
    if (Array.isArray(parsed.tables.profiles)) {
      parsed.tables.profiles = parsed.tables.profiles.map(hydrateProfileDefaults)
    }
    if (Array.isArray(parsed.tables.game_rooms)) {
      parsed.tables.game_rooms = parsed.tables.game_rooms.map((r) => ({
        is_public: true,
        ...r,
      }))
    }
    return parsed
  } catch {
    return createInitialDb()
  }
}

function saveDb(db: LocalDbState): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(db))
  } catch {
    // Ignore quota errors in demo mode
  }
}

export function getActiveDemoUserId(): string | null {
  if (typeof window === 'undefined') return DEMO_HOST_ID
  const params = new URLSearchParams(window.location.search)
  const playerParam = params.get('player')
  if (playerParam === '2') {
    window.sessionStorage?.setItem(ACTIVE_USER_SESSION_KEY, DEMO_GUEST_ID)
    return DEMO_GUEST_ID
  }
  if (playerParam === '1') {
    window.sessionStorage?.setItem(ACTIVE_USER_SESSION_KEY, DEMO_HOST_ID)
    return DEMO_HOST_ID
  }
  if (playerParam) {
    const db = loadDb()
    const match = db.users.find(
      (u) =>
        u.id === playerParam || u.username.toLowerCase() === playerParam.trim().toLowerCase(),
    )
    if (match) {
      window.sessionStorage?.setItem(ACTIVE_USER_SESSION_KEY, match.id)
      return match.id
    }
  }
  const stored = window.sessionStorage?.getItem(ACTIVE_USER_SESSION_KEY)
  if (stored === 'signed_out') return null
  return stored || DEMO_HOST_ID
}

export function setActiveDemoUserId(userId: string | null): void {
  if (typeof window === 'undefined' || !window.sessionStorage) return
  window.sessionStorage.setItem(ACTIVE_USER_SESSION_KEY, userId ?? 'signed_out')
}

export interface DemoAccountSummary {
  id: string
  email: string
  username: string
  display_name: string | null
  is_admin: boolean
  clan_title: string | null
}

export function listDemoAccounts(): DemoAccountSummary[] {
  const db = loadDb()
  return db.users.map((u) => {
    const prof = db.tables.profiles.find((p) => p.id === u.id)
    return {
      id: u.id,
      email: u.email,
      username: u.username,
      display_name: (prof?.display_name as string | null) ?? u.username,
      is_admin: Boolean(prof?.is_admin),
      clan_title: (prof?.clan_title as string | null) ?? null,
    }
  })
}

export function registerLocalAccountRecord(entry: {
  id?: string
  email: string
  password: string
  username: string
}): string {
  const db = loadDb()
  const existing = db.users.find(
    (u) =>
      u.email.toLowerCase() === entry.email.toLowerCase() ||
      u.username.toLowerCase() === entry.username.toLowerCase(),
  )
  if (existing) {
    throw new Error('Un compte avec cet e-mail ou identifiant existe déjà.')
  }
  const id = entry.id ?? makeUuid()
  db.users.push({
    id,
    email: entry.email,
    password: entry.password,
    username: entry.username,
  })
  saveDb(db)
  return id
}

export function switchActiveDemoAccount(userId: string): void {
  setActiveDemoUserId(userId)
  notifyAuthChange('SIGNED_IN')
}

// ── Realtime Event Bus (same-tab + cross-tab via BroadcastChannel & storage events) ──

interface DbChangeEvent {
  eventId: string
  table: string
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  new: Row | null
  old: Row | null
}

type ChannelListener = {
  event: '*' | 'INSERT' | 'UPDATE' | 'DELETE'
  table: string
  filter?: string
  callback: (payload: { eventType: string; new: Row; old: Row }) => void
}

const activeChannels = new Set<{ name: string; listeners: ChannelListener[] }>()
const processedEventIds = new Set<string>()
let bc: BroadcastChannel | null = null

function dispatchChangeToChannels(ev: DbChangeEvent): void {
  if (ev.eventId) {
    if (processedEventIds.has(ev.eventId)) return
    processedEventIds.add(ev.eventId)
    if (processedEventIds.size > 300) {
      const first = processedEventIds.values().next().value
      if (first) processedEventIds.delete(first)
    }
  }

  for (const ch of Array.from(activeChannels)) {
    for (const l of ch.listeners) {
      if (l.table !== ev.table) continue
      if (l.event !== '*' && l.event !== ev.eventType) continue
      if (l.filter) {
        const match = /^([a-zA-Z0-9_]+)=eq\.(.+)$/.exec(l.filter)
        if (match) {
          const [, col, val] = match
          const rowToCheck = ev.new ?? ev.old
          if (!rowToCheck || String(rowToCheck[col]) !== val) continue
        }
      }
      l.callback({
        eventType: ev.eventType,
        new: ev.new ?? {},
        old: ev.old ?? {},
      })
    }
  }
}

if (typeof window !== 'undefined') {
  if (typeof BroadcastChannel !== 'undefined') {
    bc = new BroadcastChannel(CHANNEL_NAME)
    bc.onmessage = (event) => {
      const data = event.data as DbChangeEvent | undefined
      if (data && data.table) {
        dispatchChangeToChannels(data)
      }
    }
  }

  window.addEventListener('storage', (event) => {
    if (event.key === LAST_EVENT_KEY && event.newValue) {
      try {
        const parsed = JSON.parse(event.newValue) as DbChangeEvent
        if (parsed && parsed.table) {
          dispatchChangeToChannels(parsed)
        }
      } catch {
        // Ignore malformed storage events
      }
    }
  })
}

function emitDbChange(ev: Omit<DbChangeEvent, 'eventId'>): void {
  const fullEvent: DbChangeEvent = {
    ...ev,
    eventId: makeUuid(),
  }
  dispatchChangeToChannels(fullEvent)
  try {
    bc?.postMessage(fullEvent)
  } catch {
    // Ignore postMessage issues
  }
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(LAST_EVENT_KEY, JSON.stringify(fullEvent))
    } catch {
      // Ignore quota errors
    }
  }
}

// ── Auth State Subscribers ──

const authListeners = new Set<(event: string, session: unknown) => void>()

function buildSessionForUser(userId: string | null) {
  if (!userId) return null
  const db = loadDb()
  const user = db.users.find((u) => u.id === userId)
  if (!user) return null
  return {
    access_token: `local-demo-token-${user.id}`,
    token_type: 'bearer',
    user: {
      id: user.id,
      email: user.email,
      user_metadata: { username: user.username },
    },
  }
}

function notifyAuthChange(event: string) {
  const session = buildSessionForUser(getActiveDemoUserId())
  for (const cb of authListeners) {
    cb(event, session)
  }
}

export function switchDemoPlayer(userId: string): void {
  setActiveDemoUserId(userId)
  notifyAuthChange('SIGNED_IN')
}

// ── Relation Resolver ──

function resolveRelations(row: Row, selectExpr: string, db: LocalDbState): Row {
  const result: Row = { ...row }

  if (selectExpr.includes('friend_profile:')) {
    const prof = (db.tables.profiles ?? []).find((p) => p.id === row.friend_id) ?? null
    result.friend_profile = prof ? hydrateProfileDefaults(prof) : null
  }
  if (selectExpr.includes('sender_profile:')) {
    const prof = (db.tables.profiles ?? []).find((p) => p.id === row.sender_id) ?? null
    result.sender_profile = prof ? hydrateProfileDefaults(prof) : null
  }
  if (selectExpr.includes('receiver_profile:')) {
    const prof = (db.tables.profiles ?? []).find((p) => p.id === row.receiver_id) ?? null
    result.receiver_profile = prof ? hydrateProfileDefaults(prof) : null
  }
  if (selectExpr.includes('profiles')) {
    const prof = (db.tables.profiles ?? []).find((p) => p.id === row.user_id) ?? null
    result.profiles = prof ? hydrateProfileDefaults(prof) : null
  }

  return result
}

// ── Trigger Simulations ──

function applyInsertTriggers(table: string, inserted: Row, db: LocalDbState): void {
  if (table === 'game_rooms') {
    const rp: Row = {
      room_id: inserted.id,
      user_id: inserted.host_id,
      joined_at: nowIso(),
      ready: false,
    }
    db.tables.room_players.push(rp)
    saveDb(db)
    emitDbChange({ table: 'room_players', eventType: 'INSERT', new: rp, old: null })
  }

  if (table === 'room_players') {
    recalculateRoomReadyState(inserted.room_id as string, db)
  }
}

function recalculateRoomReadyState(roomId: string, db: LocalDbState): void {
  const room = db.tables.game_rooms.find((r) => r.id === roomId)
  if (!room) return
  if (room.state === 'playing' || room.state === 'finished' || room.state === 'cancelled') return

  const players = db.tables.room_players.filter((rp) => rp.room_id === roomId)
  const total = players.length
  const readyCount = players.filter((rp) => rp.ready === true).length
  const nextState =
    total >= 2 && readyCount === total
      ? 'ready'
      : total < 2 || readyCount < total
        ? 'waiting'
        : room.state
  if (room.state !== nextState && (nextState === 'ready' || room.state === 'ready')) {
    const oldRoom = { ...room }
    room.state = nextState
    saveDb(db)
    emitDbChange({ table: 'game_rooms', eventType: 'UPDATE', new: { ...room }, old: oldRoom })
  }
}

function applyUpdateTriggers(table: string, updated: Row, previous: Row, db: LocalDbState): void {
  if (table === 'room_players') {
    recalculateRoomReadyState(updated.room_id as string, db)
  }

  if (table === 'game_rooms') {
    if (updated.state === 'playing' && previous.state !== 'playing' && !updated.started_at) {
      updated.started_at = nowIso()
    }
    if (updated.state === 'finished' && previous.state !== 'finished') {
      const meta = (updated.metadata as Row | undefined) ?? {}
      const rawWinner = (meta.winnerId ?? meta.gameWinnerId ?? null) as string | null
      const winnerId = rawWinner === 'draw' ? null : rawWinner
      const players = db.tables.room_players
        .filter((rp) => rp.room_id === updated.id)
        .map((rp) => rp.user_id as string)
      const histRow: Row = {
        id: makeUuid(),
        room_id: updated.id,
        game_slug: updated.game_slug,
        players,
        winner_id: winnerId,
        duration: 60,
        started_at: updated.started_at ?? nowIso(),
        ended_at: nowIso(),
      }
      db.tables.game_history.push(histRow)
    }
    saveDb(db)
  }

  if (table === 'friend_requests' && updated.status === 'accepted' && previous.status !== 'accepted') {
    const ts = nowIso()
    const f1: Row = { id: makeUuid(), user_id: updated.sender_id, friend_id: updated.receiver_id, created_at: ts }
    const f2: Row = { id: makeUuid(), user_id: updated.receiver_id, friend_id: updated.sender_id, created_at: ts }
    db.tables.friends.push(f1, f2)
    saveDb(db)
  }
}

// ── Fluent Query Builder ──

class LocalQueryBuilder {
  private table: string
  private op: 'select' | 'insert' | 'update' | 'delete' | 'upsert' = 'select'
  private selectExpr = '*'
  private payload: Row | Row[] | null = null
  private upsertOpts?: { onConflict?: string }
  private filters: Array<(row: Row) => boolean> = []
  private orderBy: { col: string; ascending: boolean } | null = null
  private limitCount: number | null = null
  private resultMode: 'many' | 'single' | 'maybeSingle' = 'many'

  constructor(table: string) {
    this.table = table
  }

  select(columns = '*') {
    this.selectExpr = columns
    return this
  }

  insert(values: Row | Row[]) {
    this.op = 'insert'
    this.payload = values
    return this
  }

  update(values: Row) {
    this.op = 'update'
    this.payload = values
    return this
  }

  delete() {
    this.op = 'delete'
    return this
  }

  upsert(values: Row | Row[], opts?: { onConflict?: string }) {
    this.op = 'upsert'
    this.payload = values
    this.upsertOpts = opts
    return this
  }

  eq(col: string, val: unknown) {
    this.filters.push((row) => row[col] === val)
    return this
  }

  neq(col: string, val: unknown) {
    this.filters.push((row) => row[col] !== val)
    return this
  }

  in(col: string, vals: unknown[]) {
    this.filters.push((row) => vals.includes(row[col]))
    return this
  }

  contains(col: string, val: unknown[]) {
    this.filters.push((row) => {
      const target = row[col]
      if (!Array.isArray(target)) return false
      return val.every((v) => target.includes(v))
    })
    return this
  }

  ilike(col: string, pattern: string) {
    const clean = pattern.replace(/%/g, '').toLowerCase()
    this.filters.push((row) => String(row[col] ?? '').toLowerCase().includes(clean))
    return this
  }

  or(_expr: string) {
    return this
  }

  order(col: string, opts?: { ascending?: boolean }) {
    this.orderBy = { col, ascending: opts?.ascending !== false }
    return this
  }

  limit(n: number) {
    this.limitCount = n
    return this
  }

  single() {
    this.resultMode = 'single'
    return this
  }

  maybeSingle() {
    this.resultMode = 'maybeSingle'
    return this
  }

  private execute(): { data: unknown; error: { message: string; code?: string } | null } {
    const db = loadDb()
    if (!db.tables[this.table]) {
      db.tables[this.table] = []
    }
    const rows = db.tables[this.table]

    if (this.op === 'select') {
      let matched = rows.filter((r) => this.filters.every((fn) => fn(r)))
      if (this.orderBy) {
        const { col, ascending } = this.orderBy
        const indexed = matched.map((row, index) => ({ row, index }))
        indexed.sort((a, b) => {
          const av = String(a.row[col] ?? '')
          const bv = String(b.row[col] ?? '')
          const cmp = ascending ? av.localeCompare(bv) : bv.localeCompare(av)
          if (cmp !== 0) return cmp
          return ascending ? a.index - b.index : b.index - a.index
        })
        matched = indexed.map((entry) => entry.row)
      }
      if (this.limitCount !== null) {
        matched = matched.slice(0, this.limitCount)
      }
      const resolved = matched.map((r) => resolveRelations(r, this.selectExpr, db))
      if (this.resultMode === 'single') {
        if (resolved.length === 0) {
          return { data: null, error: { message: 'No rows found', code: 'PGRST116' } }
        }
        return { data: resolved[0], error: null }
      }
      if (this.resultMode === 'maybeSingle') {
        return { data: resolved[0] ?? null, error: null }
      }
      return { data: resolved, error: null }
    }

    if (this.op === 'insert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!]

      // Prevent duplicate (room_id, user_id) in room_players
      if (this.table === 'room_players') {
        for (const item of items) {
          if (rows.some((r) => r.room_id === item.room_id && r.user_id === item.user_id)) {
            return { data: null, error: { message: 'Already in room', code: '23505' } }
          }
        }
      }

      const inserted: Row[] = items.map((item) => {
        const row: Row = {
          id: item.id ?? makeUuid(),
          created_at: item.created_at ?? nowIso(),
          ...item,
        }
        if (this.table === 'game_rooms') {
          row.state = row.state ?? 'waiting'
          row.max_players = row.max_players ?? 6
          row.is_public = row.is_public ?? true
          row.metadata = row.metadata ?? {}
          row.started_at = row.started_at ?? null
        }
        if (this.table === 'game_invitations') {
          row.status = row.status ?? 'pending'
          row.expires_at = row.expires_at ?? new Date(Date.now() + 5 * 60_000).toISOString()
        }
        if (this.table === 'blackjack_games') {
          row.status = row.status ?? 'waiting'
          row.deck = row.deck ?? []
          row.dealer_hand = row.dealer_hand ?? []
          row.dealer_score = row.dealer_score ?? 0
          row.current_turn = row.current_turn ?? null
          row.round = row.round ?? 1
        }
        if (this.table === 'blackjack_players') {
          row.hand = row.hand ?? []
          row.score = row.score ?? 0
          row.state = row.state ?? 'waiting'
          row.blackjack = row.blackjack ?? false
          row.busted = row.busted ?? false
          row.standing = row.standing ?? false
          row.joined_at = row.joined_at ?? nowIso()
        }
        return row
      })

      for (const row of inserted) {
        rows.push(row)
      }
      saveDb(db)

      for (const row of inserted) {
        emitDbChange({ table: this.table, eventType: 'INSERT', new: { ...row }, old: null })
        applyInsertTriggers(this.table, row, db)
      }

      if (this.resultMode === 'single' || this.resultMode === 'maybeSingle') {
        return { data: inserted[0] ?? null, error: null }
      }
      return { data: inserted, error: null }
    }

    if (this.op === 'upsert') {
      const items = Array.isArray(this.payload) ? this.payload : [this.payload!]
      const conflictKey = this.upsertOpts?.onConflict ?? 'id'
      const results: Row[] = []

      for (const item of items) {
        const idx = rows.findIndex((r) => r[conflictKey] === item[conflictKey])
        if (idx >= 0) {
          const old = { ...rows[idx] }
          rows[idx] = { ...rows[idx], ...item }
          results.push(rows[idx])
          saveDb(db)
          emitDbChange({ table: this.table, eventType: 'UPDATE', new: { ...rows[idx] }, old })
        } else {
          const row: Row = { id: item.id ?? makeUuid(), ...item }
          rows.push(row)
          results.push(row)
          saveDb(db)
          emitDbChange({ table: this.table, eventType: 'INSERT', new: { ...row }, old: null })
        }
      }
      return { data: this.resultMode === 'many' ? results : (results[0] ?? null), error: null }
    }

    if (this.op === 'update') {
      const updates = this.payload as Row
      const updatedRows: Row[] = []
      const changeEvents: Array<Omit<DbChangeEvent, 'eventId'>> = []
      const postTriggers: Array<{ updated: Row; old: Row }> = []

      for (let i = 0; i < rows.length; i++) {
        if (this.filters.every((fn) => fn(rows[i]))) {
          const old = { ...rows[i] }
          rows[i] = { ...rows[i], ...updates }
          updatedRows.push(rows[i])
          postTriggers.push({ updated: rows[i], old })
          changeEvents.push({ table: this.table, eventType: 'UPDATE', new: { ...rows[i] }, old })
        }
      }

      if (updatedRows.length > 0) {
        saveDb(db)
        for (const t of postTriggers) {
          applyUpdateTriggers(this.table, t.updated, t.old, db)
        }
        for (const ev of changeEvents) {
          emitDbChange(ev)
        }
      }

      if (this.resultMode === 'single') {
        if (updatedRows.length === 0) {
          return { data: null, error: { message: 'No rows updated', code: 'PGRST116' } }
        }
        return { data: updatedRows[0], error: null }
      }
      if (this.resultMode === 'maybeSingle') {
        return { data: updatedRows[0] ?? null, error: null }
      }
      return { data: updatedRows, error: null }
    }

    if (this.op === 'delete') {
      const deleted: Row[] = []
      const remaining: Row[] = []
      for (const row of rows) {
        if (this.filters.every((fn) => fn(row))) {
          deleted.push(row)
        } else {
          remaining.push(row)
        }
      }
      db.tables[this.table] = remaining
      saveDb(db)
      for (const row of deleted) {
        emitDbChange({ table: this.table, eventType: 'DELETE', new: null, old: row })
        if (this.table === 'room_players') {
          recalculateRoomReadyState(row.room_id as string, db)
        }
      }
      return { data: deleted, error: null }
    }

    return { data: null, error: null }
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }
}

export function createLocalSupabaseClient(): SupabaseClient<Database> {
  loadDb()

  const client = {
    __isLocalDemo: true,
    auth: {
      async getSession() {
        return { data: { session: buildSessionForUser(getActiveDemoUserId()) }, error: null }
      },
      async getUser() {
        const session = buildSessionForUser(getActiveDemoUserId())
        return { data: { user: session?.user ?? null }, error: null }
      },
      onAuthStateChange(cb: (event: string, session: unknown) => void) {
        authListeners.add(cb)
        const session = buildSessionForUser(getActiveDemoUserId())
        queueMicrotask(() => cb('INITIAL_SESSION', session))
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                authListeners.delete(cb)
              },
            },
          },
        }
      },
      async signInWithPassword({ email, password }: { email: string; password: string }) {
        const db = loadDb()
        const user = db.users.find(
          (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password,
        )
        if (!user) {
          return { data: { user: null, session: null }, error: new Error('Invalid login credentials') }
        }
        setActiveDemoUserId(user.id)
        notifyAuthChange('SIGNED_IN')
        return { data: { user, session: buildSessionForUser(user.id) }, error: null }
      },
      async signUp({
        email,
        password,
        options,
      }: {
        email: string
        password: string
        options?: { data?: { username?: string } }
      }) {
        const db = loadDb()
        if (db.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          return { data: { user: null, session: null }, error: new Error('User already registered') }
        }
        const id = makeUuid()
        const username = options?.data?.username ?? email.split('@')[0]
        const ts = nowIso()
        db.users.push({ id, email, password, username })
        db.tables.profiles.push({
          id,
          username,
          display_name: username,
          bio: null,
          avatar_url: null,
          is_online: true,
          last_seen: ts,
          created_at: ts,
          updated_at: ts,
          yen_balance: 10000,
          is_admin: false,
          permissions: {
            can_create_accounts: false,
            can_grant_themes: false,
            can_set_custom_stakes: false,
            unlimited_yen: false,
          },
          clan_title: 'Académie Engei',
          card_back_theme: 'engei-crimson',
          card_front_theme: 'classic',
          dice_theme: 'obsidian-gold',
          coin_theme: 'classic-yen',
          unlocked_themes: [
            'classic', 'royal-fantasy', 'minimalist',
            'engei-crimson', 'bami-gold', 'obsidian-minimalist',
            'obsidian-gold', 'crimson-engei', 'ivory-academy',
            'classic-yen', 'momobami-seal',
          ],
        })
        db.tables.presence.push({ user_id: id, is_online: true, last_seen: ts })
        saveDb(db)
        setActiveDemoUserId(id)
        notifyAuthChange('SIGNED_IN')
        return { data: { user: { id, email }, session: buildSessionForUser(id) }, error: null }
      },
      async signOut() {
        setActiveDemoUserId(null)
        notifyAuthChange('SIGNED_OUT')
        return { error: null }
      },
    },
    from(table: string) {
      return new LocalQueryBuilder(table)
    },
    channel(name: string) {
      const ch = { name, listeners: [] as ChannelListener[] }
      const api = {
        name,
        state: 'closed' as string,
        on(
          type: string,
          opts: { event?: string; table?: string; filter?: string },
          cb: (payload: { eventType: string; new: Row; old: Row }) => void,
        ) {
          if (type === 'postgres_changes' && opts.table) {
            ch.listeners.push({
              event: (opts.event as ChannelListener['event']) ?? '*',
              table: opts.table,
              filter: opts.filter,
              callback: cb,
            })
          }
          return api
        },
        subscribe(statusCb?: (status: string) => void) {
          api.state = 'joined'
          activeChannels.add(ch)
          if (statusCb) {
            queueMicrotask(() => statusCb('SUBSCRIBED'))
          }
          return api
        },
      }
      return api
    },
    async removeChannel(channelObj: { name?: string }) {
      for (const ch of activeChannels) {
        if (ch === channelObj || (channelObj?.name && ch.name === channelObj.name)) {
          activeChannels.delete(ch)
        }
      }
      return 'ok'
    },
    storage: {
      from(bucket: string) {
        return {
          async upload(path: string, _blob: Blob) {
            return { data: { path: `${bucket}/${path}` }, error: null }
          },
          async remove(_paths: string[]) {
            return { data: [], error: null }
          },
          getPublicUrl(path: string) {
            return { data: { publicUrl: `https://local-demo.storage/${bucket}/${path}` } }
          },
        }
      },
    },
  }

  return client as unknown as SupabaseClient<Database>
}
