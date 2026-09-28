import { useState } from 'react'
import { fmt, MODE_COLOR, resolveSegment, segmentLabel, totalSec } from '../lib/pace'
import type { Segment, Settings } from '../lib/types'

export function Strip({ segments, progressSec }: { segments: Segment[]; progressSec?: number }) {
  const total = totalSec(segments) || 1
  return (
    <div className="relative flex h-3 overflow-hidden rounded-full">
      {segments.map((s, i) => (
        <div key={i} className={`${MODE_COLOR[s.mode]} border-r border-zinc-950/40`} style={{ width: `${(s.sec / total) * 100}%` }} />
      ))}
      {progressSec !== undefined && (
        <div className="absolute inset-y-0 left-0 bg-zinc-950/60" style={{ width: `${Math.min(100, (progressSec / total) * 100)}%` }} />
      )}
    </div>
  )
}

export function SegmentList({ segments, settings }: { segments: Segment[]; settings: Settings }) {
  return (
    <ol className="text-sm">
      {segments.map((s, i) => {
        const r = resolveSegment(s, settings)
        const newBlock = s.block && s.block !== segments[i - 1]?.block
        return (
          <li key={i}>
            {newBlock && <p className="label mt-3 mb-1">{s.block}</p>}
            <div className="flex items-center gap-3 border-t border-zinc-800 py-1.5">
              <span className={`h-3 w-3 shrink-0 rounded-full ${MODE_COLOR[s.mode]}`} />
              <span className="w-24 font-medium">{segmentLabel(s)}</span>
              <span className="w-10 tabular-nums text-zinc-400">{fmt(s.sec)}</span>
              <span className="text-zinc-300">{s.note || `${r.mph.toFixed(1)} mph · ${r.incline}%`}</span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

export function TreadmillPreview({ segments, settings }: { segments: Segment[]; settings: Settings }) {
  const [open, setOpen] = useState(false)
  const allOuts = segments.filter((s) => s.mode === 'allout').length
  const maxIncline = Math.max(0, ...segments.map((s) => resolveSegment(s, settings).incline))
  return (
    <div className="space-y-3">
      <Strip segments={segments} />
      <div className="flex gap-4 text-sm text-zinc-300">
        <span>{Math.round(totalSec(segments) / 60)} min</span>
        <span>{allOuts} all-outs</span>
        <span>max {maxIncline}% incline</span>
      </div>
      <button className="text-sm text-orange-400" onClick={() => setOpen(!open)}>
        {open ? 'Hide segments' : 'Show segments'}
      </button>
      {open && <SegmentList segments={segments} settings={settings} />}
    </div>
  )
}
