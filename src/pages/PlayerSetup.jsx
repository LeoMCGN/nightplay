import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '../components/Layout'
import Button from '../components/Button'
import { useGame } from '../context/GameContext'
import { GAMES } from '../data/games'

const TIMER_OPTS = [
  { label: '1 min',  value: 60  },
  { label: '2 min',  value: 120 },
  { label: '3 min',  value: 180 },
  { label: '5 min',  value: 300 },
]


export default function PlayerSetup() {
  const { gameId } = useParams()
  const navigate   = useNavigate()
  const { players, addPlayer, removePlayer, setCurrentGame } = useGame()
  const [input, setInput] = useState('')

  // Options Imposteur
  const [discussionTime,  setDiscussionTime]  = useState(120)
  const [manchesTotal,    setManchesTotal]    = useState(3)
  const [imposteurKnows,  setImposteurKnows]  = useState(true)

  const game = GAMES.find(g => g.id === gameId)
  if (!game) { navigate('/'); return null }

  function handleAdd() {
    const trimmed = input.trim()
    if (!trimmed || players.length >= game.maxPlayers) return
    addPlayer(trimmed)
    setInput('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleAdd()
  }

  function handleStart() {
    if (players.length < game.minPlayers) return
    setCurrentGame(gameId)
    const options = gameId === 'imposteur' ? { discussionTime, manchesTotal, imposteurKnows } : {}
    navigate(game.route, { state: { options } })
  }

  return (
    <Layout>
      <div className="mb-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-sm mb-6"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ← Retour
        </button>
        <div className="flex items-center gap-3 mb-1">
          <span className="text-3xl">{game.emoji}</span>
          <h2 className="text-2xl font-bold text-white">{game.name}</h2>
        </div>
        <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {game.minPlayers}–{game.maxPlayers} joueurs requis
        </p>
      </div>

      {/* Saisie joueurs */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Prénom du joueur..."
          maxLength={20}
          className="flex-1 rounded-2xl px-4 py-3 text-white text-base outline-none focus:ring-2 focus:ring-violet-500"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
        />
        <Button onClick={handleAdd} disabled={!input.trim() || players.length >= game.maxPlayers} size="md">
          +
        </Button>
      </div>

      <AnimatePresence>
        {players.length === 0 && (
          <motion.p
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="text-center py-8"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Ajoute au moins {game.minPlayers} joueurs pour commencer
          </motion.p>
        )}
      </AnimatePresence>

      <div className="flex flex-col gap-2 mb-6">
        <AnimatePresence>
          {players.map((name, i) => (
            <motion.div
              key={`${name}-${i}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="flex items-center justify-between rounded-2xl px-4 py-3"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{ background: game.color + '30', color: game.color }}
                >
                  {i + 1}
                </span>
                <span className="font-semibold text-white">{name}</span>
              </div>
              <button
                onClick={() => removePlayer(i)}
                className="text-gray-500 hover:text-red-400 transition-colors text-lg leading-none"
              >
                ✕
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Options Imposteur */}
      {gameId === 'imposteur' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4 mb-6 flex flex-col gap-5"
          style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(124,58,237,0.3)' }}
        >
          <p className="text-sm font-semibold text-white">🕵️ Options de jeu</p>

          {/* Nombre de manches */}
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Nombre de manches
            </p>
            <div className="flex gap-2">
              {[1, 3, 5, 7, null].map(n => (
                <motion.button
                  key={n ?? 'inf'}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setManchesTotal(n)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: manchesTotal === n ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${manchesTotal === n ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`,
                    color: manchesTotal === n ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {n ?? '∞'}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Timer */}
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
              Durée de discussion
            </p>
            <div className="flex gap-2">
              {TIMER_OPTS.map(opt => (
                <motion.button
                  key={opt.value}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setDiscussionTime(opt.value)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: discussionTime === opt.value ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${discussionTime === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`,
                    color: discussionTime === opt.value ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
          </div>

          {/* L'imposteur connaît son rôle ? */}
          <div>
            <p className="text-sm mb-2" style={{ color: 'var(--color-text-muted)' }}>
              L'imposteur connaît son rôle ?
            </p>
            <div className="flex gap-2">
              {[
                { label: 'Oui', value: true },
                { label: 'Non — mode difficile', value: false },
              ].map(opt => (
                <motion.button
                  key={String(opt.value)}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setImposteurKnows(opt.value)}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold"
                  style={{
                    background: imposteurKnows === opt.value ? 'rgba(124,58,237,0.4)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${imposteurKnows === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`,
                    color: imposteurKnows === opt.value ? '#fff' : 'var(--color-text-muted)',
                  }}
                >
                  {opt.label}
                </motion.button>
              ))}
            </div>
            {!imposteurKnows && (
              <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                L'imposteur verra un mot normal, sans savoir qu'il est l'imposteur.
              </p>
            )}
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {players.length >= game.minPlayers && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
          >
            <Button onClick={handleStart} fullWidth size="lg" variant="primary">
              Lancer le jeu 🚀
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  )
}
