import { useState } from 'react'
import { fmt, MODE_COLOR, MODE_LABEL, resolveSegment, totalSec } from '../lib/pace'
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
    <ol className="divide-y divide-zinc-800 text-sm">
      {segments.map((s, i) => {
        const r = resolveSegment(s, settings)
        return (
          <li key={i} className="flex items-center gap-3 py-1.5">
            <span className={`h-3 w-3 rounded-full ${MODE_COLOR[s.mode]}`} />
            <span className="w-16 font-medium">{MODE_LABEL[s.mode]}</span>
            <span className="w-12 tabular-nums text-zinc-400">{fmt(s.sec)}</span>
            <span className="w-20 tabular-nums">{r.mph.toFixed(1)} mph</span>
            <span className="tabular-nums">{r.incline}%</span>
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
