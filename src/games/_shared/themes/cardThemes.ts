import type { Suit } from '../deck'
import { UNDERTALE_TAROT_DECK_META } from './undertaleTarot'

export type StandardCardFrontThemeId =
  | 'classic'
  | 'royal-fantasy'
  | 'midnight-neon'
  | 'minimalist'
  | 'kinto-pay-to-win'

export type CardFrontThemeId = StandardCardFrontThemeId | 'undertale-tarot'

export type CardBackThemeId =
  | 'engei-crimson'
  | 'bami-gold'
  | 'midnight-neon'
  | 'obsidian-minimalist'
  | 'kinto-sovereign-back'

export type DiceThemeId =
  | 'obsidian-gold'
  | 'crimson-engei'
  | 'ivory-academy'
  | 'cyber-tokyo'
  | 'astral-crystal'
  | 'kinto-gacha-dice'

export type CoinThemeId =
  | 'classic-yen'
  | 'momobami-seal'
  | 'engei-scarlet'
  | 'railgun-coin'
  | 'eclipse-medal'
  | 'kinto-railgun-coin'

// Legacy alias preserved for backward compatibility
export type CardThemeId = CardFrontThemeId

export interface CardFrontThemeConfig {
  id: CardFrontThemeId
  name: string
  description: string
  previewSwatches: [string, string, string]
  unlockedByDefault: boolean
  priceYen: number
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
  unlockedByDefault: boolean
  priceYen: number
  backContainerClass: string
  backPatternStyle: Record<string, string>
  backEmblemColor: string
  emblemSymbol: string
}

export interface DiceThemeConfig {
  id: DiceThemeId
  name: string
  description: string
  previewSwatches: [string, string]
  unlockedByDefault: boolean
  priceYen: number
  tensFillClass: string
  unitsFillClass: string
  textColorClass: string
  glowColorClass: string
  ringBorderClass: string
}

export interface CoinThemeConfig {
  id: CoinThemeId
  name: string
  description: string
  previewSwatches: [string, string]
  unlockedByDefault: boolean
  priceYen: number
  headsGradientClass: string
  tailsGradientClass: string
  headsSymbol: string
  tailsSymbol: string
  rimColorClass: string
  glowClass: string
}

export interface CardThemeConfig
  extends CardFrontThemeConfig,
  Omit<CardBackThemeConfig, 'id' | 'previewSwatches' | 'name' | 'description' | 'unlockedByDefault' | 'priceYen'> {
  id: CardFrontThemeId
  previewSwatches: [string, string, string]
}

export const CARD_FRONT_THEMES: Record<StandardCardFrontThemeId, CardFrontThemeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classique Académie',
    description: 'Ivoire satiné avec enseignes cramoisies et figures royales illustrées',
    previewSwatches: ['#fffdf7', '#dc2626', '#1e1b4b'],
    unlockedByDefault: true,
    priceYen: 0,
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
    description: 'Parchemin doré du Cercle Bami avec blasons joyaux et figures de cour',
    previewSwatches: ['#fef3c7', '#b45309', '#7f1d1d'],
    unlockedByDefault: true,
    priceYen: 0,
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
    unlockedByDefault: false,
    priceYen: 1200,
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
    unlockedByDefault: true,
    priceYen: 0,
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

  'kinto-pay-to-win': {
    id: 'kinto-pay-to-win',
    name: 'Pay-To-Win Minimaliste',
    description: 'Collection Kinto Sōbami — obsidienne mate, filigrane or brossé et arcs 100¥',
    previewSwatches: ['#09090c', '#eab308', '#dc2626'],
    unlockedByDefault: false,
    priceYen: 1800,
    faceContainerClass:
      'bg-gradient-to-br from-[#09090c] via-[#121218] to-[#1a1510] text-amber-100 border-amber-400/80 shadow-[0_8px_26px_rgba(234,179,8,0.3)]',
    suitColorClass: {
      hearts: 'text-red-400 drop-shadow-[0_0_5px_rgba(248,113,113,0.45)]',
      diamonds: 'text-amber-300 drop-shadow-[0_0_5px_rgba(251,191,36,0.45)]',
      spades: 'text-amber-100',
      clubs: 'text-yellow-300',
    },
    courtBadgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/70',
    playableRingClass: 'ring-2 ring-amber-400 shadow-[0_0_24px_rgba(245,158,11,0.6)]',
    accentTextClass: 'text-amber-300',
  },
}

const TAROT_FALLBACK_FRONT: CardFrontThemeConfig = {
  id: 'undertale-tarot',
  name: UNDERTALE_TAROT_DECK_META.name,
  description: UNDERTALE_TAROT_DECK_META.description,
  previewSwatches: UNDERTALE_TAROT_DECK_META.previewSwatches,
  unlockedByDefault: false,
  priceYen: UNDERTALE_TAROT_DECK_META.priceYen,
  faceContainerClass:
    'bg-gradient-to-b from-[#141118] via-[#0a0a0e] to-[#17121b] text-amber-100 border-amber-400 shadow-[0_8px_24px_rgba(212,175,55,0.38)]',
  suitColorClass: {
    hearts: 'text-rose-400',
    diamonds: 'text-amber-300',
    spades: 'text-sky-200',
    clubs: 'text-emerald-300',
  },
  courtBadgeClass: 'bg-amber-500/25 text-amber-200 border-amber-400/70',
  playableRingClass: 'ring-2 ring-amber-300 shadow-[0_0_24px_rgba(251,191,36,0.65)]',
  accentTextClass: 'text-amber-300',
}

export const CARD_BACK_THEMES: Record<CardBackThemeId, CardBackThemeConfig> = {
  'engei-crimson': {
    id: 'engei-crimson',
    name: 'Engei Crimson Velvet',
    description: 'Velours écarlate de l’Académie Engei orné d’un liseré d’or',
    previewSwatches: ['#7f1d1d', '#d4af37'],
    unlockedByDefault: true,
    priceYen: 0,
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
    unlockedByDefault: true,
    priceYen: 0,
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
    unlockedByDefault: false,
    priceYen: 1100,
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
    unlockedByDefault: true,
    priceYen: 0,
    backContainerClass: 'bg-slate-900 border-slate-600 shadow-sm',
    backPatternStyle: {
      backgroundImage:
        'radial-gradient(rgba(148,163,184,0.25) 1.5px, transparent 1.5px)',
      backgroundSize: '10px 10px',
    },
    backEmblemColor: 'text-slate-300',
    emblemSymbol: '◆',
  },

  'kinto-sovereign-back': {
    id: 'kinto-sovereign-back',
    name: 'Emblème Sōbami',
    description: 'Dos signature Kinto Sōbami — velours noir et géométrie dorée 100¥',
    previewSwatches: ['#070709', '#f59e0b'],
    unlockedByDefault: false,
    priceYen: 1500,
    backContainerClass:
      'bg-gradient-to-br from-[#070709] via-[#13100a] to-black border-amber-400 shadow-[0_6px_26px_rgba(245,158,11,0.4)]',
    backPatternStyle: {
      backgroundImage:
        'radial-gradient(circle at 50% 50%, rgba(234,179,8,0.22) 1px, transparent 1px), repeating-linear-gradient(60deg, rgba(234,179,8,0.12) 0px, rgba(234,179,8,0.12) 1px, transparent 1px, transparent 11px)',
      backgroundSize: '14px 14px, 22px 22px',
    },
    backEmblemColor: 'text-amber-300',
    emblemSymbol: '¥',
  },
}

export const DICE_THEMES: Record<DiceThemeId, DiceThemeConfig> = {
  'obsidian-gold': {
    id: 'obsidian-gold',
    name: 'Obsidienne & Or',
    description: 'Polyèdres en obsidienne gravés à l’or fin',
    previewSwatches: ['#18181b', '#eab308'],
    unlockedByDefault: true,
    priceYen: 0,
    tensFillClass: 'fill-stone-950 stroke-amber-400',
    unitsFillClass: 'fill-neutral-900 stroke-yellow-300',
    textColorClass: 'text-amber-200',
    glowColorClass: 'drop-shadow-[0_6px_16px_rgba(234,179,8,0.45)]',
    ringBorderClass: 'border-amber-400',
  },

  'crimson-engei': {
    id: 'crimson-engei',
    name: 'Rubis Écarlate ENGEI',
    description: 'Dés translucides carmin sertis d’or du Cercle',
    previewSwatches: ['#991b1b', '#fde68a'],
    unlockedByDefault: true,
    priceYen: 0,
    tensFillClass: 'fill-red-950 stroke-red-400',
    unitsFillClass: 'fill-rose-950 stroke-amber-300',
    textColorClass: 'text-rose-100',
    glowColorClass: 'drop-shadow-[0_6px_16px_rgba(220,38,38,0.5)]',
    ringBorderClass: 'border-red-400',
  },

  'ivory-academy': {
    id: 'ivory-academy',
    name: 'Ivoire Académie',
    description: 'Dés d’ivoire classique à chiffres laqués ébène',
    previewSwatches: ['#fefce8', '#44403c'],
    unlockedByDefault: true,
    priceYen: 0,
    tensFillClass: 'fill-amber-50 stroke-stone-500',
    unitsFillClass: 'fill-stone-100 stroke-amber-600',
    textColorClass: 'text-stone-900',
    glowColorClass: 'drop-shadow-[0_6px_14px_rgba(120,113,108,0.4)]',
    ringBorderClass: 'border-stone-400',
  },

  'cyber-tokyo': {
    id: 'cyber-tokyo',
    name: 'Néon Cyber Tokyo',
    description: 'Néon cyan & magenta haute tension',
    previewSwatches: ['#090d16', '#22d3ee'],
    unlockedByDefault: false,
    priceYen: 900,
    tensFillClass: 'fill-slate-950 stroke-cyan-400',
    unitsFillClass: 'fill-slate-950 stroke-fuchsia-400',
    textColorClass: 'text-cyan-200',
    glowColorClass: 'drop-shadow-[0_6px_18px_rgba(34,211,238,0.55)]',
    ringBorderClass: 'border-cyan-400',
  },

  'astral-crystal': {
    id: 'astral-crystal',
    name: 'Cristal Astral',
    description: 'Éclats de quartz stellaire aux reflets améthyste',
    previewSwatches: ['#312e81', '#c084fc'],
    unlockedByDefault: false,
    priceYen: 1400,
    tensFillClass: 'fill-indigo-950 stroke-violet-300',
    unitsFillClass: 'fill-purple-950 stroke-sky-300',
    textColorClass: 'text-violet-100',
    glowColorClass: 'drop-shadow-[0_6px_20px_rgba(167,139,250,0.6)]',
    ringBorderClass: 'border-violet-300',
  },

  'kinto-gacha-dice': {
    id: 'kinto-gacha-dice',
    name: 'Dé Pay-To-Win (600¥)',
    description: 'Dé doré enchanté de Kinto Sōbami — arêtes d’or électrique et reflets carmin',
    previewSwatches: ['#0a0a0e', '#f59e0b'],
    unlockedByDefault: false,
    priceYen: 600,
    tensFillClass: 'fill-[#120e07] stroke-amber-400',
    unitsFillClass: 'fill-amber-950 stroke-red-400',
    textColorClass: 'text-amber-300',
    glowColorClass: 'drop-shadow-[0_6px_22px_rgba(245,158,11,0.68)]',
    ringBorderClass: 'border-amber-400',
  },
}

export const COIN_THEMES: Record<CoinThemeId, CoinThemeConfig> = {
  'classic-yen': {
    id: 'classic-yen',
    name: 'Pièce Yen Classique',
    description: 'Pièce dorée frappée du symbole ¥',
    previewSwatches: ['#f59e0b', '#fef3c7'],
    unlockedByDefault: true,
    priceYen: 0,
    headsGradientClass: 'from-amber-300 via-yellow-500 to-amber-700 border-amber-200 text-amber-950',
    tailsGradientClass: 'from-slate-200 via-slate-400 to-slate-600 border-slate-100 text-slate-950',
    headsSymbol: '¥',
    tailsSymbol: '円',
    rimColorClass: 'border-amber-300',
    glowClass: 'shadow-[0_10px_30px_rgba(245,158,11,0.45)]',
  },

  'momobami-seal': {
    id: 'momobami-seal',
    name: "Sceau d'Or Momobami",
    description: 'Médaille officielle du clan dirigeant',
    previewSwatches: ['#b45309', '#fde68a'],
    unlockedByDefault: true,
    priceYen: 0,
    headsGradientClass: 'from-yellow-200 via-amber-400 to-yellow-800 border-amber-100 text-stone-950',
    tailsGradientClass: 'from-stone-800 via-amber-950 to-black border-amber-400 text-amber-300',
    headsSymbol: '喰',
    tailsSymbol: '♛',
    rimColorClass: 'border-amber-400',
    glowClass: 'shadow-[0_10px_32px_rgba(251,191,36,0.5)]',
  },

  'engei-scarlet': {
    id: 'engei-scarlet',
    name: 'Jeton Écarlate ENGEI',
    description: 'Jeton VIP laqué rouge et or du cercle souterrain',
    previewSwatches: ['#dc2626', '#fbbf24'],
    unlockedByDefault: false,
    priceYen: 800,
    headsGradientClass: 'from-red-500 via-red-700 to-red-950 border-amber-300 text-amber-200',
    tailsGradientClass: 'from-stone-900 via-red-950 to-black border-red-400 text-rose-200',
    headsSymbol: '宴',
    tailsSymbol: '芸',
    rimColorClass: 'border-red-400',
    glowClass: 'shadow-[0_10px_32px_rgba(220,38,38,0.5)]',
  },

  'railgun-coin': {
    id: 'railgun-coin',
    name: 'Pièce Railgun Électrique',
    description: 'Jeton d’arcade chargé d’arcs électromagnétiques cyan',
    previewSwatches: ['#06b6d4', '#f97316'],
    unlockedByDefault: false,
    priceYen: 1100,
    headsGradientClass: 'from-cyan-300 via-sky-500 to-blue-800 border-cyan-100 text-slate-950',
    tailsGradientClass: 'from-amber-400 via-orange-600 to-slate-900 border-cyan-300 text-white',
    headsSymbol: '⚡',
    tailsSymbol: '★',
    rimColorClass: 'border-cyan-300',
    glowClass: 'shadow-[0_10px_34px_rgba(34,211,238,0.6)]',
  },

  'eclipse-medal': {
    id: 'eclipse-medal',
    name: 'Médaille Éclipse',
    description: 'Alliage astral solaire et lunaire',
    previewSwatches: ['#4c1d95', '#fde68a'],
    unlockedByDefault: false,
    priceYen: 1300,
    headsGradientClass: 'from-amber-200 via-orange-400 to-purple-900 border-amber-200 text-stone-950',
    tailsGradientClass: 'from-indigo-950 via-purple-900 to-slate-950 border-violet-300 text-violet-200',
    headsSymbol: '☀',
    tailsSymbol: '☾',
    rimColorClass: 'border-violet-300',
    glowClass: 'shadow-[0_10px_34px_rgba(167,139,250,0.55)]',
  },

  'kinto-railgun-coin': {
    id: 'kinto-railgun-coin',
    name: 'Pièce Railgun (100¥)',
    description: 'Pièce de 100¥ de Kinto Sōbami propulsée au pouce avec arcs or et écarlate',
    previewSwatches: ['#fbbf24', '#ef4444'],
    unlockedByDefault: false,
    priceYen: 1000,
    headsGradientClass:
      'from-amber-200 via-orange-500 to-red-800 border-amber-200 text-stone-950',
    tailsGradientClass:
      'from-stone-950 via-amber-900 to-red-950 border-amber-400 text-amber-200',
    headsSymbol: '100¥',
    tailsSymbol: '百円',
    rimColorClass: 'border-amber-400',
    glowClass: 'shadow-[0_10px_36px_rgba(249,115,22,0.68)]',
  },
}

// Standard 52-card front list explicitly excludes 'undertale-tarot' (Tarot deck only)
export const CARD_FRONT_THEME_LIST: CardFrontThemeConfig[] = Object.values(CARD_FRONT_THEMES)
export const STANDARD_CARD_FRONT_THEMES = CARD_FRONT_THEME_LIST
export const CARD_BACK_THEME_LIST: CardBackThemeConfig[] = Object.values(CARD_BACK_THEMES)
export const DICE_THEME_LIST: DiceThemeConfig[] = Object.values(DICE_THEMES)
export const COIN_THEME_LIST: CoinThemeConfig[] = Object.values(COIN_THEMES)

export const DEFAULT_UNLOCKED_THEMES: string[] = [
  ...CARD_FRONT_THEME_LIST.filter((t) => t.unlockedByDefault).map((t) => t.id),
  ...CARD_BACK_THEME_LIST.filter((t) => t.unlockedByDefault).map((t) => t.id),
  ...DICE_THEME_LIST.filter((t) => t.unlockedByDefault).map((t) => t.id),
  ...COIN_THEME_LIST.filter((t) => t.unlockedByDefault).map((t) => t.id),
]

export interface UnlockableThemeMeta {
  id: string
  category: 'Face de carte' | 'Dos de carte' | 'Dés' | 'Pièce' | 'Jeu de Tarot'
  name: string
  priceYen: number
}

export const SPECIAL_UNLOCKABLE_THEMES: UnlockableThemeMeta[] = [
  { id: 'undertale-tarot', category: 'Jeu de Tarot', name: UNDERTALE_TAROT_DECK_META.name, priceYen: UNDERTALE_TAROT_DECK_META.priceYen },
  { id: 'kinto-pay-to-win', category: 'Face de carte', name: 'Pay-To-Win Minimaliste (Kinto)', priceYen: 1800 },
  { id: 'kinto-sovereign-back', category: 'Dos de carte', name: 'Emblème Sōbami (Kinto)', priceYen: 1500 },
  { id: 'kinto-gacha-dice', category: 'Dés', name: 'Dé Pay-To-Win (600¥)', priceYen: 600 },
  { id: 'kinto-railgun-coin', category: 'Pièce', name: 'Pièce Railgun (100¥)', priceYen: 1000 },
  { id: 'midnight-neon', category: 'Face de carte', name: 'Cyber Tokyo', priceYen: 1200 },
  { id: 'midnight-neon', category: 'Dos de carte', name: 'Midnight Neon', priceYen: 1100 },
  { id: 'cyber-tokyo', category: 'Dés', name: 'Néon Cyber Tokyo', priceYen: 900 },
  { id: 'astral-crystal', category: 'Dés', name: 'Cristal Astral', priceYen: 1400 },
  { id: 'engei-scarlet', category: 'Pièce', name: 'Jeton Écarlate ENGEI', priceYen: 800 },
  { id: 'railgun-coin', category: 'Pièce', name: 'Pièce Railgun Électrique', priceYen: 1100 },
  { id: 'eclipse-medal', category: 'Pièce', name: 'Médaille Éclipse', priceYen: 1300 },
]

export function getThemePriceYen(themeId: string): number {
  if (themeId === 'undertale-tarot') return UNDERTALE_TAROT_DECK_META.priceYen
  if (themeId in CARD_FRONT_THEMES) {
    return CARD_FRONT_THEMES[themeId as StandardCardFrontThemeId].priceYen
  }
  if (themeId in CARD_BACK_THEMES) {
    return CARD_BACK_THEMES[themeId as CardBackThemeId].priceYen
  }
  if (themeId in DICE_THEMES) {
    return DICE_THEMES[themeId as DiceThemeId].priceYen
  }
  if (themeId in COIN_THEMES) {
    return COIN_THEMES[themeId as CoinThemeId].priceYen
  }
  const meta = SPECIAL_UNLOCKABLE_THEMES.find((m) => m.id === themeId)
  return meta?.priceYen ?? 0
}

export function isThemeUnlocked(
  themeId: string,
  unlockedByDefault: boolean,
  profile?: { is_admin?: boolean; unlocked_themes?: string[] } | null,
): boolean {
  if (unlockedByDefault) return true
  if (!profile) return true
  if (profile.is_admin) return true
  return Array.isArray(profile.unlocked_themes) && profile.unlocked_themes.includes(themeId)
}

export function resolveFrontTheme(id?: string | null): CardFrontThemeConfig {
  if (id === 'undertale-tarot') return TAROT_FALLBACK_FRONT
  if (id && id in CARD_FRONT_THEMES) {
    return CARD_FRONT_THEMES[id as StandardCardFrontThemeId]
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

export function resolveDiceTheme(id?: string | null): DiceThemeConfig {
  if (id && id in DICE_THEMES) {
    return DICE_THEMES[id as DiceThemeId]
  }
  return DICE_THEMES['obsidian-gold']
}

export function resolveCoinTheme(id?: string | null): CoinThemeConfig {
  if (id && id in COIN_THEMES) {
    return COIN_THEMES[id as CoinThemeId]
  }
  return COIN_THEMES['classic-yen']
}

// Legacy exports preserved for standard 52-card decks (excludes undertale-tarot)
export const CARD_THEMES: Record<StandardCardFrontThemeId, CardThemeConfig> = {
  classic: {
    ...CARD_FRONT_THEMES.classic,
    ...CARD_BACK_THEMES['engei-crimson'],
    id: 'classic',
    previewSwatches: CARD_FRONT_THEMES.classic.previewSwatches,
  },
  'midnight-neon': {
    ...CARD_FRONT_THEMES['midnight-neon'],
    ...CARD_BACK_THEMES['midnight-neon'],
    id: 'midnight-neon',
    name: CARD_FRONT_THEMES['midnight-neon'].name,
    description: CARD_FRONT_THEMES['midnight-neon'].description,
    previewSwatches: CARD_FRONT_THEMES['midnight-neon'].previewSwatches,
  },
  'royal-fantasy': {
    ...CARD_FRONT_THEMES['royal-fantasy'],
    ...CARD_BACK_THEMES['bami-gold'],
    id: 'royal-fantasy',
    previewSwatches: CARD_FRONT_THEMES['royal-fantasy'].previewSwatches,
  },
  minimalist: {
    ...CARD_FRONT_THEMES.minimalist,
    ...CARD_BACK_THEMES['obsidian-minimalist'],
    id: 'minimalist',
    previewSwatches: CARD_FRONT_THEMES.minimalist.previewSwatches,
  },
  'kinto-pay-to-win': {
    ...CARD_FRONT_THEMES['kinto-pay-to-win'],
    ...CARD_BACK_THEMES['kinto-sovereign-back'],
    id: 'kinto-pay-to-win',
    name: CARD_FRONT_THEMES['kinto-pay-to-win'].name,
    description: CARD_FRONT_THEMES['kinto-pay-to-win'].description,
    previewSwatches: CARD_FRONT_THEMES['kinto-pay-to-win'].previewSwatches,
  },
}

export const CARD_THEME_LIST: CardThemeConfig[] = Object.values(CARD_THEMES)
