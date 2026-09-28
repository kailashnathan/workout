export type Mode = 'walk' | 'base' | 'push' | 'allout'

export type Segment = {
  sec: number
  mode: Mode
  incline: number
  block?: string
  label?: string
  note?: string
}

export type Settings = {
  base_mph: number
  push_mph: number
  allout_mph: number
  walk_mph: number
  walker_mph: number
  walker_mode: boolean
  stair_minutes: number
  rotation_index: number
  treadmill_index: number
}

export type Category = 'legs' | 'push' | 'pull' | 'core'

export type Exercise = {
  id: number
  name: string
  category: Category
  equipment: string | null
  default_sets: number
  default_reps: number
}

export type DayTemplate = {
  id: number
  position: number
  name: string
  exercise_ids: number[]
  stretch_items: string[]
}

export type TreadmillTemplate = {
  id: number
  name: string
  description: string | null
  segments: Segment[]
}

export type SetLog = {
  id: number
  session_id: number
  exercise_id: number | null
  exercise_name: string
  set_no: number
  reps: number
  weight: number
}

export type CardioLog = {
  id: number
  session_id: number
  kind: 'treadmill' | 'stair'
  duration_min: number | null
  distance_mi: number | null
  floors: number | null
  level: number | null
}

export type StretchLog = { id: number; session_id: number; item: string; done: boolean }

export type Session = {
  id: number
  started_at: string
  finished_at: string
  day_name: string | null
  treadmill_name: string | null
  notes: string | null
  set_logs: SetLog[]
  cardio_logs: CardioLog[]
  stretch_logs: StretchLog[]
}

export type TimerState = { runningSince: number | null; elapsedMs: number }

export type DraftSet = { reps: number; weight: number; done: boolean }

export type Draft = {
  clientId: string
  startedAt: string
  dayTemplateId: number
  dayName: string
  dayIndex: number
  treadmillTemplateId: number
  treadmillName: string
  treadmillDescription?: string | null
  treadmillIndex: number
  segments: Segment[]
  treadTimer: TimerState
  treadDistance: string
  stairTimer: TimerState
  stair: { minutes: string; floors: string; level: string }
  exercises: { exerciseId: number; name: string; sets: DraftSet[] }[]
  stretches: { item: string; done: boolean }[]
  notes: string
}
