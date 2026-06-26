import { Spade, Users, Gamepad2, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

const features = [
  {
    icon: Users,
    title: 'Play with Friends',
    description: 'Add friends, see who is online, and invite them into private game rooms.',
  },
  {
    icon: Gamepad2,
    title: 'Multiple Games',
    description: 'Starting with Blackjack. More card games coming soon — all under one roof.',
  },
  {
    icon: Spade,
    title: 'Real-time Action',
    description: "Cards dealt, turns taken, results revealed — all live via Supabase Realtime.",
  },
]

/**
 * Landing / home page.
 * Phase 2 will replace the hero with personalized content for logged-in users.
 */
export function HomePage() {
  return (
    <div className="animate-fade-in">
      {/* ── Hero ── */}
      <section className="relative overflow-hidden py-24 px-4 text-center">
        {/* Background glow */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 size-[600px] rounded-full bg-brand-500/8 blur-3xl" />
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-brand-500/30 bg-brand-500/10 text-brand-400 text-sm font-medium mb-2">
            <Spade className="size-3.5 fill-brand-400" aria-hidden="true" />
            Multiplayer Card Games
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Deal. Bluff. Win.
            <br />
            <span className="text-brand-400">Play with Friends.</span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed">
            CardArena is your online card game room. Invite friends, start a Blackjack table, and
            experience real-time multiplayer — right in your browser.
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
