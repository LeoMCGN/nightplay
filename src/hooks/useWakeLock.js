import { useEffect, useRef } from 'react'

export function useWakeLock() {
  const wakeLockRef = useRef(null)

  async function acquire() {
    if (!('wakeLock' in navigator)) return
    try {
      wakeLockRef.current = await navigator.wakeLock.request('screen')
    } catch {
      // permission refusée ou navigateur non supporté — silencieux
    }
  }

  useEffect(() => {
    acquire()

    // L'API relâche automatiquement le lock quand l'onglet passe en arrière-plan.
    // On le réacquiert dès que la page redevient visible.
    function onVisibilityChange() {
      if (document.visibilityState === 'visible') acquire()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
      wakeLockRef.current?.release()
    }
  }, [])
}
