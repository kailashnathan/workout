import { supabase } from './supabase'
import type { DayTemplate, Draft, Exercise, Session, SetLog, Settings, TreadmillTemplate } from './types'
import { estimateDistance } from './pace'

export type Catalog = {
  settings: Settings
  exercises: Exercise[]
  days: DayTemplate[]
  treadmills: TreadmillTemplate[]
}

function unwrap<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message)
  return res.data as T
}

export async function loadCatalog(): Promise<Catalog> {
  const [settings, exercises, days, treadmills] = await Promise.all([
    supabase.from('settings').select('*').eq('id', 1).single(),
    supabase.from('exercises').select('*').order('category').order('name'),
    supabase.from('day_templates').select('*').order('position').order('id'),
    supabase.from('treadmill_templates').select('*').order('id'),
  ])
  const s = unwrap(settings) as Record<string, unknown>
  const num = (k: string) => Number(s[k])
  return {
    settings: {
      base_mph: num('base_mph'),
      push_mph: num('push_mph'),
      allout_mph: num('allout_mph'),
      walk_mph: num('walk_mph'),
      walker_mph: num('walker_mph'),
      walker_mode: Boolean(s.walker_mode),
      stair_minutes: num('stair_minutes'),
      rotation_index: num('rotation_index'),
      treadmill_index: num('treadmill_index'),
    },
    exercises: unwrap(exercises),
    days: unwrap(days),
    treadmills: unwrap(treadmills),
  }
}

export async function recentSetLogs(exerciseIds: number[]): Promise<SetLog[]> {
  if (!exerciseIds.length) return []
  return unwrap(
    await supabase
      .from('set_logs')
      .select('*')
      .in('exercise_id', exerciseIds)
      .order('session_id', { ascending: false })
      .limit(300),
  )
}

const num = (v: string) => (v.trim() === '' || isNaN(Number(v)) ? null : Number(v))

export async function finishSession(d: Draft, c: Catalog): Promise<number> {
  const treadMin = Math.round((d.treadTimer.elapsedMs / 60000) * 10) / 10
  const payload = {
    client_id: d.clientId,
    started_at: d.startedAt,
    day_template_id: d.dayTemplateId,
    day_name: d.dayName,
    treadmill_template_id: d.treadmillTemplateId,
    treadmill_name: d.treadmillName,
    notes: d.notes,
    next_rotation_index: d.dayIndex + 1,
    next_treadmill_index: d.treadmillIndex + 1,
    sets: d.exercises.flatMap((e) =>
      e.sets
        .filter((s) => s.done)
        .map((s, i) => ({ exercise_id: e.exerciseId, exercise_name: e.name, set_no: i + 1, reps: s.reps, weight: s.weight })),
    ),
    cardio: [
      {
        kind: 'treadmill',
        duration_min: treadMin,
        distance_mi: num(d.treadDistance) ?? estimateDistance(d.segments, c.settings, d.treadTimer.elapsedMs / 1000),
      },
      { kind: 'stair', duration_min: num(d.stair.minutes), floors: num(d.stair.floors), level: num(d.stair.level) },
    ],
    stretches: d.stretches,
  }
  return unwrap(await supabase.rpc('finish_session', { p: payload })) as number
}

export async function listSessions(): Promise<Session[]> {
  return unwrap(
    await supabase
      .from('sessions')
      .select('*, set_logs(*), cardio_logs(*), stretch_logs(*)')
      .order('started_at', { ascending: false })
      .limit(200),
  )
}

export async function deleteSession(id: number) {
  unwrap(await supabase.from('sessions').delete().eq('id', id))
}

export async function saveSessionEdits(s: Session) {
  const results = await Promise.all([
    supabase.from('sessions').update({ notes: s.notes }).eq('id', s.id),
    ...s.set_logs.map((l) => supabase.from('set_logs').update({ reps: l.reps, weight: l.weight }).eq('id', l.id)),
    ...s.cardio_logs.map((l) =>
      supabase
        .from('cardio_logs')
        .update({ duration_min: l.duration_min, distance_mi: l.distance_mi, floors: l.floors, level: l.level })
        .eq('id', l.id),
    ),
  ])
  results.forEach(unwrap)
}

export async function updateSettings(patch: Partial<Settings>) {
  unwrap(await supabase.from('settings').update(patch).eq('id', 1))
}

export async function upsertDay(d: Omit<DayTemplate, 'id'> & { id?: number }) {
  const { id, ...rest } = d
  unwrap(id ? await supabase.from('day_templates').update(rest).eq('id', id) : await supabase.from('day_templates').insert(rest))
}

export async function deleteDay(id: number) {
  unwrap(await supabase.from('day_templates').delete().eq('id', id))
}

export async function upsertExercise(e: Omit<Exercise, 'id'> & { id?: number }) {
  const { id, ...rest } = e
  unwrap(id ? await supabase.from('exercises').update(rest).eq('id', id) : await supabase.from('exercises').insert(rest))
}

export async function deleteExercise(id: number) {
  unwrap(await supabase.from('exercises').delete().eq('id', id))
}

export async function upsertTreadmill(t: Omit<TreadmillTemplate, 'id'> & { id?: number }) {
  const { id, ...rest } = t
  unwrap(
    id
      ? await supabase.from('treadmill_templates').update(rest).eq('id', id)
      : await supabase.from('treadmill_templates').insert(rest),
  )
}

export async function deleteTreadmill(id: number) {
  unwrap(await supabase.from('treadmill_templates').delete().eq('id', id))
}
