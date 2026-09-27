import type { Mode, Segment, Settings } from './types'

export const MAX_INCLINE = 15
const WALKER_INCLINE_BOOST: Record<Mode, number> = { walk: 0, base: 0, push: 4, allout: 8 }

type PaceSettings = Pick<Settings, 'base_mph' | 'push_mph' | 'allout_mph' | 'walk_mph' | 'walker_mph' | 'walker_mode'>

export function resolveSegment(seg: Segment, s: PaceSettings): { mph: number; incline: number } {
  if (seg.mode === 'walk') return { mph: s.walk_mph, incline: seg.incline }
  if (s.walker_mode) {
    return { mph: s.walker_mph, incline: Math.min(MAX_INCLINE, seg.incline + WALKER_INCLINE_BOOST[seg.mode]) }
  }
  const mph = { base: s.base_mph, push: s.push_mph, allout: s.allout_mph }[seg.mode]
  return { mph, incline: seg.incline }
}

export const totalSec = (segs: Segment[]) => segs.reduce((t, s) => t + s.sec, 0)

export function segmentAt(segs: Segment[], elapsedSec: number): { index: number; remaining: number } | null {
  let start = 0
  for (let i = 0; i < segs.length; i++) {
    const end = start + segs[i].sec
    if (elapsedSec < end) return { index: i, remaining: end - elapsedSec }
    start = end
  }
  return null
}

export const segmentStart = (segs: Segment[], index: number) => totalSec(segs.slice(0, index))

export function estimateDistance(segs: Segment[], s: PaceSettings, elapsedSec = totalSec(segs)): number {
  let miles = 0
  let t = 0
  for (const seg of segs) {
    const sec = Math.max(0, Math.min(seg.sec, elapsedSec - t))
    miles += (resolveSegment(seg, s).mph * sec) / 3600
    t += seg.sec
  }
  return Math.round(miles * 100) / 100
}

export function fmt(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export const MODE_LABEL: Record<Mode, string> = { walk: 'Walk', base: 'Base', push: 'Push', allout: 'All Out' }

// OTF-style zone colors
export const MODE_COLOR: Record<Mode, string> = {
  walk: 'bg-sky-600',
  base: 'bg-emerald-600',
  push: 'bg-orange-500',
  allout: 'bg-red-600',
}
