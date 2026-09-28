import { useState, type ReactNode } from 'react'
import * as api from '../lib/api'
import { useCatalog } from '../lib/catalog'
import { fmt, MODE_LABEL, totalSec } from '../lib/pace'
import { supabase } from '../lib/supabase'
import type { Category, DayTemplate, Exercise, Mode, Segment, Settings, TreadmillTemplate } from '../lib/types'
import { Strip } from '../components/SegmentStrip'

const CATEGORIES: Category[] = ['legs', 'push', 'pull', 'core']
const MODES: Mode[] = ['walk', 'base', 'push', 'allout']

function useSaver() {
  const { reload } = useCatalog()
  const [busy, setBusy] = useState(false)
  return {
    busy,
    run: async (fn: () => Promise<unknown>) => {
      setBusy(true)
      try {
        await fn()
        await reload()
        return true
      } catch (e) {
        alert((e as Error).message)
        return false
      } finally {
        setBusy(false)
      }
    },
  }
}

export default function SettingsPage() {
  return (
    <div className="space-y-6 p-4">
      <h1 className="pt-2 text-3xl font-bold">Settings</h1>
      <PaceSettings />
      <Rotation />
      <Exercises />
      <Treadmills />
      <button className="btn w-full text-zinc-400" onClick={() => supabase.auth.signOut()}>
        Sign out
      </button>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </section>
  )
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="space-y-1">
      <span className="label">{label}</span>
      <input className="input" type="number" step="0.1" inputMode="decimal" value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

function PaceSettings() {
  const { catalog } = useCatalog()
  const [s, setS] = useState<Settings>(catalog.settings)
  const { busy, run } = useSaver()
  const set = (patch: Partial<Settings>) => setS({ ...s, ...patch })

  return (
    <Section title="Paces">
      <div className="card space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <NumField label="Base mph" value={s.base_mph} onChange={(base_mph) => set({ base_mph })} />
          <NumField label="Push mph" value={s.push_mph} onChange={(push_mph) => set({ push_mph })} />
          <NumField label="All out mph" value={s.allout_mph} onChange={(allout_mph) => set({ allout_mph })} />
          <NumField label="Walk mph" value={s.walk_mph} onChange={(walk_mph) => set({ walk_mph })} />
          <NumField label="Power walk" value={s.walker_mph} onChange={(walker_mph) => set({ walker_mph })} />
          <NumField label="Stair min" value={s.stair_minutes} onChange={(stair_minutes) => set({ stair_minutes })} />
        </div>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-6 w-6 accent-orange-500" checked={s.walker_mode} onChange={(e) => set({ walker_mode: e.target.checked })} />
          <span>
            <b>Walker mode</b>
            <span className="block text-sm text-zinc-400">
              Push/all-out raise the incline (+4% / +8%) at power-walk speed instead of running faster. Check with your doctor/PT on
              running and sprinting with the ACL.
            </span>
          </span>
        </label>
        <button
          className="btn w-full"
          disabled={busy}
          onClick={() =>
            run(() =>
              api.updateSettings({
                base_mph: s.base_mph,
                push_mph: s.push_mph,
                allout_mph: s.allout_mph,
                walk_mph: s.walk_mph,
                walker_mph: s.walker_mph,
                walker_mode: s.walker_mode,
                stair_minutes: s.stair_minutes,
              }),
            )
          }
        >
          Save paces
        </button>
      </div>
    </Section>
  )
}

function Rotation() {
  const { catalog } = useCatalog()
  const { days, settings } = catalog
  const [openId, setOpenId] = useState<number | 'new' | null>(null)
  const { busy, run } = useSaver()
  const nextIdx = days.length ? ((settings.rotation_index % days.length) + days.length) % days.length : -1

  const move = (i: number, dir: -1 | 1) => {
    const a = days[i]
    const b = days[i + dir]
    if (!b) return
    run(async () => {
      await api.upsertDay({ ...a, position: b.position })
      await api.upsertDay({ ...b, position: a.position })
    })
  }

  return (
    <Section title="Rotation">
      <div className="space-y-2">
        {days.map((d, i) =>
          openId === d.id ? (
            <DayEditor key={d.id} day={d} onDone={() => setOpenId(null)} />
          ) : (
            <div key={d.id} className="card flex items-center gap-2">
              <button className="flex-1 text-left" onClick={() => setOpenId(d.id)}>
                <span className="text-zinc-500">{i + 1}.</span> {d.name}
                {i === nextIdx && <span className="ml-2 rounded bg-orange-500/20 px-2 py-0.5 text-xs text-orange-300">next</span>}
              </button>
              {i !== nextIdx && (
                <button className="text-xs text-zinc-400" disabled={busy} onClick={() => run(() => api.updateSettings({ rotation_index: i }))}>
                  Make next
                </button>
              )}
              <button className="btn px-2 py-1" disabled={busy || i === 0} onClick={() => move(i, -1)}>
                ↑
              </button>
              <button className="btn px-2 py-1" disabled={busy || i === days.length - 1} onClick={() => move(i, 1)}>
                ↓
              </button>
            </div>
          ),
        )}
        {openId === 'new' ? (
          <DayEditor
            day={{ position: (days.at(-1)?.position ?? 0) + 1, name: '', exercise_ids: [], stretch_items: ['Stretching / mobility (5 min)'] }}
            onDone={() => setOpenId(null)}
          />
        ) : (
          <button className="text-orange-400" onClick={() => setOpenId('new')}>
            + Add day
          </button>
        )}
      </div>
    </Section>
  )
}

function DayEditor({ day, onDone }: { day: Omit<DayTemplate, 'id'> & { id?: number }; onDone: () => void }) {
  const { catalog } = useCatalog()
  const [d, setD] = useState(day)
  const [newItem, setNewItem] = useState('')
  const { busy, run } = useSaver()
  const byId = new Map(catalog.exercises.map((e) => [e.id, e]))

  const toggle = (id: number) =>
    setD({ ...d, exercise_ids: d.exercise_ids.includes(id) ? d.exercise_ids.filter((x) => x !== id) : [...d.exercise_ids, id] })

  return (
    <div className="card space-y-3">
      <input className="input" placeholder="Day name" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
      <div>
        <p className="label mb-1">Exercises (in order)</p>
        <ol className="mb-2 list-inside list-decimal text-sm">
          {d.exercise_ids.map((id) => (
            <li key={id}>{byId.get(id)?.name ?? '(deleted)'}</li>
          ))}
        </ol>
        {CATEGORIES.map((c) => (
          <div key={c} className="mb-2">
            <p className="text-xs text-zinc-500 capitalize">{c}</p>
            <div className="flex flex-wrap gap-1">
              {catalog.exercises
                .filter((e) => e.category === c)
                .map((e) => (
                  <button
                    key={e.id}
                    onClick={() => toggle(e.id)}
                    className={`rounded-full px-3 py-1 text-sm ${d.exercise_ids.includes(e.id) ? 'bg-orange-500 text-white' : 'bg-zinc-800 text-zinc-300'}`}
                  >
                    {e.name}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </div>
      <div>
        <p className="label mb-1">Stretch & mobility checklist</p>
        {d.stretch_items.map((s, i) => (
          <div key={i} className="flex items-center justify-between py-1 text-sm">
            <span>{s}</span>
            <button className="text-zinc-500" onClick={() => setD({ ...d, stretch_items: d.stretch_items.filter((_, j) => j !== i) })}>
              ✕
            </button>
          </div>
        ))}
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!newItem.trim()) return
            setD({ ...d, stretch_items: [...d.stretch_items, newItem.trim()] })
            setNewItem('')
          }}
        >
          <input className="input" placeholder="Add item (e.g. PT exercise)" value={newItem} onChange={(e) => setNewItem(e.target.value)} />
          <button className="btn">Add</button>
        </form>
      </div>
      <div className="flex gap-2">
        <button className="btn flex-1 bg-orange-500" disabled={busy || !d.name.trim()} onClick={() => run(() => api.upsertDay(d)).then((ok) => ok && onDone())}>
          Save
        </button>
        <button className="btn" onClick={onDone}>
          Cancel
        </button>
        {d.id && (
          <button
            className="btn text-red-400"
            disabled={busy}
            onClick={() => confirm(`Delete "${d.name}"?`) && run(() => api.deleteDay(d.id!)).then((ok) => ok && onDone())}
          >
            Delete
          </button>
        )}
      </div>
    </div>
  )
}

const emptyExercise: Omit<Exercise, 'id'> & { id?: number } = { name: '', category: 'legs', equipment: '', default_sets: 3, default_reps: 10 }

function Exercises() {
  const { catalog } = useCatalog()
  const [form, setForm] = useState(emptyExercise)
  const { busy, run } = useSaver()

  return (
    <Section title="Exercises">
      <div className="card space-y-1">
        {catalog.exercises.map((e) => (
          <div key={e.id} className="flex items-center gap-2 py-1 text-sm">
            <button className="flex-1 text-left" onClick={() => setForm(e)}>
              {e.name}{' '}
              <span className="text-zinc-500">
                · {e.category} · {e.default_sets}×{e.default_reps}
              </span>
            </button>
            <button
              className="text-zinc-500"
              disabled={busy}
              onClick={() => confirm(`Delete ${e.name}? Past logs are kept.`) && run(() => api.deleteExercise(e.id))}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div className="card space-y-2">
        <p className="label">{form.id ? 'Edit exercise' : 'New exercise'}</p>
        <input className="input" placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input className="input" placeholder="Equipment" value={form.equipment ?? ''} onChange={(e) => setForm({ ...form, equipment: e.target.value })} />
          <NumField label="Sets" value={form.default_sets} onChange={(default_sets) => setForm({ ...form, default_sets })} />
          <NumField label="Reps" value={form.default_reps} onChange={(default_reps) => setForm({ ...form, default_reps })} />
        </div>
        <div className="flex gap-2">
          <button
            className="btn flex-1"
            disabled={busy || !form.name.trim()}
            onClick={() => run(() => api.upsertExercise(form)).then((ok) => ok && setForm(emptyExercise))}
          >
            {form.id ? 'Save' : 'Add exercise'}
          </button>
          {form.id && (
            <button className="btn" onClick={() => setForm(emptyExercise)}>
              Cancel
            </button>
          )}
        </div>
      </div>
    </Section>
  )
}

function Treadmills() {
  const { catalog } = useCatalog()
  const [open, setOpen] = useState<(Omit<TreadmillTemplate, 'id'> & { id?: number }) | null>(null)

  return (
    <Section title="Treadmill templates">
      {open ? (
        <TreadmillEditor template={open} onDone={() => setOpen(null)} />
      ) : (
        <div className="space-y-2">
          {catalog.treadmills.map((t) => (
            <button key={t.id} className="card block w-full space-y-2 text-left" onClick={() => setOpen(t)}>
              <div className="flex justify-between">
                <span>{t.name}</span>
                <span className="text-sm text-zinc-400">{fmt(totalSec(t.segments))}</span>
              </div>
              <Strip segments={t.segments} />
            </button>
          ))}
          <button
            className="text-orange-400"
            onClick={() => setOpen({ name: '', description: '', segments: [{ sec: 180, mode: 'walk', incline: 1 }] })}
          >
            + New template
          </button>
        </div>
      )}
    </Section>
  )
}

function TreadmillEditor({ template, onDone }: { template: Omit<TreadmillTemplate, 'id'> & { id?: number }; onDone: () => void }) {
  const [t, setT] = useState(template)
  const { busy, run } = useSaver()
  const setSeg = (i: number, patch: Partial<Segment>) => setT({ ...t, segments: t.segments.map((s, j) => (j === i ? { ...s, ...patch } : s)) })

  return (
    <div className="card space-y-3">
      <input className="input" placeholder="Name" value={t.name} onChange={(e) => setT({ ...t, name: e.target.value })} />
      <input className="input" placeholder="Description" value={t.description ?? ''} onChange={(e) => setT({ ...t, description: e.target.value })} />
      <Strip segments={t.segments} />
      <p className="text-sm text-zinc-400">Total {fmt(totalSec(t.segments))}</p>
      <div className="space-y-1">
        <div className="grid grid-cols-[1fr_4.5rem_4rem_2rem] gap-1 text-xs text-zinc-500">
          <span>Mode</span>
          <span>Seconds</span>
          <span>Incline %</span>
        </div>
        {t.segments.map((s, i) => (
          <div key={i} className="space-y-1 border-b border-zinc-800 pb-2">
            <div className="grid grid-cols-[1fr_4.5rem_4rem_2rem] items-center gap-1">
              <select className="input px-2 py-2" value={s.mode} onChange={(e) => setSeg(i, { mode: e.target.value as Mode })}>
                {MODES.map((m) => (
                  <option key={m} value={m}>
                    {MODE_LABEL[m]}
                  </option>
                ))}
              </select>
              <input className="input px-2 py-2" type="number" inputMode="numeric" value={s.sec} onChange={(e) => setSeg(i, { sec: Number(e.target.value) })} />
              <input className="input px-2 py-2" type="number" inputMode="decimal" value={s.incline} onChange={(e) => setSeg(i, { incline: Number(e.target.value) })} />
              <button className="text-zinc-500" onClick={() => setT({ ...t, segments: t.segments.filter((_, j) => j !== i) })}>
                ✕
              </button>
            </div>
            <div className="grid grid-cols-[6rem_1fr_1fr] gap-1">
              {(
                [
                  ['block', 'Block'],
                  ['label', 'Label'],
                  ['note', 'Cue, e.g. PW @ 5%+'],
                ] as const
              ).map(([k, placeholder]) => (
                <input
                  key={k}
                  className="input px-2 py-1.5 text-sm"
                  placeholder={placeholder}
                  value={s[k] ?? ''}
                  onChange={(e) => setSeg(i, { [k]: e.target.value || undefined })}
                />
              ))}
            </div>
          </div>
        ))}
        <button className="text-sm text-orange-400" onClick={() => setT({ ...t, segments: [...t.segments, { ...(t.segments.at(-1) ?? { sec: 60, mode: 'base', incline: 1 }) }] })}>
          + Add segment
        </button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          className="btn flex-1 bg-orange-500"
          disabled={busy || !t.name.trim() || !t.segments.length}
          onClick={() => run(() => api.upsertTreadmill(t)).then((ok) => ok && onDone())}
        >
          Save
        </button>
        <button className="btn" onClick={onDone}>
          Cancel
        </button>
        {t.id && (
          <>
            <button className="btn" disabled={busy} onClick={() => run(() => api.upsertTreadmill({ ...t, id: undefined, name: `${t.name} (copy)` })).then((ok) => ok && onDone())}>
              Duplicate
            </button>
            <button className="btn text-red-400" disabled={busy} onClick={() => confirm(`Delete "${t.name}"?`) && run(() => api.deleteTreadmill(t.id!)).then((ok) => ok && onDone())}>
              Delete
            </button>
          </>
        )}
      </div>
    </div>
  )
}
