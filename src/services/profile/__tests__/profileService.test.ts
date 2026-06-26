import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Profile service tests.
 * Supabase client is fully mocked via vi.hoisted.
 * We use 'as any' on mockFrom to avoid fighting Supabase's complex query-builder types.
 */

// ── Hoist mock ────────────────────────────────────────────────────────────────
const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  return { mockFrom }
})

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    storage: { from: vi.fn() },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildChain(overrides: Record<string, any> = {}): any {
  const base = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    ...overrides,
  }
  // Make chaining work by returning `base` from each method
  base.select.mockReturnValue(base)
  base.update.mockReturnValue(base)
  base.eq.mockReturnValue(base)
  base.neq.mockReturnValue(base)
  return base
}

import * as profileService from '../profileService'

beforeEach(() => vi.clearAllMocks())

// ── getProfile ────────────────────────────────────────────────────────────────

describe('getProfile', () => {
  it('returns profile data when found', async () => {
    const fakeProfile = {
      id: 'user-1', username: 'ace', display_name: 'Ace Player', bio: 'Hello',
      avatar_url: null, is_online: false, last_seen: '', created_at: '', updated_at: '',
    }
    const chain = buildChain()
    chain.single.mockResolvedValue({ data: fakeProfile, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await profileService.getProfile('user-1')
    expect(result).toEqual(fakeProfile)
  })

  it('returns null when profile not found (PGRST116)', async () => {
    const chain = buildChain()
    chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST116' } })
    mockFrom.mockReturnValue(chain)

    const result = await profileService.getProfile('user-1')
    expect(result).toBeNull()
  })

  it('throws on unexpected database error', async () => {
    const chain = buildChain()
    chain.single.mockResolvedValue({ data: null, error: { code: 'PGRST301', message: 'Unexpected' } })
    mockFrom.mockReturnValue(chain)

    await expect(profileService.getProfile('user-1')).rejects.toMatchObject({ code: 'PGRST301' })
  })
})

// ── updateProfile ─────────────────────────────────────────────────────────────

describe('updateProfile', () => {
  it('calls update with correct payload and returns profile', async () => {
    const updatedProfile = {
      id: 'user-1', username: 'ace', display_name: 'New Name', bio: 'New bio',
      avatar_url: null, is_online: false, last_seen: '', created_at: '', updated_at: '',
    }
    const chain = buildChain()
    chain.single.mockResolvedValue({ data: updatedProfile, error: null })
    mockFrom.mockReturnValue(chain)

    const payload = { username: 'ace', display_name: 'New Name', bio: 'New bio' }
    const result = await profileService.updateProfile('user-1', payload)

    expect(chain.update).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'ace', display_name: 'New Name', bio: 'New bio' }),
    )
    expect(result).toEqual(updatedProfile)
  })

  it('throws on error', async () => {
    const chain = buildChain()
    chain.single.mockResolvedValue({ data: null, error: new Error('DB error') })
    mockFrom.mockReturnValue(chain)

    await expect(
      profileService.updateProfile('user-1', { username: 'ace', display_name: null, bio: null }),
    ).rejects.toThrow('DB error')
  })
})

// ── isUsernameAvailable ───────────────────────────────────────────────────────

describe('isUsernameAvailable', () => {
  it('returns true when username is not taken', async () => {
    const chain = buildChain()
    chain.maybeSingle.mockResolvedValue({ data: null, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await profileService.isUsernameAvailable('uniqueuser', 'user-1')
    expect(result).toBe(true)
  })

  it('returns false when another user has the username', async () => {
    const chain = buildChain()
    chain.maybeSingle.mockResolvedValue({ data: { id: 'other-user' }, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await profileService.isUsernameAvailable('taken', 'user-1')
    expect(result).toBe(false)
  })
})
