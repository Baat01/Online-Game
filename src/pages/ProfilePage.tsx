import { useState, useCallback, useEffect } from 'react'
import { useBlocker } from 'react-router-dom'
import { UserCircle2, Coins, Shield, PlusCircle, LockOpen, Lock, Send, UserPlus, ArrowRightLeft } from 'lucide-react'
import { AvatarUploader } from '@/components/profile/AvatarUploader'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import { useToast } from '@/components/ui/Toast'
import { CardThemeSelector } from '@/games/_shared/components'
import { SPECIAL_UNLOCKABLE_THEMES } from '@/games/_shared/themes'
import {
  adminAdjustYenBalance,
  adminCreateAccount,
  adminSetThemeUnlock,
  adminUnlockAllThemes,
  DEFAULT_USER_PERMISSIONS,
  DEFAULT_YEN_BALANCE,
  formatYen,
  getRecentYenTransactions,
  listProfilesForAdmin,
  resolveUserPermissions,
  transferYen,
  type YenTransaction,
} from '@/services/wallet/walletService'
import { DEMO_GUEST_ID, switchActiveDemoAccount } from '@/lib/localSupabase'
import type { Profile, UserPermissions } from '@/types/auth'
import type { UpdateProfilePayload } from '@/types/profile'

/**
 * Profile page — /profile (protected).
 *
 * Sections:
 * 1. Avatar uploader
 * 2. Profile edit form (username, display_name, bio)
 *
 * Behaviour:
 * - Warns on navigation when form has unsaved changes (useBlocker)
 * - Toast on save success / failure
 * - Optimistic updates via useProfile
 */
export function ProfilePage() {
  const { profile, isLoading, isSaving, isUploadingAvatar, isRemovingAvatar,
    updateProfile, uploadAvatar, removeAvatar, checkUsernameAvailable, refresh } = useProfile()
  const { refreshProfile } = useAuth()
  const { toast } = useToast()
  const [isDirty, setIsDirty] = useState(false)
  const [grantAmount, setGrantAmount] = useState('10000')
  const [isGranting, setIsGranting] = useState(false)
  const [adminTargets, setAdminTargets] = useState<Profile[]>([])
  const [selectedTargetId, setSelectedTargetId] = useState<string>(DEMO_GUEST_ID)
  const [isTogglingTheme, setIsTogglingTheme] = useState(false)
  const [transferRecipientId, setTransferRecipientId] = useState<string>('')
  const [transferAmount, setTransferAmount] = useState('500')
  const [transferNote, setTransferNote] = useState('')
  const [isTransferring, setIsTransferring] = useState(false)
  const [recentTransactions, setRecentTransactions] = useState<YenTransaction[]>([])

  // Admin Account Creation Form State
  const [newUsername, setNewUsername] = useState('')
  const [newDisplayName, setNewDisplayName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newPassword, setNewPassword] = useState('engei1234')
  const [newYenBalance, setNewYenBalance] = useState('10000')
  const [newClanTitle, setNewClanTitle] = useState('Clan Obami')
  const [newIsAdmin, setNewIsAdmin] = useState(false)
  const [newPermissions, setNewPermissions] = useState<UserPermissions>(DEFAULT_USER_PERMISSIONS)
  const [newUnlockAll, setNewUnlockAll] = useState(false)
  const [isCreatingAccount, setIsCreatingAccount] = useState(false)

  useEffect(() => {
    if (!profile?.id) return
    let active = true
    Promise.resolve()
      .then(() => listProfilesForAdmin())
      .then((list) => {
        if (!active || !Array.isArray(list)) return
        setAdminTargets(list)
        const others = list.filter((p) => p.id !== profile.id)
        if (others[0]) {
          setSelectedTargetId(others[0].id)
          setTransferRecipientId((prev) => prev || others[0].id)
        } else if (list[0]) {
          setSelectedTargetId(list[0].id)
        }
      })
      .catch(() => {})

    Promise.resolve()
      .then(() => getRecentYenTransactions(profile.id, 8))
      .then((txs) => {
        if (active && Array.isArray(txs)) setRecentTransactions(txs)
      })
      .catch(() => {})

    return () => {
      active = false
    }
  }, [profile?.id])

  const selectedTarget = adminTargets.find((p) => p.id === selectedTargetId) ?? null
  const transferRecipients = adminTargets.filter((p) => p.id !== profile?.id)

  const handleTransferYen = async () => {
    if (!profile?.id || !transferRecipientId) {
      toast('Sélectionnez un destinataire.', 'error')
      return
    }
    const parsed = parseInt(transferAmount, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast('Entrez un montant valide supérieur à 0 ¥.', 'error')
      return
    }
    setIsTransferring(true)
    try {
      const { transaction } = await transferYen(profile.id, transferRecipientId, parsed, transferNote)
      setRecentTransactions((prev) => [transaction, ...prev].slice(0, 8))
      setTransferNote('')
      await Promise.all([refresh(), refreshProfile()])
      const recip = transferRecipients.find((p) => p.id === transferRecipientId)
      toast(
        `${formatYen(parsed)} envoyés à ${recip?.display_name ?? recip?.username ?? 'destinataire'} !`,
        'success',
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors du virement.', 'error')
    } finally {
      setIsTransferring(false)
    }
  }

  const handleToggleUnlockTheme = async (themeId: string, currentlyUnlocked: boolean) => {
    if (!selectedTarget) return
    setIsTogglingTheme(true)
    try {
      const nextUnlocked = await adminSetThemeUnlock(selectedTarget.id, themeId, !currentlyUnlocked)
      setAdminTargets((prev) =>
        prev.map((p) =>
          p.id === selectedTarget.id ? { ...p, unlocked_themes: nextUnlocked } : p,
        ),
      )
      await Promise.all([refresh(), refreshProfile()])
      toast(
        !currentlyUnlocked
          ? `Thème débloqué pour ${selectedTarget.display_name ?? selectedTarget.username}.`
          : `Thème révoqué pour ${selectedTarget.display_name ?? selectedTarget.username}.`,
        'info',
      )
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la mise à jour.', 'error')
    } finally {
      setIsTogglingTheme(false)
    }
  }

  const handleUnlockAllForTarget = async () => {
    if (!selectedTarget) return
    setIsTogglingTheme(true)
    try {
      const nextUnlocked = await adminUnlockAllThemes(selectedTarget.id)
      setAdminTargets((prev) =>
        prev.map((p) =>
          p.id === selectedTarget.id ? { ...p, unlocked_themes: nextUnlocked } : p,
        ),
      )
      await Promise.all([refresh(), refreshProfile()])
      toast(`Tous les thèmes débloqués pour ${selectedTarget.display_name ?? selectedTarget.username}.`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur.', 'error')
    } finally {
      setIsTogglingTheme(false)
    }
  }

  const handleAdminGrant = async (targetUserId: string, label: string) => {
    const parsed = parseInt(grantAmount, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
      toast('Entrez un montant valide en ¥.', 'error')
      return
    }
    setIsGranting(true)
    try {
      await adminAdjustYenBalance(targetUserId, parsed, 'add')
      await Promise.all([refresh(), refreshProfile()])
      toast(`+${formatYen(parsed)} crédités à ${label}.`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors du crédit.', 'error')
    } finally {
      setIsGranting(false)
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.id) return
    const parsedBal = parseInt(newYenBalance, 10)
    if (!Number.isFinite(parsedBal) || parsedBal < 0) {
      toast('Entrez un solde initial valide en ¥.', 'error')
      return
    }
    setIsCreatingAccount(true)
    try {
      const created = await adminCreateAccount(profile.id, {
        username: newUsername,
        display_name: newDisplayName || newUsername,
        email: newEmail,
        password: newPassword,
        is_admin: newIsAdmin,
        permissions: newPermissions,
        yen_balance: parsedBal,
        clan_title: newClanTitle,
        unlock_all_themes: newUnlockAll,
      })
      setAdminTargets((prev) => [...prev, created])
      setSelectedTargetId(created.id)
      setNewUsername('')
      setNewDisplayName('')
      setNewEmail('')
      toast(`Compte @${created.username} créé avec succès !`, 'success')
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Erreur lors de la création du compte.', 'error')
    } finally {
      setIsCreatingAccount(false)
    }
  }

  // ── Navigation blocker (unsaved changes guard) ───────────────────────────
  useBlocker(
    useCallback(
      ({ currentLocation, nextLocation }) =>
        isDirty && currentLocation.pathname !== nextLocation.pathname,
      [isDirty],
    ),
  )

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleSave = async (payload: UpdateProfilePayload) => {
    try {
      await updateProfile(payload)
      toast('Profile saved successfully!', 'success')
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to save profile. Please try again.',
        'error',
      )
      // Do not re-throw — form stays dirty because reset() is only called on success
    }
  }

  const handleUploadAvatar = async (file: File) => {
    try {
      await uploadAvatar(file)
      toast('Avatar updated!', 'success')
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to upload avatar.',
        'error',
      )
    }
  }

  const handleRemoveAvatar = async () => {
    try {
      await removeAvatar()
      toast('Avatar removed.', 'info')
    } catch (err) {
      toast(
        err instanceof Error ? err.message : 'Failed to remove avatar.',
        'error',
      )
    }
  }

  // ── Loading skeleton ──────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 animate-fade-in">
        <ProfilePageSkeleton />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4 text-slate-400">
        <UserCircle2 className="size-12 opacity-30" />
        <p>Profile not found.</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 sm:py-12 animate-fade-in">
      <h1 className="text-2xl font-bold text-slate-100 mb-6">Your Profile</h1>

      <div className="flex flex-col gap-6">
        {/* ── Avatar Card ── */}
        <Card>
          <Card.Body className="flex flex-col items-center py-8">
            <AvatarUploader
              currentUrl={profile.avatar_url}
              username={profile.username}
              isUploading={isUploadingAvatar}
              isRemoving={isRemovingAvatar}
              onUpload={handleUploadAvatar}
              onRemove={handleRemoveAvatar}
            />
          </Card.Body>
        </Card>

        {/* ── Info Card ── */}
        <Card>
          <Card.Header>
            <h2 className="text-base font-semibold text-slate-100">Account Details</h2>
            <p className="text-sm text-slate-400 mt-0.5">
              Update your username, display name, and bio.
            </p>
          </Card.Header>
          <Card.Body>
            {isSaving && (
              <div className="flex items-center gap-2 mb-4 text-sm text-brand-400">
                <Spinner size="sm" />
                Saving…
              </div>
            )}
            <ProfileForm
              profile={profile}
              isSaving={isSaving}
              onSave={handleSave}
              onDirtyChange={setIsDirty}
              checkUsernameAvailable={checkUsernameAvailable}
            />
          </Card.Body>
        </Card>

        {/* ── Trésorerie ENGEI (Yen Wallet & Admin Controls) ── */}
        <Card className="border-gold-500/30 bg-surface-800/90">
          <Card.Header>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <Coins className="size-4 text-gold-400" aria-hidden="true" />
                <h2 className="text-base font-semibold text-slate-100">
                  Trésorerie ENGEI — Portefeuille Yen (¥)
                </h2>
              </div>
              {profile.clan_title && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-brand-500/15 border border-brand-500/30 text-brand-300">
                  {profile.clan_title}
                </span>
              )}
            </div>
          </Card.Header>
          <Card.Body className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-3 p-3 rounded-xl bg-surface-900/80 border border-surface-700">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400">Solde disponible</p>
                <p className="text-2xl font-mono font-extrabold text-gold-300">
                  {formatYen(profile.yen_balance ?? DEFAULT_YEN_BALANCE)}
                </p>
              </div>
              {profile.is_admin && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-500/20 border border-brand-500/40 text-brand-300 text-xs font-bold">
                  <Shield className="size-3.5" aria-hidden="true" />
                  Admin · ¥ Illimités (∞ ¥)
                </span>
              )}
            </div>

            {/* ── Envoyer des Yens (Virement ENGEI P2P) ── */}
            <div className="space-y-3 pt-2 border-t border-surface-700/70">
              <p className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                Envoyer des Yens (¥) — Virement ENGEI
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <select
                  aria-label="Destinataire du virement"
                  value={transferRecipientId}
                  onChange={(e) => setTransferRecipientId(e.target.value)}
                  className="px-2.5 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-xs text-slate-100"
                >
                  {transferRecipients.length === 0 ? (
                    <option value="">Aucun autre joueur</option>
                  ) : (
                    transferRecipients.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.display_name ?? p.username} (@{p.username})
                      </option>
                    ))
                  )}
                </select>
                <input
                  type="number"
                  min={1}
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  aria-label="Montant du virement en ¥"
                  placeholder="Montant ¥"
                  className="px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-sm font-mono text-slate-100"
                />
                <input
                  type="text"
                  maxLength={140}
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  aria-label="Note de virement"
                  placeholder="Note (optionnelle)"
                  className="px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-xs text-slate-100"
                />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Button
                  type="button"
                  size="sm"
                  variant="primary"
                  isLoading={isTransferring}
                  disabled={!transferRecipientId}
                  onClick={() => void handleTransferYen()}
                  leftIcon={<Send className="size-3.5" />}
                >
                  Envoyer des Yens
                </Button>
              </div>

              {recentTransactions.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                    Historique récent
                  </p>
                  <ul className="space-y-1 text-xs">
                    {recentTransactions.map((tx) => {
                      const isIncoming = tx.recipient_id === profile.id
                      const label =
                        tx.transaction_type === 'shop_purchase'
                          ? tx.note ?? 'Achat Boutique ENGEI'
                          : isIncoming
                            ? `Reçu${tx.note ? ` · ${tx.note}` : ''}`
                            : `Envoyé${tx.note ? ` · ${tx.note}` : ''}`
                      return (
                        <li
                          key={tx.id}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-surface-900/70 border border-surface-700/70"
                        >
                          <span className="text-slate-300 truncate">{label}</span>
                          <span
                            className={
                              isIncoming
                                ? 'font-mono font-bold text-emerald-300 shrink-0'
                                : 'font-mono font-bold text-amber-300 shrink-0'
                            }
                          >
                            {isIncoming ? '+' : '-'}
                            {formatYen(tx.amount)}
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}
            </div>

            {(profile.is_admin ||
              resolveUserPermissions(profile).can_create_accounts ||
              resolveUserPermissions(profile).can_grant_themes) && (
              <div className="space-y-4 pt-2 border-t border-surface-700/70">
                {profile.is_admin && (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                      Privilèges Trésorier (Admin)
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={1}
                        value={grantAmount}
                        onChange={(e) => setGrantAmount(e.target.value)}
                        aria-label="Montant en ¥ à créditer"
                        className="w-32 px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-sm font-mono text-slate-100"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        isLoading={isGranting}
                        onClick={() => void handleAdminGrant(profile.id, 'votre compte')}
                        leftIcon={<PlusCircle className="size-3.5" />}
                      >
                        Créditer mon solde
                      </Button>
                      {profile.id !== DEMO_GUEST_ID && (
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          isLoading={isGranting}
                          onClick={() => void handleAdminGrant(DEMO_GUEST_ID, 'Sam Chen')}
                        >
                          Créditer Sam Chen
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Admin Account Creation Form */}
                {resolveUserPermissions(profile).can_create_accounts && (
                  <form
                    onSubmit={(e) => void handleCreateAccount(e)}
                    className="space-y-3 pt-2 border-t border-surface-700/70"
                  >
                    <div className="flex items-center gap-2">
                      <UserPlus className="size-4 text-gold-400" aria-hidden="true" />
                      <p className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                        Créer un compte utilisateur (Admin)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <input
                        type="text"
                        required
                        value={newUsername}
                        onChange={(e) => setNewUsername(e.target.value)}
                        placeholder="Identifiant (ex: kirari_bami)"
                        aria-label="Nouvel identifiant utilisateur"
                        className="px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-xs text-slate-100"
                      />
                      <input
                        type="text"
                        value={newDisplayName}
                        onChange={(e) => setNewDisplayName(e.target.value)}
                        placeholder="Nom affiché (ex: Kirari Momobami)"
                        aria-label="Nom affiché du nouveau compte"
                        className="px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-xs text-slate-100"
                      />
                      <input
                        type="email"
                        required
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="E-mail (ex: kirari@engei.local)"
                        aria-label="E-mail du nouveau compte"
                        className="px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-xs text-slate-100"
                      />
                      <input
                        type="password"
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mot de passe / PIN"
                        aria-label="Mot de passe du nouveau compte"
                        className="px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-xs text-slate-100"
                      />
                      <input
                        type="number"
                        min={0}
                        value={newYenBalance}
                        onChange={(e) => setNewYenBalance(e.target.value)}
                        aria-label="Solde initial en ¥"
                        placeholder="Solde initial ¥"
                        className="px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-xs font-mono text-slate-100"
                      />
                      <select
                        aria-label="Clan / Titre du nouveau compte"
                        value={newClanTitle}
                        onChange={(e) => setNewClanTitle(e.target.value)}
                        className="px-3 py-1.5 rounded-btn bg-surface-900 border border-surface-600 text-xs text-slate-100"
                      >
                        <option value="Clan Momobami">Clan Momobami</option>
                        <option value="Clan Jabami">Clan Jabami</option>
                        <option value="Clan Obami">Clan Obami</option>
                        <option value="Clan Sōbami">Clan Sōbami</option>
                        <option value="Clan Totobami">Clan Totobami</option>
                        <option value="Académie UA">Académie UA</option>
                        <option value="Académie Engei">Académie Engei</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 bg-surface-900/60 p-3 rounded-xl border border-surface-700/70">
                      <label className="inline-flex items-center gap-2 font-semibold text-gold-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newIsAdmin}
                          onChange={(e) => {
                            const checked = e.target.checked
                            setNewIsAdmin(checked)
                            setNewPermissions({
                              can_create_accounts: checked,
                              can_grant_themes: checked,
                              can_set_custom_stakes: checked,
                              unlimited_yen: checked,
                            })
                          }}
                        />
                        Admin complet
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newUnlockAll}
                          onChange={(e) => setNewUnlockAll(e.target.checked)}
                        />
                        Débloquer tous les thèmes
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.can_create_accounts}
                          onChange={(e) =>
                            setNewPermissions((p) => ({ ...p, can_create_accounts: e.target.checked }))
                          }
                        />
                        Peut créer des comptes
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.can_grant_themes}
                          onChange={(e) =>
                            setNewPermissions((p) => ({ ...p, can_grant_themes: e.target.checked }))
                          }
                        />
                        Peut accorder des thèmes
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.can_set_custom_stakes}
                          onChange={(e) =>
                            setNewPermissions((p) => ({ ...p, can_set_custom_stakes: e.target.checked }))
                          }
                        />
                        Mises personnalisées (¥)
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.unlimited_yen}
                          onChange={(e) =>
                            setNewPermissions((p) => ({ ...p, unlimited_yen: e.target.checked }))
                          }
                        />
                        Yens illimités (∞ ¥)
                      </label>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Button
                        type="submit"
                        size="sm"
                        variant="primary"
                        isLoading={isCreatingAccount}
                        leftIcon={<UserPlus className="size-3.5" />}
                      >
                        Créer le compte
                      </Button>

                      {adminTargets.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {adminTargets
                            .filter((t) => t.id !== profile.id)
                            .slice(0, 4)
                            .map((acc) => (
                              <Button
                                key={acc.id}
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  switchActiveDemoAccount(acc.id)
                                  void refreshProfile()
                                  toast(`Connecté en tant que ${acc.display_name ?? acc.username}`, 'info')
                                }}
                                leftIcon={<ArrowRightLeft className="size-3" />}
                              >
                                Basculer ({acc.username})
                              </Button>
                            ))}
                        </div>
                      )}
                    </div>
                  </form>
                )}

                {/* Admin Theme Access Manager */}
                {resolveUserPermissions(profile).can_grant_themes && adminTargets.length > 0 && (
                  <div className="space-y-2.5 pt-2 border-t border-surface-700/70">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gold-400 uppercase tracking-wider">
                        Gestion des Thèmes Débloquables (Admin)
                      </p>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label="Sélectionner un joueur pour gérer ses thèmes"
                          value={selectedTargetId}
                          onChange={(e) => setSelectedTargetId(e.target.value)}
                          className="px-2.5 py-1 rounded-btn bg-surface-900 border border-surface-600 text-xs text-slate-100"
                        >
                          {adminTargets.map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.display_name ?? t.username} (@{t.username})
                            </option>
                          ))}
                        </select>
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          isLoading={isTogglingTheme}
                          onClick={() => void handleUnlockAllForTarget()}
                          leftIcon={<LockOpen className="size-3.5" />}
                        >
                          Tout débloquer
                        </Button>
                      </div>
                    </div>

                    {selectedTarget && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SPECIAL_UNLOCKABLE_THEMES.map((item) => {
                          const unlocked =
                            Boolean(selectedTarget.is_admin) ||
                            (Array.isArray(selectedTarget.unlocked_themes) &&
                              selectedTarget.unlocked_themes.includes(item.id))
                          return (
                            <button
                              key={item.id}
                              type="button"
                              disabled={isTogglingTheme || Boolean(selectedTarget.is_admin)}
                              onClick={() => void handleToggleUnlockTheme(item.id, unlocked)}
                              className="flex items-center justify-between gap-2 px-3 py-2 rounded-btn border border-surface-700 bg-surface-900/70 hover:border-gold-400/60 text-left text-xs transition-colors cursor-pointer"
                            >
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-200 truncate">{item.name}</p>
                                <p className="text-[10px] text-slate-400">{item.category}</p>
                              </div>
                              <span
                                className={
                                  unlocked
                                    ? 'inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-semibold shrink-0'
                                    : 'inline-flex items-center gap-1 px-2 py-0.5 rounded bg-surface-700 text-slate-400 shrink-0'
                                }
                              >
                                {unlocked ? (
                                  <>
                                    <LockOpen className="size-3" /> Débloqué
                                  </>
                                ) : (
                                  <>
                                    <Lock className="size-3" /> Verrouillé
                                  </>
                                )}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card.Body>
        </Card>

        {/* ── Player-Bound Card Themes ── */}
        <CardThemeSelector mode="inline" />

        {/* ── Account info (read-only) ── */}
        <Card>
          <Card.Body className="flex flex-col gap-2">
            <h2 className="text-sm font-medium text-slate-300 mb-1">Account</h2>
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-400">Member since</span>
              <span className="text-slate-200">
                {new Date(profile.created_at).toLocaleDateString('en-US', {
                  year: 'numeric', month: 'long', day: 'numeric',
                })}
              </span>
            </div>
          </Card.Body>
        </Card>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Skeleton
// ─────────────────────────────────────────────

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div
      className={`rounded bg-surface-700 animate-pulse ${className ?? ''}`}
      aria-hidden="true"
    />
  )
}

function ProfilePageSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <Card.Body className="flex flex-col items-center py-8 gap-4">
          <SkeletonBox className="size-[120px] sm:size-[160px] rounded-full" />
          <SkeletonBox className="h-8 w-40" />
        </Card.Body>
      </Card>
      <Card>
        <Card.Header>
          <SkeletonBox className="h-5 w-32" />
        </Card.Header>
        <Card.Body className="flex flex-col gap-4">
          <SkeletonBox className="h-10" />
          <SkeletonBox className="h-10" />
          <SkeletonBox className="h-20" />
          <SkeletonBox className="h-10 w-32" />
        </Card.Body>
      </Card>
    </div>
  )
}
