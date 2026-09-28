import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import IntervalTimer from '../components/IntervalTimer'
import SetLogger from '../components/SetLogger'
import { finishSession } from '../lib/api'
import { useCatalog } from '../lib/catalog'
import { clearDraft, loadDraft, saveDraft } from '../lib/draft'
import { estimateDistance, fmt } from '../lib/pace'
import { lb, liftTotals } from '../lib/plan'
import type { Draft, TimerState } from '../lib/types'
import { changeBeep, useTimer } from '../lib/useTimer'

const STEPS = ['Tread', 'Stair', 'Strength', 'Stretch', 'Finish'] as const
type Step = (typeof STEPS)[number]

export default function Workout() {
  const { catalog, reload } = useCatalog()
  const navigate = useNavigate()
  const [draft, setDraftState] = useState<Draft | null>(loadDraft)
  const [step, setStep] = useState<Step>('Tread')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = useCallback((patch: Partial<Draft>) => {
    setDraftState((d) => {
      if (!d) return d
      const next = { ...d, ...patch }
      saveDraft(next)
      return next
    })
  }, [])
  const onTreadTimer = useCallback((treadTimer: TimerState) => update({ treadTimer }), [update])
  const onStairTimer = useCallback((stairTimer: TimerState) => update({ stairTimer }), [update])

  if (!draft) return <Navigate to="/" replace />

  const steps = STEPS.filter((s) => (s === 'Strength' ? draft.exercises.length > 0 : s === 'Stretch' ? draft.stretches.length > 0 : true))
  const stepIdx = steps.indexOf(step)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      await finishSession(draft!, catalog)
      clearDraft()
      await reload()
      navigate('/', { replace: true })
    } catch (e) {
      setError(`${(e as Error).message}. Your workout is still saved on this phone. Try again.`)
      setSaving(false)
    }
  }

  function discard() {
    if (!confirm('Discard this workout?')) return
    clearDraft()
    navigate('/', { replace: true })
  }

  const estimate = estimateDistance(draft.segments, catalog.settings, draft.treadTimer.elapsedMs / 1000)

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        className={`sticky top-0 z-10 px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-2 ${step === 'Tread' ? 'bg-transparent' : 'bg-zinc-950/95'}`}
      >
        <div className="mb-2 flex items-center justify-between">
          <button className="text-sm text-zinc-400" onClick={() => navigate('/')}>
            ← Home
          </button>
          <span className="text-sm font-semibold">{draft.dayName}</span>
        </div>
        <div className="flex gap-1">
          {steps.map((s) => (
            <button
              key={s}
              onClick={() => setStep(s)}
              className={`flex-1 rounded-lg py-2 text-sm font-medium ${
                s === step ? 'bg-orange-500 text-white' : step === 'Tread' ? 'bg-white/10 text-white/70' : 'bg-zinc-900 text-zinc-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4">
        {step === 'Tread' && (
          <IntervalTimer
            name={draft.treadmillName}
            description={draft.treadmillDescription}
            segments={draft.segments}
            settings={catalog.settings}
            timer={draft.treadTimer}
            onTimer={onTreadTimer}
            onNext={() => setStep(steps[1])}
            nextLabel={steps[1] === 'Stair' ? 'Stairmaster' : steps[1]}
          />
        )}

        {step === 'Stair' && (
          <StairStep draft={draft} targetMin={catalog.settings.stair_minutes} update={update} onTimer={onStairTimer} />
        )}

        {step === 'Strength' &&
          draft.exercises.map((e, i) => (
            <SetLogger
              key={e.exerciseId}
              exercise={e}
              onChange={(ex) => update({ exercises: draft.exercises.map((x, j) => (j === i ? ex : x)) })}
            />
          ))}

        {step === 'Stretch' && (
          <div className="card space-y-1">
            {draft.stretches.map((s, i) => (
              <label key={i} className="flex items-center gap-3 py-2 text-lg">
                <input
                  type="checkbox"
                  className="h-6 w-6 accent-emerald-600"
                  checked={s.done}
                  onChange={() => update({ stretches: draft.stretches.map((x, j) => (j === i ? { ...x, done: !x.done } : x)) })}
                />
                {s.item}
              </label>
            ))}
          </div>
        )}

        {step === 'Finish' && (
          <div className="space-y-4">
            <div className="card space-y-1 text-zinc-300">
              <p>Treadmill: {fmt(draft.treadTimer.elapsedMs / 1000)}</p>
              <p>Stair: {draft.stair.minutes || '–'} min</p>
            </div>
            {draft.exercises.length > 0 && <StrengthSummary draft={draft} update={update} />}
            <label className="block space-y-1">
              <span className="label">Treadmill distance (mi)</span>
              <input
                className="input"
                inputMode="decimal"
                placeholder={`${estimate} (estimated)`}
                value={draft.treadDistance}
                onChange={(e) => update({ treadDistance: e.target.value })}
              />
            </label>
            <label className="block space-y-1">
              <span className="label">Notes</span>
              <textarea
                className="input"
                rows={3}
                placeholder="How did the knee feel? Energy?"
                value={draft.notes}
                onChange={(e) => update({ notes: e.target.value })}
              />
            </label>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button className="btn-primary w-full" disabled={saving} onClick={save}>
              {saving ? 'Saving…' : 'Save workout'}
            </button>
            <button className="w-full py-2 text-sm text-zinc-500" onClick={discard}>
              Discard workout
            </button>
          </div>
        )}
      </main>

      {step !== 'Finish' && step !== 'Tread' && (
        <footer className="p-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
          <button className="btn w-full" onClick={() => setStep(steps[stepIdx + 1])}>
            Next: {steps[stepIdx + 1]} →
          </button>
        </footer>
      )}
    </div>
  )
}

type StairProps = { draft: Draft; targetMin: number; update: (p: Partial<Draft>) => void; onTimer: (t: TimerState) => void }

function StairStep({ draft, targetMin, update, onTimer }: StairProps) {
  const { elapsedSec, running, start, pause, seek } = useTimer(draft.stairTimer, onTimer)
  const targetSec = targetMin * 60
  const beeped = useRef(elapsedSec >= targetSec)

  useEffect(() => {
    if (running && targetSec > 0 && elapsedSec >= targetSec && !beeped.current) {
      beeped.current = true
      changeBeep()
    }
  }, [running, elapsedSec, targetSec])

  const setStair = (patch: Partial<Draft['stair']>) => update({ stair: { ...draft.stair, ...patch } })

  return (
    <div className="space-y-4">
      <div className="rounded-3xl bg-zinc-900 p-6 text-center">
        <p className="label">Stairmaster</p>
        <p className="my-2 text-7xl font-black tabular-nums">{fmt(elapsedSec)}</p>
        <p className="text-zinc-400">target {fmt(targetSec)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <button
          className="btn"
          onClick={() => {
            seek(0)
            beeped.current = false
          }}
        >
          Reset
        </button>
        <button
          className="btn-primary col-span-2"
          onClick={() => {
            if (running) {
              pause()
              if (elapsedSec >= 60) setStair({ minutes: String(Math.round(elapsedSec / 6) / 10) })
            } else start()
          }}
        >
          {running ? 'Pause' : elapsedSec > 0 ? 'Resume' : 'Start'}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            ['minutes', 'Minutes'],
            ['floors', 'Floors'],
            ['level', 'Level'],
          ] as const
        ).map(([k, label]) => (
          <label key={k} className="space-y-1">
            <span className="label">{label}</span>
            <input className="input" inputMode="decimal" value={draft.stair[k]} onChange={(e) => setStair({ [k]: e.target.value })} />
          </label>
        ))}
      </div>
    </div>
  )
}

function StrengthSummary({ draft, update }: { draft: Draft; update: (p: Partial<Draft>) => void }) {
  const unticked = draft.exercises.reduce((n, e) => n + e.sets.filter((s) => !s.done).length, 0)
  const all = liftTotals(draft.exercises.flatMap((e) => e.sets.filter((s) => s.done)))

  return (
    <div className="card space-y-2">
      <p className="label">Strength</p>
      {draft.exercises.map((e) => {
        const t = liftTotals(e.sets.filter((s) => s.done))
        return (
          <div key={e.exerciseId} className="flex justify-between gap-2 text-sm">
            <span>{e.name}</span>
            <span className="text-right text-zinc-400 tabular-nums">
              {t.sets === 0 ? 'no sets' : `${t.sets} set${t.sets > 1 ? 's' : ''}${t.volume > 0 ? ` · top ${lb(t.top)} · ${lb(t.volume)}` : ''}`}
            </span>
          </div>
        )
      })}
      {all.volume > 0 && <p className="border-t border-zinc-800 pt-2 text-sm font-semibold">Total lifted: {lb(all.volume)}</p>}
      {unticked > 0 && (
        <div className="rounded-xl bg-amber-500/15 p-3 text-sm text-amber-200">
          {unticked} set{unticked > 1 ? 's' : ''} not ticked ✓ won't be saved.
          <button
            className="mt-2 block font-semibold text-amber-100 underline"
            onClick={() => update({ exercises: draft.exercises.map((e) => ({ ...e, sets: e.sets.map((s) => ({ ...s, done: true })) })) })}
          >
            Mark all sets done
          </button>
        </div>
      )}
    </div>
  )
}
