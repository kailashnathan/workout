import type { DraftSet, Exercise, SetLog } from './types'

export function pick<T>(items: T[], index: number): { item: T; index: number } | null {
  if (!items.length) return null
  const i = ((index % items.length) + items.length) % items.length
  return { item: items[i], index: i }
}

// Latest session's sets for each exercise, keyed by exercise id.
export function latestSetsByExercise(logs: SetLog[]): Map<number, SetLog[]> {
  const latestSession = new Map<number, number>()
  for (const l of logs) {
    if (l.exercise_id == null) continue
    latestSession.set(l.exercise_id, Math.max(latestSession.get(l.exercise_id) ?? -Infinity, l.session_id))
  }
  const out = new Map<number, SetLog[]>()
  for (const l of logs) {
    if (l.exercise_id == null || latestSession.get(l.exercise_id) !== l.session_id) continue
    out.set(l.exercise_id, [...(out.get(l.exercise_id) ?? []), l])
  }
  for (const sets of out.values()) sets.sort((a, b) => a.set_no - b.set_no)
  return out
}

export function prefillSets(ex: Exercise, last: SetLog[] | undefined): DraftSet[] {
  if (last?.length) return last.map((l) => ({ reps: l.reps, weight: Number(l.weight), done: false }))
  return Array.from({ length: ex.default_sets }, () => ({ reps: ex.default_reps, weight: 0, done: false }))
}

export function summarizeSets(sets: { reps: number; weight: number }[]): string {
  if (!sets.length) return ''
  const top = Math.max(...sets.map((s) => s.weight))
  const reps = sets[0].reps
  return `${sets.length}×${reps}${top > 0 ? ` @ ${top} lb` : ''}`
}
