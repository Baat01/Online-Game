import { Spade, Users, Gamepad2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const features = [
  {
    icon: Users,
    title: 'Cercles & Rivaux',
    description: 'Ajoutez vos alliés ou rivaux des clans Bami, suivez leur présence et invitez-les en salon privé.',
  },
  {
    icon: Gamepad2,
    title: '4 Jeux d’Engei',
    description: 'Blackjack, Saving Throw, Blackjack Twist et Four Seasons — avec mises en ¥ ou parties amicales.',
  },
  {
    icon: Spade,
    title: 'Cartes & Prestige',
    description: 'Personnalisez votre recto, verso, dés et pièces, misez à la Trésorerie ENGEI et jouez en temps réel.',
  },
]

/**
 * Landing / home page — ENGEI (宴芸).
 */
export function HomePage() {
  return (
    <div className="animate-fade-in bg-engei-pattern">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 px-4 text-center">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-brand-500/12 blur-3xl" />
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gold-500/40 bg-gold-500/10 text-gold-300 text-sm font-medium mb-2">
            <Spade className="size-3.5 fill-brand-500 text-brand-500" aria-hidden="true" />
            ENGEI (宴芸) — Cercle Bami
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Misez. Bluffez. Dominez.
            <br />
            <span className="text-gold-400">Sous les lumières d’Engei.</span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed">
            Bienvenue dans le district souterrain fondé par la famille Jabami et régi par les clans
            Bami. Ouvrez une table privée, engagez vos ¥ à la Trésorerie ENGEI et défiez vos adversaires.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
            <Button
              id="hero-get-started"
              size="lg"
              rightIcon={<ArrowRight className="size-4" />}
              className="animate-pulse-glow"
            >
              Get Started — it&apos;s free
            </Button>
            <Link to="/games">
              <Button
                id="hero-browse-games"
                variant="secondary"
                size="lg"
                leftIcon={<Gamepad2 className="size-4" />}
              >
                Browse Games
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section
        className="max-w-5xl mx-auto px-4 pb-20"
        aria-labelledby="features-heading"
      >
        <h2
          id="features-heading"
          className="text-xl font-semibold text-slate-300 text-center mb-8"
        >
          Everything you need for game night
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {features.map(({ icon: Icon, title, description }) => (
            <Card key={title} className="p-6 animate-slide-up">
              <div className="size-10 rounded-lg bg-brand-500/15 flex items-center justify-center mb-4">
                <Icon className="size-5 text-brand-400" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-slate-100 mb-2">{title}</h3>
              <p className="text-sm text-slate-400 leading-relaxed">{description}</p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
