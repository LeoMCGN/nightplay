import { useState, useEffect } from 'react'
import { useWakeLock } from '../../hooks/useWakeLock'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '../../components/Layout'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useGame } from '../../context/GameContext'
import data from '../../data/action-verite.json'

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const JOKERS_MAX = 3

const CATEGORY_DEFS = [
  { id: 'tout_public', label: data.categories.tout_public.label, emoji: data.categories.tout_public.emoji, color: '#3B82F6' },
  { id: 'hard',       label: data.categories.hard.label,       emoji: data.categories.hard.emoji,       color: '#6B7280' },
  { id: 'hot',        label: data.categories.hot.label,        emoji: data.categories.hot.emoji,        color: '#EC4899' },
]

const RATIO_OPTS = [
  { label: '50 / 50',     value: 0.5 },
  { label: '70% Action',  value: 0.7 },
  { label: '70% Vérité',  value: 0.3 },
  { label: 'Full Action', value: 1   },
  { label: 'Full Vérité', value: 0   },
]

export default function ActionVerite() {
  const navigate = useNavigate()
  const { players, currentPlayerIndex, round, nextPlayer } = useGame()
  useWakeLock()

  useEffect(() => {
    if (players.length === 0) navigate('/')
  }, [])

  // ── Setup ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('categories')
  const [selectedCats, setSelectedCats] = useState({ tout_public: true, hard: false, hot: false })
  const [drawMode, setDrawMode] = useState('libre')   // 'libre' | 'aleatoire'
  const [ratio, setRatio] = useState(0.5)             // prob. d'action en mode aléatoire

  // ── Pools ─────────────────────────────────────────────────────────────────
  const [actions, setActions] = useState([])
  const [verites, setVerites] = useState([])
  const [actionIdx, setActionIdx] = useState(0)
  const [veriteIdx, setVeriteIdx] = useState(0)

  // ── Jokers ────────────────────────────────────────────────────────────────
  const [jokersLeft, setJokersLeft] = useState({})   // { playerName: int }

  // ── Carte ─────────────────────────────────────────────────────────────────
  const [choice, setChoice] = useState(null)
  const [flipped, setFlipped] = useState(false)
  const [currentCard, setCurrentCard] = useState('')
  const [showQuit, setShowQuit] = useState(false)

  // ── Helpers ───────────────────────────────────────────────────────────────
  function buildPools(cats) {
    let a = [], v = []
    Object.entries(cats).forEach(([id, on]) => {
      if (on) {
        a = a.concat(data.categories[id].actions)
        v = v.concat(data.categories[id].verites)
      }
    })
    return { actions: shuffle(a), verites: shuffle(v) }
  }

  function handleStartGame() {
    if (!Object.values(selectedCats).some(Boolean)) return
    const { actions: a, verites: v } = buildPools(selectedCats)
    setActions(a)
    setVerites(v)
    setActionIdx(0)
    setVeriteIdx(0)
    // Initialiser les jokers par joueur
    const jokers = {}
    players.forEach(p => { jokers[p] = JOKERS_MAX })
    setJokersLeft(jokers)
    setPhase('choose')
  }

  function toggleCat(id) {
    setSelectedCats(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function handleChoice(type) {
    setChoice(type)
    let card
    if (type === 'action') {
      card = actions[actionIdx % actions.length]
      if (actionIdx + 1 >= actions.length) {
        const { actions: a } = buildPools(selectedCats)
        setActions(a); setActionIdx(0)
      } else { setActionIdx(i => i + 1) }
    } else {
      card = verites[veriteIdx % verites.length]
      if (veriteIdx + 1 >= verites.length) {
        const { verites: v } = buildPools(selectedCats)
        setVerites(v); setVeriteIdx(0)
      } else { setVeriteIdx(i => i + 1) }
    }
    setCurrentCard(card)
    setPhase('reveal')
    setTimeout(() => setFlipped(true), 50)
  }

  // En mode aléatoire : tirage pondéré selon ratio
  function handleAutoChoice() {
    const type = Math.random() < ratio ? 'action' : 'verite'
    handleChoice(type)
  }

  function handleNext() {
    setFlipped(false)
    setPhase('choose')
    setChoice(null)
    setCurrentCard('')
    nextPlayer()
  }

  // Passer son tour (joker) — utilisable depuis la reveal, réinitialise la carte
  function handleJoker() {
    setJokersLeft(prev => ({ ...prev, [currentPlayer]: prev[currentPlayer] - 1 }))
    setFlipped(false)
    setPhase('choose')
    setChoice(null)
    setCurrentCard('')
    nextPlayer()
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const currentPlayer = players[currentPlayerIndex] || players[0]
  const isAction      = choice === 'action'
  const cardGradient  = isAction
    ? 'linear-gradient(135deg, #F97316, #EF4444)'
    : 'linear-gradient(135deg, #7C3AED, #EC4899)'
  const activeCatLabels = CATEGORY_DEFS.filter(c => selectedCats[c.id]).map(c => c.emoji).join(' ')
  const currentJokers   = jokersLeft[currentPlayer] ?? JOKERS_MAX

  return (
    <Layout>
      {/* Header (hors setup) */}
      {phase !== 'categories' && (
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => setShowQuit(true)}
            className="text-sm"
            style={{ color: 'var(--color-text-muted)' }}
          >
            ✕ Quitter
          </button>
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
              Tour {round} · {activeCatLabels}
            </p>
            <p className="text-lg font-bold text-white">{currentPlayer}</p>
          </div>
          <div className="text-right">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {currentPlayerIndex + 1}/{players.length}
            </p>
            {currentJokers > 0 && (
              <p className="text-xs" style={{ color: '#F97316' }}>
                🃏 ×{currentJokers}
              </p>
            )}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">

        {/* ── SETUP : CATÉGORIES + MODE ──────────────────────────────────── */}
        {phase === 'categories' && (
          <motion.div
            key="categories"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            <div>
              <button
                onClick={() => navigate('/')}
                className="text-sm mb-6 block"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-white mb-1">Choisissez l'ambiance</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Une ou plusieurs catégories
              </p>
            </div>

            {/* Catégories */}
            <div className="flex flex-col gap-3">
              {CATEGORY_DEFS.map(cat => {
                const active = selectedCats[cat.id]
                return (
                  <motion.button
                    key={cat.id}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => toggleCat(cat.id)}
                    className="flex items-center justify-between rounded-2xl px-5 py-4 text-left"
                    style={{
                      background: active ? `${cat.color}20` : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${active ? cat.color : 'rgba(255,255,255,0.08)'}`,
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{cat.emoji}</span>
                      <span className="font-bold text-white">{cat.label}</span>
                    </div>
                    <div
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                      style={{
                        borderColor: active ? cat.color : 'rgba(255,255,255,0.3)',
                        background: active ? cat.color : 'transparent',
                      }}
                    >
                      {active && <span className="text-white text-xs font-bold">✓</span>}
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* Mode de tirage */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Mode de tirage</p>
              <div className="flex gap-2">
                {[
                  { id: 'libre',    label: 'Choix libre' },
                  { id: 'aleatoire', label: 'Aléatoire 🎲' },
                ].map(m => (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setDrawMode(m.id)}
                    className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                    style={{
                      background: drawMode === m.id ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${drawMode === m.id ? '#7C3AED' : 'rgba(255,255,255,0.08)'}`,
                      color: drawMode === m.id ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {m.label}
                  </motion.button>
                ))}
              </div>

              {/* Ratio — visible seulement en mode aléatoire */}
              <AnimatePresence>
                {drawMode === 'aleatoire' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <p className="text-xs mt-4 mb-2" style={{ color: 'var(--color-text-muted)' }}>
                      Ratio Action / Vérité
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      {RATIO_OPTS.map(opt => (
                        <motion.button
                          key={opt.label}
                          whileTap={{ scale: 0.96 }}
                          onClick={() => setRatio(opt.value)}
                          className="px-3 py-2 rounded-xl text-xs font-semibold"
                          style={{
                            background: ratio === opt.value ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${ratio === opt.value ? '#F97316' : 'rgba(255,255,255,0.1)'}`,
                            color: ratio === opt.value ? '#F97316' : 'var(--color-text-muted)',
                          }}
                        >
                          {opt.label}
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <Button
              onClick={handleStartGame}
              fullWidth
              size="lg"
              disabled={!Object.values(selectedCats).some(Boolean)}
            >
              C'est parti ! 🎯
            </Button>
          </motion.div>
        )}

        {/* ── CHOIX ─────────────────────────────────────────────────────────── */}
        {phase === 'choose' && (
          <motion.div
            key="choose"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-6 py-8"
          >
            <p className="text-2xl font-bold text-white text-center">
              {currentPlayer}, tu choisis ?
            </p>

            {drawMode === 'libre' ? (
              <div className="flex gap-4 w-full max-w-sm">
                <Button variant="orange" size="lg" fullWidth onClick={() => handleChoice('action')}>
                  <span className="text-2xl">⚡</span> Action
                </Button>
                <Button variant="rose" size="lg" fullWidth onClick={() => handleChoice('verite')}>
                  <span className="text-2xl">💬</span> Vérité
                </Button>
              </div>
            ) : (
              <Button variant="primary" size="lg" onClick={handleAutoChoice}>
                <span className="text-2xl">🎲</span> Tirer une carte
              </Button>
            )}

          </motion.div>
        )}

        {/* ── REVEAL ────────────────────────────────────────────────────────── */}
        {phase === 'reveal' && (
          <motion.div
            key="reveal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-4"
          >
            <div className="card-flip-container w-full max-w-sm" style={{ height: 280 }}>
              <div className={`card-flip-inner ${flipped ? 'flipped' : ''}`}>
                <div
                  className="card-face flex items-center justify-center"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="text-6xl">{isAction ? '⚡' : '💬'}</span>
                </div>
                <div
                  className="card-face card-back flex items-center justify-center p-8 text-center"
                  style={{ background: cardGradient }}
                >
                  <p className="text-white font-bold text-xl leading-relaxed">{currentCard}</p>
                </div>
              </div>
            </div>

            <span
              className="text-sm font-semibold px-4 py-1 rounded-full"
              style={{
                background: isAction ? 'rgba(249,115,22,0.2)' : 'rgba(124,58,237,0.2)',
                color: isAction ? '#F97316' : '#7C3AED',
              }}
            >
              {isAction ? '⚡ Action' : '💬 Vérité'}
            </span>

            <Button variant="primary" size="lg" onClick={handleNext} fullWidth>
              Suivant →
            </Button>

            {/* Joker */}
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={handleJoker}
              disabled={currentJokers === 0}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(249,115,22,0.1)',
                border: '1px solid rgba(249,115,22,0.3)',
                color: '#F97316',
              }}
            >
              🃏 Passer cette carte
              <span
                className="px-2 py-0.5 rounded-full text-xs"
                style={{ background: 'rgba(249,115,22,0.2)' }}
              >
                {currentJokers}/{JOKERS_MAX}
              </span>
            </motion.button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Barre joueurs */}
      {phase !== 'categories' && (
        <div className="flex gap-2 flex-wrap justify-center mt-8">
          {players.map((p, i) => (
            <span
              key={i}
              className="text-xs px-3 py-1 rounded-full font-semibold"
              style={{
                background: i === currentPlayerIndex ? 'rgba(124,58,237,0.3)' : 'rgba(255,255,255,0.05)',
                color: i === currentPlayerIndex ? '#7C3AED' : 'var(--color-text-muted)',
                border: i === currentPlayerIndex ? '1px solid #7C3AED' : '1px solid transparent',
              }}
            >
              {p}
              {jokersLeft[p] < JOKERS_MAX && (
                <span className="ml-1 opacity-60">{'🃏'.repeat(jokersLeft[p])}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <Modal
        open={showQuit}
        title="Quitter la partie ?"
        message="Tu vas revenir à l'accueil. La progression sera perdue."
        confirmLabel="Quitter"
        cancelLabel="Continuer"
        confirmVariant="danger"
        onConfirm={() => navigate('/')}
        onCancel={() => setShowQuit(false)}
      />
    </Layout>
  )
}
