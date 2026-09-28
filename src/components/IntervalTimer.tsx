import { useEffect, useRef, type ReactNode } from 'react'
import { blockInfo, fmt, MODE_BG, resolveSegment, segmentAt, segmentLabel, segmentStart, totalSec } from '../lib/pace'
import type { Segment, Settings, TimerState } from '../lib/types'
import { changeBeep, countdownBeep, useTimer } from '../lib/useTimer'

type Props = {
  name: string
  description?: string | null
  segments: Segment[]
  settings: Settings
  timer: TimerState
  onTimer: (t: TimerState) => void
  onNext: () => void
  nextLabel: string
}

const IDLE_BG = '#14141a'

// Paints the whole page (and the phone's status bar) with the current phase color.
function usePageColor(color: string) {
  useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    const prevMeta = meta?.getAttribute('content')
    document.body.style.transition = 'background 0.4s ease'
    document.body.style.background = color
    meta?.setAttribute('content', color)
    return () => {
      document.body.style.background = ''
      if (prevMeta) meta?.setAttribute('content', prevMeta)
    }
  }, [color])
}

export default function IntervalTimer({ name, description, segments, settings, timer, onTimer, onNext, nextLabel }: Props) {
  const { elapsedSec, running, start, pause, seek } = useTimer(timer, onTimer)
  const total = totalSec(segments)
  const at = segmentAt(segments, elapsedSec)
  const lastCue = useRef('')
  const notStarted = !running && elapsedSec === 0

  usePageColor(at && !notStarted ? MODE_BG[segments[at.index].mode] : IDLE_BG)

  useEffect(() => {
    if (!running) return
    if (!at) {
      onTimer({ runningSince: null, elapsedMs: total * 1000 })
      changeBeep()
      return
    }
    const secLeft = Math.ceil(at.remaining)
    const cue = `${at.index}:${secLeft}`
    if (cue === lastCue.current) return
    const prevIndex = lastCue.current === '' ? at.index : Number(lastCue.current.split(':')[0])
    lastCue.current = cue
    if (prevIndex !== at.index) changeBeep()
    else if (secLeft <= 3) countdownBeep()
  }, [running, at, total, onTimer])

  if (notStarted) {
    const allOuts = segments.filter((s) => s.mode === 'allout').length
    const maxIncline = Math.max(0, ...segments.map((s) => resolveSegment(s, settings).incline))
    return (
      <Screen>
        <h2 className="mb-3 text-3xl font-bold">{name}</h2>
        <p className="mb-5 text-sm opacity-70">
          {fmt(total)} · {allOuts} all-outs · max {maxIncline}%
        </p>
        {description && <div className="mb-6 rounded-xl bg-white/10 px-4 py-3 text-left text-sm leading-relaxed opacity-90">{description}</div>}
        <button className="rounded-2xl bg-white/90 px-9 py-4 text-lg font-semibold text-black active:bg-white" onClick={start}>
          Start Tread
        </button>
      </Screen>
    )
  }

  if (!at)
    return (
      <Screen>
        <h2 className="mb-2 text-3xl font-bold">Tread blocks done 🎉</h2>
        <p className="mb-8 text-sm opacity-70">Take 90 sec, then head to the {nextLabel.toLowerCase()}.</p>
        <button className="rounded-2xl bg-white/90 px-9 py-4 text-lg font-semibold text-black active:bg-white" onClick={onNext}>
          Go to {nextLabel}
        </button>
        <div className="mt-4">
          <button className="rounded-2xl bg-white/15 px-5 py-3 font-semibold active:bg-white/30" onClick={() => seek(0)}>
            Restart Tread
          </button>
        </div>
      </Screen>
    )

  const seg = segments[at.index]
  const cur = resolveSegment(seg, settings)
  const next = segments[at.index + 1]
  const block = blockInfo(segments, at.index)
  const segElapsed = seg.sec - at.remaining
  const speedLine = `${cur.mph.toFixed(1)} mph · ${cur.incline}%`

  return (
    <Screen>
      <p className="mb-1.5 min-h-5 text-[15px] tracking-wider uppercase opacity-65">{block && `${block.name} · ${fmt(block.sec)}`}</p>
      <p className="mb-1 text-[34px] font-bold tracking-wide uppercase">{segmentLabel(seg)}</p>
      <p className="min-h-5 text-[15px] opacity-75">{seg.note || speedLine}</p>
      <p className="mb-5 min-h-5 text-sm opacity-55">{seg.note ? speedLine : ''}</p>
      <p className="mb-6 text-[88px] leading-none font-bold tabular-nums">{fmt(at.remaining)}</p>
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-white/15">
        <div className="h-full bg-white/85 transition-[width] duration-200 ease-linear" style={{ width: `${(segElapsed / seg.sec) * 100}%` }} />
      </div>
      <p className="mb-1.5 text-[13px] opacity-50">
        Phase {at.index + 1} of {segments.length} · {fmt(total - elapsedSec)} left
      </p>
      <p className="mb-7 min-h-5 text-sm opacity-55">{next ? `Next: ${segmentLabel(next)} · ${fmt(next.sec)}` : 'Final phase'}</p>
      <div className="flex justify-center gap-3">
        <TimerButton onClick={() => seek(segmentStart(segments, segElapsed > 3 || at.index === 0 ? at.index : at.index - 1))}>⏮ Back</TimerButton>
        <TimerButton onClick={running ? pause : start}>{running ? '⏸ Pause' : '▶ Resume'}</TimerButton>
        <TimerButton onClick={() => seek(segmentStart(segments, at.index + 1))}>Skip ⏭</TimerButton>
      </div>
    </Screen>
  )
}

function Screen({ children }: { children: ReactNode }) {
  return <div className="flex min-h-[calc(100dvh-7rem)] flex-col justify-center px-2 text-center text-white">{children}</div>
}

function TimerButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button className="rounded-2xl bg-white/15 px-5 py-3.5 font-semibold active:bg-white/30" onClick={onClick}>
      {children}
    </button>
  )
}
