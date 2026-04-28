import { useState, useCallback } from 'react'

export function useGameState(items) {
  const [used, setUsed] = useState([])
  const [pool, setPool] = useState(() => shuffle([...items]))

  function shuffle(arr) {
    const a = [...arr]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  const draw = useCallback(() => {
    if (pool.length === 0) {
      // Tout vu : on reshufle
      const newPool = shuffle([...items])
      const item = newPool.pop()
      setPool(newPool)
      setUsed([item])
      return item
    }
    const newPool = [...pool]
    const item = newPool.pop()
    setPool(newPool)
    setUsed(u => [...u, item])
    return item
  }, [pool, items])

  return { draw, remaining: pool.length }
}
