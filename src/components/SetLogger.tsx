import type { Draft, DraftSet } from '../lib/types'

type Ex = Draft['exercises'][number]

export default function SetLogger({ exercise, onChange }: { exercise: Ex; onChange: (e: Ex) => void }) {
  const setSets = (sets: DraftSet[]) => onChange({ ...exercise, sets })
  // Weight/rep changes carry forward to later sets that aren't done yet.
  const update = (i: number, patch: Partial<DraftSet>) =>
    setSets(
      exercise.sets.map((s, j) => {
        if (j === i) return { ...s, ...patch }
        if (j > i && !s.done && patch.done === undefined) return { ...s, ...patch }
        return s
      }),
    )

  return (
    <div className="card space-y-2">
      <h3 className="text-lg font-semibold">{exercise.name}</h3>
      {exercise.sets.map((s, i) => (
        <div key={i} className={`flex items-center gap-2 ${s.done ? 'opacity-60' : ''}`}>
          <span className="w-5 text-sm text-zinc-500">{i + 1}</span>
          <Stepper value={s.weight} step={5} suffix="lb" onChange={(weight) => update(i, { weight })} />
          <Stepper value={s.reps} step={1} suffix="reps" onChange={(reps) => update(i, { reps })} />
          <button
            aria-label={`Set ${i + 1} done`}
            className={`ml-auto h-12 w-12 shrink-0 rounded-xl text-xl font-bold ${s.done ? 'bg-emerald-600' : 'bg-zinc-800'}`}
            onClick={() => update(i, { done: !s.done })}
          >
            ✓
          </button>
        </div>
      ))}
      <div className="flex gap-2 text-sm">
        <button
          className="text-orange-400"
          onClick={() => setSets([...exercise.sets, { ...(exercise.sets.at(-1) ?? { reps: 10, weight: 0 }), done: false }])}
        >
          + Add set
        </button>
        {exercise.sets.length > 0 && (
          <button className="ml-auto text-zinc-500" onClick={() => setSets(exercise.sets.slice(0, -1))}>
            Remove last
          </button>
        )}
      </div>
    </div>
  )
}

function Stepper({ value, step, suffix, onChange }: { value: number; step: number; suffix: string; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center rounded-xl bg-zinc-800">
      <button className="h-12 w-9 text-xl" onClick={() => onChange(Math.max(0, value - step))}>
        −
      </button>
      <label className="flex flex-col items-center">
        <input
          className="w-12 bg-transparent text-center text-lg font-semibold tabular-nums outline-none"
          inputMode="decimal"
          value={value}
          onChange={(e) => onChange(Number(e.target.value.replace(/[^\d.]/g, '')) || 0)}
        />
        <span className="-mt-1 text-[10px] text-zinc-500">{suffix}</span>
      </label>
      <button className="h-12 w-9 text-xl" onClick={() => onChange(value + step)}>
        +
      </button>
    </div>
  )
}
