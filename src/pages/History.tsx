import { useEffect, useState } from 'react'
import { deleteSession, listSessions, saveSessionEdits } from '../lib/api'
import { lb, liftTotals, summarizeSets } from '../lib/plan'
import type { Session } from '../lib/types'

export default function History() {
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<number | null>(null)

  const load = () =>
    listSessions()
      .then(setSessions)
      .catch((e) => setError(e.message))
  useEffect(() => {
    load()
  }, [])

  if (error) return <p className="p-6 text-red-400">{error}</p>
  if (!sessions) return <p className="p-6 text-zinc-400">Loading…</p>
  if (!sessions.length) return <p className="p-6 text-center text-zinc-400">No workouts yet. Go crush one.</p>

  return (
    <div className="space-y-3 p-4">
      <h1 className="pt-2 text-3xl font-bold">History</h1>
      {sessions.map((s) =>
        openId === s.id ? (
          <SessionEditor
            key={s.id}
            session={s}
            onClose={() => setOpenId(null)}
            onSaved={() => {
              setOpenId(null)
              load()
            }}
          />
        ) : (
          <button key={s.id} className="card block w-full text-left" onClick={() => setOpenId(s.id)}>
            <div className="flex justify-between">
              <span className="font-semibold">{s.day_name}</span>
              <span className="text-sm text-zinc-400">{new Date(s.started_at).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <p className="text-sm text-zinc-400">
              {s.treadmill_name}
              {cardioSummary(s)}
              {volumeOf(s.set_logs) > 0 && ` · ${lb(volumeOf(s.set_logs))} lifted`}
            </p>
          </button>
        ),
      )}
    </div>
  )
}

const volumeOf = (logs: Session['set_logs']) => liftTotals(logs.map((l) => ({ reps: l.reps, weight: Number(l.weight) }))).volume

function cardioSummary(s: Session) {
  const t = s.cardio_logs.find((c) => c.kind === 'treadmill')
  const st = s.cardio_logs.find((c) => c.kind === 'stair')
  return [t?.distance_mi != null && ` · ${t.distance_mi} mi`, st?.duration_min != null && ` · stair ${st.duration_min} min`]
    .filter(Boolean)
    .join('')
}

function groupSets(s: Session) {
  const groups = new Map<string, Session['set_logs']>()
  for (const l of [...s.set_logs].sort((a, b) => a.id - b.id)) groups.set(l.exercise_name, [...(groups.get(l.exercise_name) ?? []), l])
  return [...groups.entries()]
}

function SessionEditor({ session, onClose, onSaved }: { session: Session; onClose: () => void; onSaved: () => void }) {
  const [s, setS] = useState(session)
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)

  const setLog = (id: number, patch: Partial<Session['set_logs'][number]>) =>
    setS({ ...s, set_logs: s.set_logs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  const setCardio = (id: number, patch: Partial<Session['cardio_logs'][number]>) =>
    setS({ ...s, cardio_logs: s.cardio_logs.map((l) => (l.id === id ? { ...l, ...patch } : l)) })
  const n = (v: string) => (v === '' ? null : Number(v))

  async function save() {
    setBusy(true)
    try {
      await saveSessionEdits(s)
      onSaved()
    } catch (e) {
      alert((e as Error).message)
      setBusy(false)
    }
  }

  async function remove() {
    if (!confirm('Delete this workout?')) return
    await deleteSession(s.id)
    onSaved()
  }

  return (
    <div className="card space-y-3">
      <div className="flex justify-between">
        <div>
          <p className="font-semibold">{s.day_name}</p>
          <p className="text-sm text-zinc-400">
            {new Date(s.started_at).toLocaleString()} · {s.treadmill_name}
          </p>
        </div>
        <button className="text-zinc-400" onClick={onClose}>
          ✕
        </button>
      </div>

      {s.cardio_logs.map((c) => (
        <div key={c.id} className="text-sm">
          <p className="label">{c.kind}</p>
          {editing ? (
            <div className="mt-1 grid grid-cols-3 gap-2">
              <input className="input" inputMode="decimal" placeholder="min" value={c.duration_min ?? ''} onChange={(e) => setCardio(c.id, { duration_min: n(e.target.value) })} />
              {c.kind === 'treadmill' ? (
                <input className="input" inputMode="decimal" placeholder="mi" value={c.distance_mi ?? ''} onChange={(e) => setCardio(c.id, { distance_mi: n(e.target.value) })} />
              ) : (
                <>
                  <input className="input" inputMode="decimal" placeholder="floors" value={c.floors ?? ''} onChange={(e) => setCardio(c.id, { floors: n(e.target.value) })} />
                  <input className="input" inputMode="decimal" placeholder="level" value={c.level ?? ''} onChange={(e) => setCardio(c.id, { level: n(e.target.value) })} />
                </>
              )}
            </div>
          ) : (
            <p>
              {[c.duration_min != null && `${c.duration_min} min`, c.distance_mi != null && `${c.distance_mi} mi`, c.floors != null && `${c.floors} floors`, c.level != null && `level ${c.level}`]
                .filter(Boolean)
                .join(' · ') || '–'}
            </p>
          )}
        </div>
      ))}

      {groupSets(s).map(([name, logs]) => (
        <div key={name} className="text-sm">
          <p className="label">{name}</p>
          {editing ? (
            logs.map((l) => (
              <div key={l.id} className="mt-1 flex items-center gap-2">
                <span className="w-4 text-zinc-500">{l.set_no}</span>
                <input className="input" inputMode="decimal" value={l.weight} onChange={(e) => setLog(l.id, { weight: Number(e.target.value) || 0 })} />
                <span>lb ×</span>
                <input className="input" inputMode="numeric" value={l.reps} onChange={(e) => setLog(l.id, { reps: Number(e.target.value) || 0 })} />
              </div>
            ))
          ) : (
            <p>
              {summarizeSets(logs.map((l) => ({ reps: l.reps, weight: Number(l.weight) })))}
              {volumeOf(logs) > 0 && ` · ${lb(volumeOf(logs))} total`}{' '}
              <span className="text-zinc-500">({logs.map((l) => `${Number(l.weight)}×${l.reps}`).join(', ')})</span>
            </p>
          )}
        </div>
      ))}

      {s.stretch_logs.length > 0 && (
        <p className="text-sm text-zinc-400">
          Stretch: {s.stretch_logs.filter((x) => x.done).length}/{s.stretch_logs.length} done
        </p>
      )}

      {editing ? (
        <textarea className="input" rows={2} placeholder="Notes" value={s.notes ?? ''} onChange={(e) => setS({ ...s, notes: e.target.value })} />
      ) : (
        s.notes && <p className="text-sm whitespace-pre-wrap text-zinc-300">{s.notes}</p>
      )}

      <div className="flex gap-2">
        {editing ? (
          <button className="btn flex-1 bg-orange-500" disabled={busy} onClick={save}>
            Save
          </button>
        ) : (
          <button className="btn flex-1" onClick={() => setEditing(true)}>
            Edit
          </button>
        )}
        <button className="btn text-red-400" onClick={remove}>
          Delete
        </button>
      </div>
    </div>
  )
}
