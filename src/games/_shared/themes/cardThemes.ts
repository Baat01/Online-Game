import type { Suit } from '../deck'

export type CardThemeId = 'classic' | 'midnight-neon' | 'royal-fantasy' | 'minimalist'

export interface CardThemeConfig {
  id: CardThemeId
  name: string
  description: string
  previewSwatches: [string, string, string]
  faceContainerClass: string
  backContainerClass: string
  backPatternStyle: Record<string, string>
  backEmblemColor: string
  suitColorClass: Record<Suit, string>
  courtBadgeClass: string
  playableRingClass: string
  accentTextClass: string
}

export const CARD_THEMES: Record<CardThemeId, CardThemeConfig> = {
  classic: {
    id: 'classic',
    name: 'Classic',
    description: 'Crisp ivory linen stock with crimson & charcoal pips',
    previewSwatches: ['#fffdf7', '#dc2626', '#312e81'],
    faceContainerClass:
      'bg-[#fffdf7] text-slate-900 border-stone-300 shadow-[0_6px_18px_rgba(0,0,0,0.35)]',
    backContainerClass:
      'bg-indigo-900 border-indigo-300/70 shadow-[0_6px_18px_rgba(0,0,0,0.45)]',
    backPatternStyle: {
      backgroundImage:
        'repeating-linear-gradient(45deg, rgba(255,255,255,0.12) 0px, rgba(255,255,255,0.12) 6px, transparent 6px, transparent 14px), repeating-linear-gradient(-45deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 6px, transparent 6px, transparent 14px)',
    },
    backEmblemColor: 'text-indigo-200',
    suitColorClass: {
      hearts: 'text-red-600',
      diamonds: 'text-red-600',
      spades: 'text-slate-900',
      clubs: 'text-slate-900',
    },
    courtBadgeClass: 'bg-amber-100 text-amber-900 border-amber-300',
    playableRingClass: 'ring-2 ring-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)]',
    accentTextClass: 'text-indigo-900',
  },

  'midnight-neon': {
    id: 'midnight-neon',
    name: 'Midnight Neon',
    description: 'Obsidian cyber-cards with glowing cyan & magenta circuits',
    previewSwatches: ['#090d16', '#f43f5e', '#22d3ee'],
    faceContainerClass:
      'bg-slate-950 text-slate-100 border-cyan-400/60 shadow-[0_0_20px_rgba(34,211,238,0.2)]',
    backContainerClass:
      'bg-[#070b14] border-fuchsia-500/70 shadow-[0_0_20px_rgba(217,70,239,0.28)]',
    backPatternStyle: {
      backgroundImage:
        'linear-gradient(rgba(34,211,238,0.16) 1px, transparent 1px), linear-gradient(90deg, rgba(217,70,239,0.16) 1px, transparent 1px)',
      backgroundSize: '12px 12px',
    },
    backEmblemColor: 'text-cyan-300',
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

  'royal-fantasy': {
    id: 'royal-fantasy',
    name: 'Royal Fantasy',
    description: 'Gilded parchment cards with arcane jewel-toned suit crests',
    previewSwatches: ['#fef3c7', '#b45309', '#7f1d1d'],
    faceContainerClass:
      'bg-gradient-to-br from-amber-50 via-amber-100/90 to-orange-100 text-stone-900 border-amber-500 shadow-[0_6px_20px_rgba(180,83,9,0.3)]',
    backContainerClass:
      'bg-gradient-to-br from-rose-950 via-red-900 to-amber-950 border-amber-400 shadow-[0_6px_20px_rgba(245,158,11,0.28)]',
    backPatternStyle: {
      backgroundImage:
        'radial-gradient(circle at 50% 50%, rgba(251,191,36,0.22) 2px, transparent 2px)',
      backgroundSize: '14px 14px',
    },
    backEmblemColor: 'text-amber-300',
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

  minimalist: {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Architectural matte cards with high-contrast geometric type',
    previewSwatches: ['#f8fafc', '#0f172a', '#f97316'],
    faceContainerClass:
      'bg-slate-50 text-slate-950 border-slate-200 shadow-sm',
    backContainerClass:
      'bg-slate-900 border-slate-700 shadow-sm',
    backPatternStyle: {
      backgroundImage:
        'radial-gradient(rgba(148,163,184,0.25) 1.5px, transparent 1.5px)',
      backgroundSize: '10px 10px',
    },
    backEmblemColor: 'text-slate-300',
    suitColorClass: {
      hearts: 'text-orange-600',
      diamonds: 'text-orange-600',
      spades: 'text-slate-950',
      clubs: 'text-slate-950',
    },
    courtBadgeClass: 'bg-slate-900 text-white border-slate-900',
    playableRingClass: 'ring-2 ring-orange-500 shadow-[0_0_14px_rgba(249,115,22,0.45)]',
    accentTextClass: 'text-slate-900',
  },
}

export const CARD_THEME_LIST: CardThemeConfig[] = Object.values(CARD_THEMES)
