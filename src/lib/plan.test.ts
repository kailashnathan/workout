import { describe, expect, it } from 'vitest'
import { latestSetsByExercise, liftTotals, pick, prefillSets, summarizeSets } from './plan'
import type { Exercise, SetLog } from './types'

describe('pick', () => {
  const days = ['A', 'B', 'C']
  it('wraps the rotation both directions', () => {
    expect(pick(days, 0)).toEqual({ item: 'A', index: 0 })
    expect(pick(days, 3)).toEqual({ item: 'A', index: 0 })
    expect(pick(days, 7)).toEqual({ item: 'B', index: 1 })
    expect(pick(days, -1)).toEqual({ item: 'C', index: 2 })
  })
  it('returns null for an empty list', () => {
    expect(pick([], 2)).toBeNull()
  })
})

const log = (session_id: number, exercise_id: number, set_no: number, weight: number, reps = 10): SetLog => ({
  id: session_id * 100 + set_no,
  session_id,
  exercise_id,
  exercise_name: `ex${exercise_id}`,
  set_no,
  reps,
  weight,
})

describe('latestSetsByExercise', () => {
  it('keeps only the most recent session per exercise, ordered by set', () => {
    const logs = [log(1, 1, 1, 100), log(2, 1, 2, 115), log(2, 1, 1, 110), log(1, 2, 1, 50)]
    const m = latestSetsByExercise(logs)
    expect(m.get(1)!.map((l) => l.weight)).toEqual([110, 115])
    expect(m.get(2)!.map((l) => l.weight)).toEqual([50])
  })
})

describe('prefillSets', () => {
  const ex: Exercise = { id: 1, name: 'Leg Press', category: 'legs', equipment: null, default_sets: 3, default_reps: 12 }
  it('copies the last session', () => {
    expect(prefillSets(ex, [log(1, 1, 1, 180, 12), log(1, 1, 2, 190, 10)])).toEqual([
      { reps: 12, weight: 180, done: false },
      { reps: 10, weight: 190, done: false },
    ])
  })
  it('falls back to defaults', () => {
    expect(prefillSets(ex, undefined)).toEqual([
      { reps: 12, weight: 0, done: false },
      { reps: 12, weight: 0, done: false },
      { reps: 12, weight: 0, done: false },
    ])
  })
})

it('summarizeSets shows sets×reps @ top weight', () => {
  expect(summarizeSets([{ reps: 12, weight: 180 }, { reps: 12, weight: 190 }])).toBe('2×12 @ 190 lb')
  expect(summarizeSets([{ reps: 30, weight: 0 }])).toBe('1×30')
})

it('liftTotals gives sets, top weight and total volume', () => {
  expect(liftTotals([{ reps: 12, weight: 180 }, { reps: 10, weight: 190 }])).toEqual({ sets: 2, top: 190, volume: 4060 })
  expect(liftTotals([])).toEqual({ sets: 0, top: 0, volume: 0 })
})
