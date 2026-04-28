import { createContext, useContext, useState } from 'react'

const GameContext = createContext(null)

const initialState = {
  players: [],
  currentGame: null,
  currentPlayerIndex: 0,
  round: 1,
}

export function GameProvider({ children }) {
  const [state, setState] = useState(initialState)

  function addPlayer(name) {
    const trimmed = name.trim()
    if (!trimmed) return
    setState(s => ({ ...s, players: [...s.players, trimmed] }))
  }

  function removePlayer(index) {
    setState(s => ({
      ...s,
      players: s.players.filter((_, i) => i !== index),
    }))
  }

  function nextPlayer() {
    setState(s => {
      const nextIndex = (s.currentPlayerIndex + 1) % s.players.length
      const newRound = nextIndex === 0 ? s.round + 1 : s.round
      return { ...s, currentPlayerIndex: nextIndex, round: newRound }
    })
  }

  function resetGame() {
    setState(s => ({ ...s, currentPlayerIndex: 0, round: 1 }))
  }

  function setCurrentGame(gameId) {
    setState(s => ({ ...s, currentGame: gameId, currentPlayerIndex: 0, round: 1 }))
  }

  function clearPlayers() {
    setState(initialState)
  }

  return (
    <GameContext.Provider value={{ ...state, addPlayer, removePlayer, nextPlayer, resetGame, setCurrentGame, clearPlayers }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  const ctx = useContext(GameContext)
  if (!ctx) throw new Error('useGame must be used inside GameProvider')
  return ctx
}
