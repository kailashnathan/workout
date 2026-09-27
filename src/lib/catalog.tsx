import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { loadCatalog, type Catalog } from './api'

type Ctx = { catalog: Catalog; reload: () => Promise<void> }
const CatalogContext = createContext<Ctx | null>(null)

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [catalog, setCatalog] = useState<Catalog | null>(null)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    try {
      setCatalog(await loadCatalog())
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  if (error && !catalog)
    return (
      <div className="p-6 text-center">
        <p className="text-red-400">Couldn't load: {error}</p>
        <button className="btn mt-4" onClick={reload}>
          Retry
        </button>
      </div>
    )
  if (!catalog) return <div className="p-6 text-center text-zinc-400">Loading…</div>
  return <CatalogContext.Provider value={{ catalog, reload }}>{children}</CatalogContext.Provider>
}

export function useCatalog() {
  const ctx = useContext(CatalogContext)
  if (!ctx) throw new Error('useCatalog outside CatalogProvider')
  return ctx
}
