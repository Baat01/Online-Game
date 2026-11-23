import { ARCANA_RULES_CATALOG, type ArcanaRuleSpec } from '@/games/23e-arcane/engine/arcane23Engine'

export type GameRuleSlug =
  | 'blackjack'
  | 'saving-throw'
  | 'blackjack-twist'
  | 'four-seasons'
  | '23e-arcane'

export interface GameRuleSection {
  title: string
  bullets: string[]
}

export interface GameRuleEntry {
  slug: GameRuleSlug
  name: string
  subtitle: string
  playersLabel: string
  objective: string
  sections: GameRuleSection[]
  includeArcanaIndex?: boolean
}

export const GAME_RULES: GameRuleEntry[] = [
  {
    slug: 'blackjack',
    name: 'Blackjack',
    subtitle: 'Classique de casino contre le croupier',
    playersLabel: '2 à 6 joueurs',
    objective:
      'Approcher le plus possible de 21 points sans jamais le dépasser, tout en battant la main du croupier.',
    sections: [
      {
        title: 'Valeur des cartes',
        bullets: [
          'Cartes 2 à 10 : valeur nominale.',
          'Valet (J), Dame (Q), Roi (K) : 10 points.',
          'As (A) : vaut 11 points, ou 1 point automatiquement si le total dépasse 21.',
        ],
      },
      {
        title: 'Déroulement d’une manche',
        bullets: [
          'Chaque joueur reçoit 2 cartes visibles ; le croupier reçoit 1 carte visible et 1 carte cachée.',
          'À votre tour, choisissez Tirer (Hit) pour recevoir une carte supplémentaire ou Rester (Stand) pour verrouiller votre score.',
          'Au-delà de 21, vous faites Bust (défaite immédiate sur la manche).',
        ],
      },
      {
        title: 'Tour du croupier & Résolution',
        bullets: [
          'Une fois tous les joueurs terminés, le croupier révèle sa carte cachée et tire jusqu’à atteindre au moins 17.',
          'Un Blackjack naturel (As + carte à 10 dès les 2 premières cartes) bat un 21 ordinaire.',
          'Égalité de score : manche nulle (Push).',
        ],
      },
    ],
  },
  {
    slug: 'saving-throw',
    name: 'Saving Throw — Jet de Sauvegarde',
    subtitle: 'Duel psychologique aux dés 2d10 en 5 manches',
    playersLabel: '2 joueurs',
    objective:
      'Remporter 3 manches sur 5 (Best of 5) en battant le jet de votre adversaire avec deux dés à 10 faces (2d10).',
    sections: [
      {
        title: 'Pièce d’ouverture & Rôles',
        bullets: [
          'Un lancer de pièce 3D détermine qui lance en premier (Lanceur) et qui répond (Défenseur).',
          'Les rôles s’inversent à chaque nouvelle manche.',
        ],
      },
      {
        title: 'Lecture du 2d10 (1 à 100)',
        bullets: [
          'Le premier dé (00–90) indique les dizaines et le second (0–9) indique les unités.',
          'Le résultat 00 + 0 vaut 100 (le score le plus élevé possible).',
          'Chaque joueur dispose d’une unique relance facultative par manche : si vous relancez, le nouveau jet remplace définitivement l’ancien.',
        ],
      },
      {
        title: 'Condition de victoire d’une manche',
        bullets: [
          'Le premier joueur établit un seuil cible avec son jet final.',
          'Le second joueur réussit son Jet de Sauvegarde et remporte la manche s’il obtient un score strictement inférieur au seuil.',
          'En cas d’égalité parfaite ou de score supérieur, le premier joueur remporte la manche. À 2–2 sur égalité finale, une pièce de mort subite départage les deux joueurs.',
        ],
      },
    ],
  },
  {
    slug: 'blackjack-twist',
    name: 'Blackjack Twist',
    subtitle: 'Blackjack duel avec carte centrale secrète et sabotage de figures',
    playersLabel: '2 joueurs',
    objective:
      'Finir au plus proche de 21 (sans dépasser 21) une fois la carte secrète partagée révélée et ajoutée aux deux mains.',
    sections: [
      {
        title: 'La Carte Secrète Partagée',
        bullets: [
          'Au début du duel, une carte face cachée est placée au centre de la table.',
          'Elle comptera pour les deux joueurs lors de l’abattage final : anticipez son impact avant de rester !',
        ],
      },
      {
        title: 'Sabotage des Figures (J, Q, K)',
        bullets: [
          'Lorsque vous piochez une figure, vous choisissez soit de la garder pour vous, soit de la donner à votre adversaire.',
          'Valet (J) : modifie le score de −3.',
          'Dame (Q) : modifie le score de +3.',
          'Roi (K) : vous choisissez entre +3 ou −3 avant de le garder ou de l’imposer à votre adversaire.',
        ],
      },
      {
        title: 'Fin de partie',
        bullets: [
          'Les joueurs jouent à tour de rôle (Tirer ou Rester).',
          'Dès que les deux joueurs restent (ou que le paquet s’épuise), la carte centrale est révélée et additionnée aux deux mains.',
          'Le joueur le plus proche de 21 sans dépasser gagne ; si les deux dépassent 21, le plus proche de 21 l’emporte.',
        ],
      },
    ],
  },
  {
    slug: 'four-seasons',
    name: 'Four Seasons — Jeu des 4 Saisons',
    subtitle: 'Course tactique où il faut suivre le cycle strict des saisons',
    playersLabel: '2 joueurs',
    objective: 'Être le premier joueur à vider entièrement sa main.',
    sections: [
      {
        title: 'Cycle strict des 4 Saisons',
        bullets: [
          'Chaque couleur correspond à une saison : Printemps (♥ Cœur) → Été (♦ Carreau) → Automne (♠ Pique) → Hiver (♣ Trèfle) → Printemps (♥).',
          'À votre tour, vous devez obligatoirement jouer une carte de la saison SUIVANTE (jouer la même saison est interdit).',
        ],
      },
      {
        title: 'Pouvoir du Roi (Joker Saisonnier)',
        bullets: [
          'Un Roi (K) de n’importe quelle couleur peut être joué à tout moment (sauf comme toute dernière carte si la règle de blocage final s’applique).',
          'En posant un Roi, vous choisissez librement la saison active qui imposera la couleur suivante à votre adversaire.',
        ],
      },
      {
        title: 'Pioche & Victoire',
        bullets: [
          'Si aucune carte de votre main n’est jouable, vous devez piocher une carte et passer la main.',
          'Dès que votre main tombe à 0 carte, vous remportez immédiatement la partie.',
        ],
      },
    ],
  },
  {
    slug: '23e-arcane',
    name: 'Le 23e Arcane',
    subtitle: 'Duel asymétrique : 52 cartes, 22 Arcanes du Tarot & anomalie 1/666 Gaster',
    playersLabel: '2 joueurs',
    objective:
      'Remporter 5 manches (ou gagner le duel de Mort Subite après XV. Le Diable, ou déclencher l’anomalie 666. Gaster).',
    sections: [
      {
        title: 'Déroulement séquentiel d’un tour',
        bullets: [
          '1. Décret préalable (si IV. L’Empereur est actif) : son porteur choisit d’interdire ou de forcer le Tarot adverse pour ce tour.',
          '2. Choix simultané secret : chaque joueur choisit entre son paquet personnel de 52 cartes (2 faible → As fort) ou la pile commune de 22 Arcanes du Tarot.',
          '3. Révélation séquentielle : d’abord les cartes classiques (Étape 1), puis la 1re carte de Tarot au premier plan (Étape 2), puis la 2e éventuelle (Étape 3), puis la résolution du duel.',
        ],
      },
      {
        title: 'Cooldown Tarot & Anomalie 666',
        bullets: [
          'Un joueur qui invoque le Tarot subit 1 tour de recharge (1 tour sur 2), sauf si XV. Le Diable réinitialise les cooldowns ou si IV. L’Empereur impose le Tarot.',
          'Avant chaque pioche de Tarot, un lancer caché de 3d10 (0–9) vérifie l’anomalie 1/666 : sur 6-6-6, W. D. Gaster remplace l’Arcane et désigne immédiatement le vainqueur de la partie.',
        ],
      },
      {
        title: 'Ordre strict des priorités (0 → 10 + Variable)',
        bullets: [
          'Priorité 0 (Suprême) : 666. W. D. Gaster — désigne le vainqueur de toute la partie.',
          'Priorité 1 : XIII. L’Arcane sans nom (Death) — défaite immédiate du tireur.',
          'Priorité 2 : XV. Le Diable — annule la manche, active la Mort Subite et reset les cooldowns Tarot.',
          'Priorité 3 : XXI. Le Monde — victoire immédiate de la manche + remélange des défausses.',
          'Priorité 4 : 0. Le Mat — inverse la hiérarchie (2 bat As), annulé par Le Pape ou La Roue.',
          'Priorité 5 : V. Le Pape, X. La Roue de la Fortune (pièce 3D pour +2 manches), XIV. Tempérance.',
          'Priorité 6 : III. L’Impératrice (+2 manches au vainqueur).',
          'Priorité 7 : VIII. La Justice & XVI. La Maison Dieu (modifient les scores avant le duel).',
          'Priorité 8 : I. Le Bateleur, VI. L’Amoureux, VII. Le Chariot, IX. L’Ermite, XI. La Force.',
          'Priorité 9 : XII. Le Pendu (échange obligatoire des cartes classiques).',
          'Priorité 10 : II. La Papesse, IV. L’Empereur, XVII. L’Étoile, XVIII. La Lune, XIX. Le Soleil (3 prochaines cartes).',
          'Priorité Variable : XX. Le Jugement — prévisualise puis copie un Arcane de la défausse avec sa priorité d’origine.',
        ],
      },
    ],
    includeArcanaIndex: true,
  },
]

export const GAME_RULES_BY_SLUG: Record<GameRuleSlug, GameRuleEntry> = Object.fromEntries(
  GAME_RULES.map((entry) => [entry.slug, entry]),
) as Record<GameRuleSlug, GameRuleEntry>

export function getGameRules(slug?: string | null): GameRuleEntry {
  if (slug && slug in GAME_RULES_BY_SLUG) {
    return GAME_RULES_BY_SLUG[slug as GameRuleSlug]
  }
  return GAME_RULES[0]
}

export function getOrderedArcanaRules(): ArcanaRuleSpec[] {
  const entries = Object.values(ARCANA_RULES_CATALOG)
  return entries.sort((a, b) => {
    if (a.number === 666) return 1
    if (b.number === 666) return -1
    return a.number - b.number
  })
}
