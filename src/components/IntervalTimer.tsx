import { useEffect, useRef } from 'react'
import { fmt, MODE_COLOR, MODE_LABEL, resolveSegment, segmentAt, segmentStart, totalSec } from '../lib/pace'
import type { Segment, Settings, TimerState } from '../lib/types'
import { beep, useTimer } from '../lib/useTimer'
import { Strip } from './SegmentStrip'

type Props = { segments: Segment[]; settings: Settings; timer: TimerState; onTimer: (t: TimerState) => void }

export default function IntervalTimer({ segments, settings, timer, onTimer }: Props) {
  const { elapsedSec, running, start, pause, seek } = useTimer(timer, onTimer)
  const total = totalSec(segments)
  const at = segmentAt(segments, elapsedSec)
  const lastCue = useRef<string>('')

  useEffect(() => {
    if (!running) return
    if (!at) {
      onTimer({ runningSince: null, elapsedMs: total * 1000 })
      beep(1320, 800)
      return
    }
    const secLeft = Math.ceil(at.remaining)
    const cue = `${at.index}:${secLeft}`
    if (cue === lastCue.current) return
    const first = lastCue.current === ''
    const prevIndex = Number(lastCue.current.split(':')[0])
    lastCue.current = cue
    if (!first && prevIndex !== at.index) beep(1320, 400)
    else if (secLeft <= 3) beep(880, 120)
  }, [running, at, total, onTimer])

  if (!at)
    return (
      <div className="card space-y-3 text-center">
        <p className="text-2xl font-bold text-emerald-400">Treadmill done ✓</p>
        <p className="text-zinc-400">{fmt(total)} total</p>
        <button className="btn" onClick={() => seek(0)}>
          Restart
        </button>
      </div>
    )

  const seg = segments[at.index]
  const cur = resolveSegment(seg, settings)
  const next = segments[at.index + 1]
  const nextR = next && resolveSegment(next, settings)
  const segElapsed = seg.sec - at.remaining

  return (
    <div className="space-y-4">
      <div className={`${MODE_COLOR[seg.mode]} rounded-3xl p-5 text-center text-white`}>
        <p className="text-2xl font-bold tracking-wide uppercase">{MODE_LABEL[seg.mode]}</p>
        <p className="my-2 text-7xl font-black tabular-nums">{fmt(at.remaining)}</p>
        <div className="flex justify-center gap-8 text-3xl font-bold tabular-nums">
          <span>
            {cur.mph.toFixed(1)}
            <span className="text-base font-medium"> mph</span>
          </span>
          <span>
            {cur.incline}
            <span className="text-base font-medium">% inc</span>
          </span>
        </div>
      </div>

      <p className="text-center text-zinc-300">
        {next ? (
          <>
            Next: <b>{MODE_LABEL[next.mode]}</b> {fmt(next.sec)} · {nextR!.mph.toFixed(1)} mph · {nextR!.incline}%
          </>
        ) : (
          'Last segment!'
        )}
      </p>

      <Strip segments={segments} progressSec={elapsedSec} />
      <div className="flex justify-between text-sm text-zinc-400 tabular-nums">
        <span>{fmt(elapsedSec)} elapsed</span>
        <span>
          {at.index + 1}/{segments.length}
        </span>
        <span>{fmt(total - elapsedSec)} left</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button
          className="btn"
          aria-label="Previous segment"
          onClick={() => seek(segmentStart(segments, segElapsed > 3 || at.index === 0 ? at.index : at.index - 1))}
        >
          ⏮
        </button>
        <button className="btn-primary col-span-2" onClick={running ? pause : start}>
          {running ? 'Pause' : elapsedSec > 0 ? 'Resume' : 'Start'}
        </button>
        <button className="btn" aria-label="Next segment" onClick={() => seek(segmentStart(segments, at.index + 1))}>
          ⏭
        </button>
      </div>
    </div>
  )
}
