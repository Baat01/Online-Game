import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ReplayEngine } from '../replayEngine'
import { Button } from '@/components/ui/Button'
import { Loader2, Play, Pause, SkipBack, SkipForward } from 'lucide-react'

export function ReplayPage() {
  const { roomId } = useParams<{ roomId: string }>()
  const navigate = useNavigate()
  
  const [engine] = useState(() => new ReplayEngine())
  const [loading, setLoading] = useState(true)
  const [cursor, setCursor] = useState(-1)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000) // ms per step

  useEffect(() => {
    if (roomId) {
      engine.load(roomId).then(() => {
        setLoading(false)
        setCursor(-1)
      }).catch(console.error)
    }
  }, [roomId, engine])

  useEffect(() => {
    let timer: any;
    if (isPlaying) {
      timer = setInterval(() => {
        if (engine.stepForward()) {
          setCursor(engine.cursor)
        } else {
          setIsPlaying(false)
        }
      }, speed)
    }
    return () => clearInterval(timer)
  }, [isPlaying, engine, speed])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950 text-white">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    )
  }

  const handleStepForward = () => {
    if (engine.stepForward()) setCursor(engine.cursor)
  }

  const handleStepBackward = () => {
    if (engine.stepBackward()) setCursor(engine.cursor)
  }

  const history = engine.getEventsUntilCursor()

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-200">
      <div className="p-4 border-b border-slate-800 flex justify-between items-center">
        <h1 className="text-xl font-bold">Match Replay</h1>
        <Button variant="ghost" onClick={() => navigate(-1)}>Exit Replay</Button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Main View - In a real app, this would reconstruct the game board using a reducer.
            For now, we display the event stream linearly. */}
        <div className="flex-1 p-8 overflow-y-auto font-mono text-sm">
          {history.length === 0 ? (
            <p className="text-slate-500 text-center mt-20">No events played yet.</p>
          ) : (
            <div className="space-y-4">
              {history.map((ev, i) => (
                <div key={ev.id} className="p-4 bg-slate-900 border border-slate-700 rounded-lg shadow animate-slide-up">
                  <div className="flex justify-between text-slate-400 mb-2">
                    <span>{new Date(ev.created_at).toLocaleTimeString()}</span>
                    <span>Event #{i + 1}</span>
                  </div>
                  <p className="text-emerald-400 font-bold text-lg mb-2">{ev.type}</p>
                  <pre className="text-xs text-slate-300 overflow-x-auto p-2 bg-slate-950 rounded">
                    {JSON.stringify(ev.payload, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Controls */}
        <div className="w-80 border-l border-slate-800 bg-slate-900 p-6 flex flex-col gap-6">
          <div className="text-center">
            <p className="text-slate-400 text-sm">Progress</p>
            <p className="text-2xl font-bold">{cursor + 1} / {engine.totalEvents}</p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button variant="secondary" onClick={handleStepBackward} disabled={cursor < 0}>
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button variant={isPlaying ? 'secondary' : 'primary'} onClick={() => setIsPlaying(!isPlaying)}>
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
            <Button variant="secondary" onClick={handleStepForward} disabled={cursor >= engine.totalEvents - 1}>
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-400 text-center">Playback Speed</p>
            <div className="flex justify-between gap-2">
              <Button size="sm" variant={speed === 2000 ? 'primary' : 'ghost'} onClick={() => setSpeed(2000)}>0.5x</Button>
              <Button size="sm" variant={speed === 1000 ? 'primary' : 'ghost'} onClick={() => setSpeed(1000)}>1x</Button>
              <Button size="sm" variant={speed === 500 ? 'primary' : 'ghost'} onClick={() => setSpeed(500)}>2x</Button>
              <Button size="sm" variant={speed === 100 ? 'primary' : 'ghost'} onClick={() => setSpeed(100)}>10x</Button>
            </div>
          </div>

          <div className="mt-auto">
            <Button className="w-full" variant="ghost" onClick={() => {
              engine.jumpTo(-1);
              setCursor(-1);
              setIsPlaying(false);
            }}>Restart Replay</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
