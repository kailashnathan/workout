import { useEffect, useState } from 'react'
import type { TimerState } from './types'

export const elapsedMs = (t: TimerState, now = Date.now()) => t.elapsedMs + (t.runningSince ? now - t.runningSince : 0)

// Timestamp-based so it survives screen lock, tab switches and reloads.
export function useTimer(state: TimerState, setState: (t: TimerState) => void) {
  const [now, setNow] = useState(Date.now())
  const running = state.runningSince !== null

  useEffect(() => {
    if (!running) return
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [running])

  useEffect(() => {
    if (!running || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    const acquire = () => navigator.wakeLock.request('screen').then((l) => (lock = l)).catch(() => {})
    const onVisible = () => document.visibilityState === 'visible' && acquire()
    acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release()
    }
  }, [running])

  return {
    elapsedSec: elapsedMs(state, running ? now : undefined) / 1000,
    running,
    start: () => setState({ runningSince: Date.now(), elapsedMs: state.elapsedMs }),
    pause: () => setState({ runningSince: null, elapsedMs: elapsedMs(state) }),
    seek: (sec: number) =>
      setState({ runningSince: running ? Date.now() : null, elapsedMs: Math.max(0, sec * 1000) }),
  }
}

let audio: AudioContext | null = null
export function beep(freq = 880, ms = 150) {
  try {
    audio ??= new AudioContext()
    const osc = audio.createOscillator()
    const gain = audio.createGain()
    osc.frequency.value = freq
    gain.gain.value = 0.2
    osc.connect(gain).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + ms / 1000)
  } catch {
    // audio unavailable
  }
  navigator.vibrate?.(ms)
}
