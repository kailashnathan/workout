import { expect, it } from 'vitest'
import { elapsedMs } from './useTimer'

it('elapsedMs never goes below the seek point when the UI clock lags', () => {
  expect(elapsedMs({ runningSince: 10_000, elapsedMs: 60_000 }, 9_800)).toBe(60_000)
  expect(elapsedMs({ runningSince: 10_000, elapsedMs: 60_000 }, 12_000)).toBe(62_000)
  expect(elapsedMs({ runningSince: null, elapsedMs: 5_000 }, 99_999)).toBe(5_000)
})
