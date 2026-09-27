import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listSessions } from '../lib/api'
import type { Session } from '../lib/types'

const MARK = '#ea580c'
const AXIS = { stroke: '#71717a', fontSize: 12, tickLine: false, axisLine: false } as const
const TOOLTIP = {
  contentStyle: { background: '#27272a', border: 'none', borderRadius: 12, color: '#f4f4f5' },
  labelStyle: { color: '#a1a1aa' },
  cursor: { stroke: '#52525b', fill: '#ffffff10' },
}

const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })

function startOfWeek(d = new Date()) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7))
  return x
}

export default function Progress() {
  const [sessions, setSessions] = useState<Session[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [exercise, setExercise] = useState<string>('Leg Press')

  useEffect(() => {
    listSessions()
      .then((s) => setSessions([...s].reverse()))
      .catch((e) => setError(e.message))
  }, [])

  const exerciseNames = useMemo(
    () => [...new Set((sessions ?? []).flatMap((s) => s.set_logs.map((l) => l.exercise_name)))].sort(),
    [sessions],
  )

  if (error) return <p className="p-6 text-red-400">{error}</p>
  if (!sessions) return <p className="p-6 text-zinc-400">Loading…</p>

  const weekStart = startOfWeek()
  const thisWeek = sessions.filter((s) => new Date(s.started_at) >= weekStart).length
  const last30 = sessions.filter((s) => Date.now() - new Date(s.started_at).getTime() < 30 * 864e5).length
  const cardio = (s: Session, kind: 'treadmill' | 'stair') => s.cardio_logs.find((c) => c.kind === kind)

  const liftData = sessions
    .map((s) => {
      const logs = s.set_logs.filter((l) => l.exercise_name === exercise)
      if (!logs.length) return null
      return { date: shortDate(s.started_at), weight: Math.max(...logs.map((l) => Number(l.weight))), reps: Math.max(...logs.map((l) => l.reps)) }
    })
    .filter((d) => d !== null)
  const liftIsWeighted = liftData.some((d) => d.weight > 0)

  const treadData = sessions
    .map((s) => ({ date: shortDate(s.started_at), miles: cardio(s, 'treadmill')?.distance_mi }))
    .filter((d) => d.miles != null)
  const stairData = sessions
    .map((s) => ({ date: shortDate(s.started_at), minutes: cardio(s, 'stair')?.duration_min }))
    .filter((d) => d.minutes != null)

  return (
    <div className="space-y-4 p-4">
      <h1 className="pt-2 text-3xl font-bold">Progress</h1>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="This week" value={`${thisWeek}/5`} />
        <Stat label="Last 30 days" value={String(last30)} />
        <Stat label="All time" value={String(sessions.length)} />
      </div>

      {sessions.length === 0 ? (
        <p className="pt-6 text-center text-zinc-400">Charts appear after your first workout.</p>
      ) : (
        <>
          <section className="card space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">{liftIsWeighted ? 'Top set weight (lb)' : 'Best reps'}</h2>
              <select className="rounded-lg bg-zinc-800 px-2 py-1 text-sm" value={exercise} onChange={(e) => setExercise(e.target.value)}>
                {!exerciseNames.includes(exercise) && <option>{exercise}</option>}
                {exerciseNames.map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </div>
            {liftData.length ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={liftData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid vertical={false} stroke="#27272a" />
                  <XAxis dataKey="date" {...AXIS} />
                  <YAxis {...AXIS} domain={['auto', 'auto']} />
                  <Tooltip {...TOOLTIP} />
                  <Line
                    type="monotone"
                    dataKey={liftIsWeighted ? 'weight' : 'reps'}
                    name={liftIsWeighted ? 'lb' : 'reps'}
                    stroke={MARK}
                    strokeWidth={2}
                    dot={{ r: 4, fill: MARK, stroke: '#18181b', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-zinc-500">No sets logged for {exercise} yet.</p>
            )}
          </section>

          <BarCard title="Treadmill distance (mi)" data={treadData} dataKey="miles" />
          <BarCard title="Stairmaster (min)" data={stairData} dataKey="minutes" />
        </>
      )}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <p className="text-2xl font-bold tabular-nums">{value}</p>
      <p className="text-xs text-zinc-400">{label}</p>
    </div>
  )
}

function BarCard({ title, data, dataKey }: { title: string; data: object[]; dataKey: string }) {
  return (
    <section className="card space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {data.length ? (
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#27272a" />
            <XAxis dataKey="date" {...AXIS} />
            <YAxis {...AXIS} />
            <Tooltip {...TOOLTIP} />
            <Bar dataKey={dataKey} fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <p className="text-sm text-zinc-500">Nothing logged yet.</p>
      )}
    </section>
  )
}
