import type { Suit } from '../deck'

/**
 * Legacy unified theme ID + separate Player-Bound Front & Back theme IDs.
 */
export type CardFrontThemeId = 'classic' | 'royal-fantasy' | 'midnight-neon' | 'minimalist'
export type CardBackThemeId =
  | 'engei-crimson'
  | 'bami-gold'
  | 'midnight-neon'
  | 'obsidian-minimalist'

// Legacy alias preserved for backward compatibility
export type CardThemeId = CardFrontThemeId

export interface CardFrontThemeConfig {
  id: CardFrontThemeId
  name: string
  description: string
  previewSwatches: [string, string, string]
  faceContainerClass: string
  suitColorClass: Record<Suit, string>
  courtBadgeClass: string
  playableRingClass: string
  accentTextClass: string
}

export interface CardBackThemeConfig {
  id: CardBackThemeId
  name: string
  description: string
  previewSwatches: [string, string]
  backContainerClass: string
  backPatternStyle: Record<string, string>
  backEmblemColor: string
  emblemSymbol: string
}

export interface CardThemeConfig
  extends CardFrontThemeConfig,
    Omit<CardBackThemeConfig, 'id' | 'previewSwatches' | 'name' | 'description'> {
  id: CardFrontThemeId
  previewSwatches: [string, string, string]
}

export const CARD_FRONT_THEMES: Record<CardFrontThemeId, CardFrontThemeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classique Académie',
    description: 'Ivoire satiné avec enseignes cramoisies et encre sombre',
    previewSwatches: ['#fffdf7', '#dc2626', '#1e1b4b'],
    faceContainerClass:
      'bg-[#fffdf7] text-slate-900 border-stone-300 shadow-[0_6px_18px_rgba(0,0,0,0.4)]',
    suitColorClass: {
      hearts: 'text-red-600',
      diamonds: 'text-red-600',
      spades: 'text-slate-900',
      clubs: 'text-slate-900',
    },
    courtBadgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    playableRingClass: 'ring-2 ring-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)]',
    accentTextClass: 'text-indigo-900',
  },

  'royal-fantasy': {
    id: 'royal-fantasy',
    name: 'Royal Gold',
    description: 'Parchemin doré du Cercle Bami avec blasons joyaux',
    previewSwatches: ['#fef3c7', '#b45309', '#7f1d1d'],
    faceContainerClass:
      'bg-gradient-to-br from-amber-50 via-amber-100/95 to-orange-100 text-stone-900 border-amber-500 shadow-[0_6px_20px_rgba(180,83,9,0.35)]',
    suitColorClass: {
      hearts: 'text-rose-700',
      diamonds: 'text-amber-700',
      spades: 'text-indigo-950',
      clubs: 'text-emerald-800',
    },
    courtBadgeClass: 'bg-amber-500/20 text-amber-900 border-amber-600/60',
    playableRingClass: 'ring-2 ring-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.55)]',
    accentTextClass: 'text-amber-900',
  },

  'midnight-neon': {
    id: 'midnight-neon',
    name: 'Cyber Tokyo',
    description: 'Obsidienne néon avec circuits cyan et magenta',
    previewSwatches: ['#090d16', '#f43f5e', '#22d3ee'],
    faceContainerClass:
      'bg-slate-950 text-slate-100 border-cyan-400/65 shadow-[0_0_20px_rgba(34,211,238,0.22)]',
    suitColorClass: {
      hearts: 'text-rose-400 drop-shadow-[0_0_6px_rgba(251,113,133,0.7)]',
      diamonds: 'text-fuchsia-400 drop-shadow-[0_0_6px_rgba(232,121,249,0.7)]',
      spades: 'text-cyan-300 drop-shadow-[0_0_6px_rgba(103,232,249,0.7)]',
      clubs: 'text-emerald-300 drop-shadow-[0_0_6px_rgba(110,231,183,0.7)]',
    },
    courtBadgeClass: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-400/50',
    playableRingClass: 'ring-2 ring-cyan-400 shadow-[0_0_22px_rgba(34,211,238,0.6)]',
    accentTextClass: 'text-cyan-300',
  },

  minimalist: {
    id: 'minimalist',
    name: 'Épuré',
    description: 'Cartes mates architecturales à contraste élevé',
    previewSwatches: ['#f8fafc', '#0f172a', '#dc2626'],
    faceContainerClass: 'bg-slate-50 text-slate-950 border-slate-200 shadow-sm',
    suitColorClass: {
      hearts: 'text-red-600',
      diamonds: 'text-red-600',
      spades: 'text-slate-950',
      clubs: 'text-slate-950',
    },
    courtBadgeClass: 'bg-slate-900 text-white border-slate-900',
    playableRingClass: 'ring-2 ring-red-500 shadow-[0_0_14px_rgba(220,38,38,0.45)]',
    accentTextClass: 'text-slate-900',
  },
}

export const CARD_BACK_THEMES: Record<CardBackThemeId, CardBackThemeConfig> = {
  'engei-crimson': {
    id: 'engei-crimson',
    name: 'Engei Crimson Velvet',
    description: 'Velours écarlate de l’Académie Engei orné d’un liseré d’or',
    previewSwatches: ['#7f1d1d', '#d4af37'],
    backContainerClass:
      'bg-gradient-to-br from-red-950 via-red-900 to-stone-950 border-amber-400/80 shadow-[0_6px_20px_rgba(185,28,28,0.4)]',
    backPatternStyle: {
      backgroundImage:
        'repeating-linear-gradient(45deg, rgba(212,175,55,0.14) 0px, rgba(212,175,55,0.14) 5px, transparent 5px, transparent 13px), repeating-linear-gradient(-45deg, rgba(212,175,55,0.1) 0px, rgba(212,175,55,0.1) 5px, transparent 5px, transparent 13px)',
    },
    backEmblemColor: 'text-amber-300',
    emblemSymbol: '宴',
  },

  'bami-gold': {
    id: 'bami-gold',
    name: 'Bami Gold Crest',
    description: 'Sceau doré du Conseil Bami sur laque d’obsidienne',
    previewSwatches: ['#18120a', '#fbbf24'],
    backContainerClass:
      'bg-gradient-to-br from-stone-950 via-amber-950 to-neutral-950 border-amber-300 shadow-[0_6px_22px_rgba(245,158,11,0.35)]',
    backPatternStyle: {
      backgroundImage:
        'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.28) 2px, transparent 2px)',
      backgroundSize: '14px 14px',
    },
    backEmblemColor: 'text-amber-200',
    emblemSymbol: '喰',
  },

  'midnight-neon': {
    id: 'midnight-neon',
    name: 'Midnight Neon',
    description: 'Grille cybernétique Tokyo sous néons cyan & magenta',
    previewSwatches: ['#070b14', '#22d3ee'],
    backContainerClass:
      'bg-[#070b14] border-fuchsia-500/75 shadow-[0_0_20px_rgba(217,70,239,0.28)]',
    backPatternStyle: {
      backgroundImage:
        'linear-gradient(rgba(34,211,238,0.18) 1px, transparent 1px), linear-gradient(90deg, rgba(217,70,239,0.18) 1px, transparent 1px)',
      backgroundSize: '12px 12px',
    },
    backEmblemColor: 'text-cyan-300',
    emblemSymbol: '♠',
  },

  'obsidian-minimalist': {
    id: 'obsidian-minimalist',
    name: 'Obsidian Minimalist',
    description: 'Matrice géométrique sobre sur fond noir mat',
    previewSwatches: ['#0f172a', '#94a3b8'],
    backContainerClass: 'bg-slate-900 border-slate-600 shadow-sm',
    backPatternStyle: {
      backgroundImage:
        'radial-gradient(rgba(148,163,184,0.25) 1.5px, transparent 1.5px)',
      backgroundSize: '10px 10px',
    },
    backEmblemColor: 'text-slate-300',
    emblemSymbol: '◆',
  },
}

export const CARD_FRONT_THEME_LIST: CardFrontThemeConfig[] = Object.values(CARD_FRONT_THEMES)
export const CARD_BACK_THEME_LIST: CardBackThemeConfig[] = Object.values(CARD_BACK_THEMES)

export function resolveFrontTheme(id?: string | null): CardFrontThemeConfig {
  if (id && id in CARD_FRONT_THEMES) {
    return CARD_FRONT_THEMES[id as CardFrontThemeId]
  }
  return CARD_FRONT_THEMES.classic
}

export function resolveBackTheme(id?: string | null): CardBackThemeConfig {
  if (id && id in CARD_BACK_THEMES) {
    return CARD_BACK_THEMES[id as CardBackThemeId]
  }
  if (id === 'royal-fantasy') return CARD_BACK_THEMES['bami-gold']
  if (id === 'minimalist') return CARD_BACK_THEMES['obsidian-minimalist']
  return CARD_BACK_THEMES['engei-crimson']
}

// Legacy exports kept for existing tests / consumers
export const CARD_THEMES: Record<CardFrontThemeId, CardThemeConfig> = {
  classic: { ...CARD_FRONT_THEMES.classic, ...CARD_BACK_THEMES['engei-crimson'], id: 'classic', previewSwatches: CARD_FRONT_THEMES.classic.previewSwatches },
  'midnight-neon': { ...CARD_FRONT_THEMES['midnight-neon'], ...CARD_BACK_THEMES['midnight-neon'], id: 'midnight-neon', previewSwatches: CARD_FRONT_THEMES['midnight-neon'].previewSwatches },
  'royal-fantasy': { ...CARD_FRONT_THEMES['royal-fantasy'], ...CARD_BACK_THEMES['bami-gold'], id: 'royal-fantasy', previewSwatches: CARD_FRONT_THEMES['royal-fantasy'].previewSwatches },
  minimalist: { ...CARD_FRONT_THEMES.minimalist, ...CARD_BACK_THEMES['obsidian-minimalist'], id: 'minimalist', previewSwatches: CARD_FRONT_THEMES.minimalist.previewSwatches },
}

export const CARD_THEME_LIST: CardThemeConfig[] = Object.values(CARD_THEMES)
