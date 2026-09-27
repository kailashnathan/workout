import { describe, expect, it } from 'vitest'
import { estimateDistance, fmt, resolveSegment, segmentAt, segmentStart, totalSec } from './pace'
import type { Segment } from './types'

const s = { base_mph: 5, push_mph: 6, allout_mph: 7.5, walk_mph: 3, walker_mph: 3.5, walker_mode: false }
const segs: Segment[] = [
  { sec: 60, mode: 'walk', incline: 1 },
  { sec: 120, mode: 'push', incline: 2 },
  { sec: 30, mode: 'allout', incline: 10 },
]

describe('resolveSegment', () => {
  it('uses the configured pace per mode', () => {
    expect(resolveSegment(segs[0], s)).toEqual({ mph: 3, incline: 1 })
    expect(resolveSegment(segs[1], s)).toEqual({ mph: 6, incline: 2 })
    expect(resolveSegment({ sec: 1, mode: 'base', incline: 1 }, s)).toEqual({ mph: 5, incline: 1 })
  })

  it('walker mode swaps speed for incline and caps at 15%', () => {
    const w = { ...s, walker_mode: true }
    expect(resolveSegment(segs[0], w)).toEqual({ mph: 3, incline: 1 })
    expect(resolveSegment({ sec: 1, mode: 'base', incline: 2 }, w)).toEqual({ mph: 3.5, incline: 2 })
    expect(resolveSegment(segs[1], w)).toEqual({ mph: 3.5, incline: 6 })
    expect(resolveSegment(segs[2], w)).toEqual({ mph: 3.5, incline: 15 })
  })
})

describe('segmentAt', () => {
  it('finds the current segment and time remaining', () => {
    expect(segmentAt(segs, 0)).toEqual({ index: 0, remaining: 60 })
    expect(segmentAt(segs, 59.5)).toEqual({ index: 0, remaining: 0.5 })
    expect(segmentAt(segs, 60)).toEqual({ index: 1, remaining: 120 })
    expect(segmentAt(segs, 200)).toEqual({ index: 2, remaining: 10 })
  })

  it('returns null when finished', () => {
    expect(segmentAt(segs, totalSec(segs))).toBeNull()
  })

  it('segmentStart gives boundaries', () => {
    expect(segmentStart(segs, 0)).toBe(0)
    expect(segmentStart(segs, 2)).toBe(180)
  })
})

describe('estimateDistance', () => {
  it('sums distance for the full workout', () => {
    // 60s@3 + 120s@6 + 30s@7.5 = 0.05 + 0.2 + 0.0625
    expect(estimateDistance(segs, s)).toBe(0.31)
  })
  it('only counts elapsed time', () => {
    expect(estimateDistance(segs, s, 120)).toBe(0.15)
  })
})

it('fmt formats mm:ss', () => {
  expect(fmt(0)).toBe('0:00')
  expect(fmt(59.2)).toBe('1:00')
  expect(fmt(125)).toBe('2:05')
})
