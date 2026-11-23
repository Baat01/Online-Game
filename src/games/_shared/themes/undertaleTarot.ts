import type { Rank, Suit } from '../deck'

export interface TarotArcanum {
  number: number
  roman: string
  name: string
  arcanaTitle: string
  imagePath: string
  meaningUpright: string
  meaningReversed: string
}

export const UNDERTALE_TAROT_BACK_IMAGE = '/themes/undertale-tarot/back.jpg'

export const UNDERTALE_TAROT_DECK_META = {
  id: 'undertale-tarot' as const,
  name: 'Tarot Undertale — Arcanes Majeurs',
  description: 'Jeu complet des 22 Arcanes Majeurs illustrés haute définition (Tirage Tarot uniquement)',
  previewSwatches: ['#0a0a0e', '#d4af37', '#dc2626'] as [string, string, string],
  unlockedByDefault: false,
  priceYen: 2500,
}

export const UNDERTALE_TAROT_ARCANA: TarotArcanum[] = [
  {
    number: 0,
    roman: '0',
    name: 'Human',
    arcanaTitle: 'The Fool',
    imagePath: '/themes/undertale-tarot/0.jpg',
    meaningUpright: 'Nouveau départ, détermination pure et saut vers l’inconnu.',
    meaningReversed: 'Imprudence, hésitation devant la chute ou voie périlleuse.',
  },
  {
    number: 1,
    roman: 'I',
    name: 'Asriel',
    arcanaTitle: 'The Magician',
    imagePath: '/themes/undertale-tarot/1.jpg',
    meaningUpright: 'Potentiel créateur, espoir innocent et maîtrise des éléments.',
    meaningReversed: 'Illusion brisée, pouvoir mal canalisé ou nostalgie pesante.',
  },
  {
    number: 2,
    roman: 'II',
    name: 'Alphys',
    arcanaTitle: 'The High Priestess',
    imagePath: '/themes/undertale-tarot/2.jpg',
    meaningUpright: 'Savoir caché, observation silencieuse et secrets scientifiques.',
    meaningReversed: 'Doute de soi, secrets étouffants et isolement.',
  },
  {
    number: 3,
    roman: 'III',
    name: 'Toriel',
    arcanaTitle: 'The Empress',
    imagePath: '/themes/undertale-tarot/3.jpg',
    meaningUpright: 'Protection maternelle, générosité et refuge chaleureux.',
    meaningReversed: 'Surprotection, attachement au passé ou réticence au départ.',
  },
  {
    number: 4,
    roman: 'IV',
    name: 'Asgore',
    arcanaTitle: 'The Emperor',
    imagePath: '/themes/undertale-tarot/4.jpg',
    meaningUpright: 'Autorité souveraine, devoir lourd et stabilité royale.',
    meaningReversed: 'Fardeau écrasant, rigidité morale ou regret silencieux.',
  },
  {
    number: 5,
    roman: 'V',
    name: 'Papyrus',
    arcanaTitle: 'The Hierophant',
    imagePath: '/themes/undertale-tarot/5.jpg',
    meaningUpright: 'Honneur, tradition chevaleresque et enthousiasme inébranlable.',
    meaningReversed: 'Naïveté exploitée, dogmatisme ou quête d’approbation.',
  },
  {
    number: 6,
    roman: 'VI',
    name: 'Royal Guards',
    arcanaTitle: "L'Amoureux / The Lovers",
    imagePath: '/themes/undertale-tarot/6.jpg',
    meaningUpright: 'Deux armures scellées par un lien indéfectible et une confiance absolue.',
    meaningReversed: 'Hésitation affective, armure émotionnelle ou choix différé.',
  },
  {
    number: 7,
    roman: 'VII',
    name: 'The Undying',
    arcanaTitle: 'The Chariot',
    imagePath: '/themes/undertale-tarot/7.jpg',
    meaningUpright: 'Volonté indomptable, victoire par la persévérance héroïque.',
    meaningReversed: 'Acharnement aveugle ou bataille perdue d’avance.',
  },
  {
    number: 8,
    roman: 'VIII',
    name: 'Greater Dog',
    arcanaTitle: 'Strength',
    imagePath: '/themes/undertale-tarot/8.jpg',
    meaningUpright: 'Force tranquille, loyauté fidèle et cœur vaillant.',
    meaningReversed: 'Impulsivité, distraction ou force mal maîtrisée.',
  },
  {
    number: 9,
    roman: 'IX',
    name: 'Gerson',
    arcanaTitle: 'The Hermit',
    imagePath: '/themes/undertale-tarot/9.jpg',
    meaningUpright: 'Sagesse ancienne, recul lucide et mémoire des âges.',
    meaningReversed: 'Retrait excessif ou refus d’agir quand l’heure presse.',
  },
  {
    number: 10,
    roman: 'X',
    name: 'Temmie',
    arcanaTitle: 'La Roue de la Fortune / Wheel of Fortune',
    imagePath: '/themes/undertale-tarot/10.jpg',
    meaningUpright: 'Hasard favorable, opportunité inattendue et cycle prospère.',
    meaningReversed: 'Revers imprévu, caprice du sort ou précipitation.',
  },
  {
    number: 11,
    roman: 'XI',
    name: 'Undyne',
    arcanaTitle: 'Justice',
    imagePath: '/themes/undertale-tarot/11.jpg',
    meaningUpright: 'Droiture ardente, justice sans compromis et courage direct.',
    meaningReversed: 'Partialité, colère précipitée ou jugement trop sévère.',
  },
  {
    number: 12,
    roman: 'XII',
    name: 'Flowey',
    arcanaTitle: 'The Hanged Man',
    imagePath: '/themes/undertale-tarot/12.jpg',
    meaningUpright: 'Renversement de perspective, ruse et attente calculée.',
    meaningReversed: 'Stagnation amère, manipulation stérile ou piège refermé.',
  },
  {
    number: 13,
    roman: 'XIII',
    name: 'Absolute God of Hyperdeath',
    arcanaTitle: 'Death',
    imagePath: '/themes/undertale-tarot/13.jpg',
    meaningUpright: 'Métamorphose totale, fin d’une ère et renaissance absolue.',
    meaningReversed: 'Résistance au changement ou cycle qui se répète.',
  },
  {
    number: 14,
    roman: 'XIV',
    name: 'Muffet',
    arcanaTitle: 'Temperance',
    imagePath: '/themes/undertale-tarot/14.webp',
    meaningUpright: 'Équilibre des échanges, patience calculée et tisseur de liens.',
    meaningReversed: 'Avidité excessive ou accord déséquilibré.',
  },
  {
    number: 15,
    roman: 'XV',
    name: 'Chara',
    arcanaTitle: 'The Devil',
    imagePath: '/themes/undertale-tarot/15.webp',
    meaningUpright: 'Tentation du pouvoir absolu, pacte sombre et obsession.',
    meaningReversed: 'Libération des chaînes et refus de la corruption.',
  },
  {
    number: 16,
    roman: 'XVI',
    name: 'Omega Flowey',
    arcanaTitle: 'The Tower',
    imagePath: '/themes/undertale-tarot/16.webp',
    meaningUpright: 'Bouleversement soudain, chute des illusions et choc révélateur.',
    meaningReversed: 'Catastrophe évitée de justesse ou chaos contenu.',
  },
  {
    number: 17,
    roman: 'XVII',
    name: 'Mettaton',
    arcanaTitle: 'The Star',
    imagePath: '/themes/undertale-tarot/17.webp',
    meaningUpright: 'Rayonnement charismatique, inspiration et spectacle triomphant.',
    meaningReversed: 'Vanité, perte de flamme ou façade artificielle.',
  },
  {
    number: 18,
    roman: 'XVIII',
    name: 'Napstablook',
    arcanaTitle: 'The Moon',
    imagePath: '/themes/undertale-tarot/18.webp',
    meaningUpright: 'Mélancolie rêveuse, intuition profonde et clair-obscur apaisant.',
    meaningReversed: 'Brume dissipée, apaisement intérieur après le doute.',
  },
  {
    number: 19,
    roman: 'XIX',
    name: 'Grillby',
    arcanaTitle: 'The Sun',
    imagePath: '/themes/undertale-tarot/19.webp',
    meaningUpright: 'Chaleur bienveillante, clarté sereine et hospitalité rayonnante.',
    meaningReversed: 'Éclat voilé, fatigue silencieuse ou ardeur retenue.',
  },
  {
    number: 20,
    roman: 'XX',
    name: 'Sans',
    arcanaTitle: 'Judgement',
    imagePath: '/themes/undertale-tarot/20.webp',
    meaningUpright: 'Heure du bilan, lucidité implacable et pesée des actes.',
    meaningReversed: 'Jugement évité, procrastination ou remords différé.',
  },
  {
    number: 21,
    roman: 'XXI',
    name: 'Mt. Ebott',
    arcanaTitle: 'The World',
    imagePath: '/themes/undertale-tarot/21.webp',
    meaningUpright: 'Accomplissement suprême, harmonie retrouvée et horizon ouvert.',
    meaningReversed: 'Boucle inachevée avant le dernier pas vers la surface.',
  },
]

const SUIT_INDEX: Record<Suit, number> = {
  hearts: 0,
  diamonds: 1,
  spades: 2,
  clubs: 3,
}

const RANK_INDEX: Record<string, number> = {
  A: 0,
  '2': 1,
  '3': 2,
  '4': 3,
  '5': 4,
  '6': 5,
  '7': 6,
  '8': 7,
  '9': 8,
  '10': 9,
  J: 10,
  Q: 11,
  K: 12,
}

export const GASTER_TAROT_ARCANUM: TarotArcanum = {
  number: 666,
  roman: '666',
  name: 'Gaster',
  arcanaTitle: "L'Anomalie du Vide / The Void Anomaly",
  imagePath: '/themes/undertale-tarot/666.jpg',
  meaningUpright: 'Faille dimensionnelle (1/666) : renverse la fatalité et tranche l’issue du duel.',
  meaningReversed: 'Écho fragmenté dans le Néant ; l’espace-temps échappe à toute règle.',
}

export const ALL_UNDERTALE_TAROT_ARCANA: TarotArcanum[] = [
  ...UNDERTALE_TAROT_ARCANA,
  GASTER_TAROT_ARCANUM,
]

export function getUndertaleArcanum(index: number): TarotArcanum {
  if (index === 666) return GASTER_TAROT_ARCANUM
  const clamped = ((Math.trunc(index) % UNDERTALE_TAROT_ARCANA.length) + UNDERTALE_TAROT_ARCANA.length) % UNDERTALE_TAROT_ARCANA.length
  return UNDERTALE_TAROT_ARCANA[clamped]
}

export function getTarotArcanaForCard(suit: Suit, rank: Rank | string): TarotArcanum {
  const sIdx = SUIT_INDEX[suit] ?? 0
  const rIdx = RANK_INDEX[String(rank)] ?? 0
  const index = (sIdx * 13 + rIdx) % UNDERTALE_TAROT_ARCANA.length
  return UNDERTALE_TAROT_ARCANA[index]
}
