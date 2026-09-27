import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { recentSetLogs } from '../lib/api'
import { useCatalog } from '../lib/catalog'
import { loadDraft, saveDraft } from '../lib/draft'
import { latestSetsByExercise, pick, prefillSets, summarizeSets } from '../lib/plan'
import type { Draft, Exercise, SetLog } from '../lib/types'
import { TreadmillPreview } from '../components/SegmentStrip'

export default function Today() {
  const { catalog } = useCatalog()
  const { settings, days, treadmills, exercises } = catalog
  const navigate = useNavigate()
  const draft = loadDraft()
  const [dayOffset, setDayOffset] = useState(0)
  const [treadOffset, setTreadOffset] = useState(0)
  const [last, setLast] = useState<Map<number, SetLog[]>>(new Map())

  const day = pick(days, settings.rotation_index + dayOffset)
  const tread = pick(treadmills, settings.treadmill_index + treadOffset)
  const dayExercises = useMemo(() => {
    const byId = new Map(exercises.map((e) => [e.id, e]))
    return (day?.item.exercise_ids ?? []).map((id) => byId.get(id)).filter((e): e is Exercise => !!e)
  }, [day, exercises])

  useEffect(() => {
    recentSetLogs(dayExercises.map((e) => e.id))
      .then((logs) => setLast(latestSetsByExercise(logs)))
      .catch(() => {})
  }, [dayExercises])

  if (!day || !tread)
    return (
      <div className="p-6 text-center text-zinc-400">
        Add at least one day and one treadmill template in <Link className="text-orange-400" to="/settings">Settings</Link>.
      </div>
    )

  function start() {
    const d: Draft = {
      clientId: crypto.randomUUID(),
      startedAt: new Date().toISOString(),
      dayTemplateId: day!.item.id,
      dayName: day!.item.name,
      dayIndex: day!.index,
      treadmillTemplateId: tread!.item.id,
      treadmillName: tread!.item.name,
      treadmillIndex: tread!.index,
      segments: tread!.item.segments,
      treadTimer: { runningSince: null, elapsedMs: 0 },
      treadDistance: '',
      stairTimer: { runningSince: null, elapsedMs: 0 },
      stair: { minutes: String(settings.stair_minutes), floors: '', level: '' },
      exercises: dayExercises.map((e) => ({ exerciseId: e.id, name: e.name, sets: prefillSets(e, last.get(e.id)) })),
      stretches: day!.item.stretch_items.map((item) => ({ item, done: false })),
      notes: '',
    }
    saveDraft(d)
    navigate('/workout')
  }

  return (
    <div className="space-y-4 p-4">
      <header className="flex items-center justify-between pt-2">
        <div>
          <p className="label">
            Day {day.index + 1} of {days.length}
          </p>
          <h1 className="text-3xl font-bold">{day.item.name}</h1>
        </div>
        <Cycle onPrev={() => setDayOffset(dayOffset - 1)} onNext={() => setDayOffset(dayOffset + 1)} />
      </header>

      {draft && (
        <Link to="/workout" className="block rounded-2xl bg-orange-500/15 p-4 font-semibold text-orange-300">
          Workout in progress: {draft.dayName}. Tap to resume →
        </Link>
      )}

      <section className="card space-y-2">
        <div className="flex items-start justify-between">
          <div>
            <p className="label">Treadmill</p>
            <h2 className="text-xl font-semibold">{tread.item.name}</h2>
            {tread.item.description && <p className="text-sm text-zinc-400">{tread.item.description}</p>}
          </div>
          <Cycle onPrev={() => setTreadOffset(treadOffset - 1)} onNext={() => setTreadOffset(treadOffset + 1)} />
        </div>
        <TreadmillPreview segments={tread.item.segments} settings={settings} />
        {settings.walker_mode && <p className="text-xs text-sky-300">Walker mode: push/all-out = more incline, not more speed.</p>}
      </section>

      <section className="card">
        <p className="label">Stairmaster</p>
        <p className="text-lg font-semibold">{settings.stair_minutes} min</p>
      </section>

      {dayExercises.length > 0 && (
        <section className="card space-y-2">
          <p className="label">Strength</p>
          <ul className="space-y-1">
            {dayExercises.map((e) => {
              const prev = last.get(e.id)
              return (
                <li key={e.id} className="flex justify-between">
                  <span>{e.name}</span>
                  <span className="text-zinc-400 tabular-nums">
                    {prev ? summarizeSets(prev.map((l) => ({ reps: l.reps, weight: Number(l.weight) }))) : `${e.default_sets}×${e.default_reps}`}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {day.item.stretch_items.length > 0 && (
        <section className="card">
          <p className="label">Stretch & mobility</p>
          <ul className="list-inside list-disc text-zinc-300">
            {day.item.stretch_items.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </section>
      )}

      {!draft && (
        <button className="btn-primary w-full" onClick={start}>
          Start workout
        </button>
      )}
    </div>
  )
}

function Cycle({ onPrev, onNext }: { onPrev: () => void; onNext: () => void }) {
  return (
    <div className="flex gap-1">
      <button aria-label="Previous" className="btn px-3 py-2" onClick={onPrev}>
        ‹
      </button>
      <button aria-label="Next" className="btn px-3 py-2" onClick={onNext}>
        ›
      </button>
    </div>
  )
}
