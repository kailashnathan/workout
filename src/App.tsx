import { lazy, Suspense, useEffect, useState } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './lib/supabase'
import { CatalogProvider } from './lib/catalog'
import Login from './pages/Login'
import Today from './pages/Today'
import Workout from './pages/Workout'
import History from './pages/History'
import SettingsPage from './pages/Settings'

const Progress = lazy(() => import('./pages/Progress'))

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return null
  if (!session) return <Login />

  return (
    <CatalogProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </CatalogProvider>
  )
}

const TABS = [
  { to: '/', label: 'Today' },
  { to: '/history', label: 'History' },
  { to: '/progress', label: 'Progress' },
  { to: '/settings', label: 'Settings' },
]

function Shell() {
  const inWorkout = useLocation().pathname.startsWith('/workout')
  return (
    <div className="mx-auto min-h-dvh max-w-lg pb-20">
      <Routes>
        <Route path="/" element={<Today />} />
        <Route path="/workout" element={<Workout />} />
        <Route path="/history" element={<History />} />
        <Route
          path="/progress"
          element={
            <Suspense fallback={<p className="p-6 text-zinc-400">Loading…</p>}>
              <Progress />
            </Suspense>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
      {!inWorkout && (
        <nav className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 pb-[env(safe-area-inset-bottom)]">
          <div className="mx-auto flex max-w-lg">
            {TABS.map((t) => (
              <NavLink
                key={t.to}
                to={t.to}
                end
                className={({ isActive }) =>
                  `flex-1 py-4 text-center text-sm font-medium ${isActive ? 'text-orange-500' : 'text-zinc-400'}`
                }
              >
                {t.label}
              </NavLink>
            ))}
          </div>
        </nav>
      )}
    </div>
  )
}
