import { useState, useEffect, useRef, useCallback } from 'react'
import { useWakeLock } from '../../hooks/useWakeLock'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '../../components/Layout'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useGame } from '../../context/GameContext'
import data from '../../data/imposteur.json'

function secureRandInt(max) {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % max
}

export default function Imposteur() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const { players } = useGame()
  useWakeLock()

  const discussionTime  = location.state?.options?.discussionTime ?? 120
  const manchesTotal    = location.state?.options?.manchesTotal   ?? null  // null = illimité

  useEffect(() => {
    if (players.length === 0) navigate('/')
  }, [])

  // ── Round state ───────────────────────────────────────────────────────────
  const [motCommun,     setMotCommun]     = useState(null)
  const [motImposteur,  setMotImposteur]  = useState(null)
  const [imposteurIndex, setImposteurIndex] = useState(null)
  const [wordMap,       setWordMap]       = useState([])

  const [phase,             setPhase]             = useState('distribution')
  const [currentDistribIdx, setCurrentDistribIdx] = useState(0)
  const [showingWord,       setShowingWord]        = useState(false)
  const [wordVisible,       setWordVisible]        = useState(false)

  const [timer,          setTimer]         = useState(discussionTime)
  const timerRef = useRef(null)

  const [votes,          setVotes]         = useState({})
  const [currentVoterIdx, setCurrentVoterIdx] = useState(0)

  // ── Scores multi-manches ─────────────────────────────────────────────────
  const [scores, setScores] = useState(() => {
    const s = {}
    players.forEach(p => { s[p] = 0 })
    return s
  })
  const [manche, setManche] = useState(1)

  // ── Round result (calculé une fois lors du dernier vote) ──────────────────
  const [roundResult, setRoundResult] = useState(null)

  const [showQuit, setShowQuit] = useState(false)

  // ── Initialisation d'un round ─────────────────────────────────────────────
  const initRound = useCallback(() => {
    const paire  = data.paires[secureRandInt(data.paires.length)]
    const impIdx = secureRandInt(players.length)

    const map = players.map((player, i) => {
      const isImp = i === impIdx
      return {
        player,
        word: isImp ? paire.imposteur : paire.commun,
        isImposteur: isImp,
      }
    })

    setMotCommun(paire.commun)
    setMotImposteur(paire.imposteur)
    setImposteurIndex(impIdx)
    setWordMap(map)
    setPhase('distribution')
    setCurrentDistribIdx(0)
    setShowingWord(false)
    setWordVisible(false)
    setTimer(discussionTime)
    setVotes({})
    setCurrentVoterIdx(0)
    setRoundResult(null)
  }, [players, discussionTime])

  useEffect(() => { initRound() }, [])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase === 'discussion') {
      timerRef.current = setInterval(() => {
        setTimer(t => {
          if (t <= 1) { clearInterval(timerRef.current); setPhase('vote'); return 0 }
          return t - 1
        })
      }, 1000)
    }
    return () => clearInterval(timerRef.current)
  }, [phase])

  // ── Animation de révélation (suspense 2.5s) ───────────────────────────────
  useEffect(() => {
    if (phase === 'revealing') {
      const t = setTimeout(() => setPhase('result'), 2600)
      return () => clearTimeout(t)
    }
  }, [phase])

  // ── Handlers ──────────────────────────────────────────────────────────────
  function stopDiscussion() {
    clearInterval(timerRef.current)
    setPhase('vote')
  }

  function handleSeeWord() {
    setWordVisible(true)
    setTimeout(() => {
      setWordVisible(false)
      setTimeout(() => {
        if (currentDistribIdx + 1 >= players.length) {
          setPhase('discussion')
        } else {
          setCurrentDistribIdx(i => i + 1)
        }
        setShowingWord(false)
      }, 300)
    }, 3000)
  }

  function calcTally(finalVotes) {
    const tally = {}
    Object.values(finalVotes).forEach(v => { tally[v] = (tally[v] || 0) + 1 })
    const maxVotes = Object.values(tally).length ? Math.max(...Object.values(tally)) : 0
    const accused = Object.keys(tally).filter(k => tally[k] === maxVotes)
    const imposteurName = wordMap[imposteurIndex]?.player
    const found = accused.includes(imposteurName)
    return { tally, imposteurName, found }
  }

  function handleVote(suspectName) {
    const newVotes = { ...votes, [players[currentVoterIdx]]: suspectName }
    setVotes(newVotes)

    if (currentVoterIdx + 1 >= players.length) {
      // Dernier vote : calculer résultat + mettre à jour scores
      const result = calcTally(newVotes)
      setRoundResult(result)

      setScores(prev => {
        const s = { ...prev }
        if (result.found) {
          // Le groupe a trouvé : tous les non-imposteurs +1
          players.forEach(p => { if (p !== result.imposteurName) s[p] = (s[p] || 0) + 1 })
        } else {
          // L'imposteur gagne : +2
          s[result.imposteurName] = (s[result.imposteurName] || 0) + 2
        }
        return s
      })
      setPhase('revealing')
    } else {
      setCurrentVoterIdx(i => i + 1)
    }
  }

  function handleNewManche() {
    setManche(m => m + 1)
    initRound()
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const formatTime    = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const timerPercent  = (timer / discussionTime) * 100
  const currentEntry  = wordMap[currentDistribIdx]
  const sortedScores  = [...players].sort((a, b) => (scores[b] || 0) - (scores[a] || 0))

  if (wordMap.length === 0) return null

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => setShowQuit(true)} className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
          ✕ Quitter
        </button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-sm font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(124,58,237,0.2)', color: '#7C3AED' }}>
            🕵️ Manche {manche}{manchesTotal ? ` / ${manchesTotal}` : ''}
          </span>
        </div>
        {/* Mini scoreboard header */}
        {manche > 1 && (
          <div className="text-right text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {sortedScores.slice(0, 2).map(p => (
              <div key={p}>{p} · {scores[p] || 0}pts</div>
            ))}
          </div>
        )}
        {manche === 1 && <div style={{ width: 60 }} />}
      </div>

      <AnimatePresence mode="wait">

        {/* ── DISTRIBUTION ─────────────────────────────────────────────────── */}
        {phase === 'distribution' && (
          <motion.div
            key={`distrib-${currentDistribIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center text-center gap-6"
          >
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Passe le téléphone à</p>
              <h2 className="text-4xl font-bold text-white">{currentEntry?.player}</h2>
            </div>

            <div
              className="w-full max-w-xs rounded-2xl p-8 flex flex-col items-center gap-4"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {!showingWord ? (
                <>
                  <span className="text-5xl">👁</span>
                  <p className="text-white">Appuie pour voir ton mot</p>
                  <Button variant="primary" size="lg" onClick={() => { setShowingWord(true); handleSeeWord() }}>
                    Voir mon mot
                  </Button>
                </>
              ) : (
                <AnimatePresence>
                  {wordVisible && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="flex flex-col items-center gap-3"
                    >
                      {currentEntry?.isImposteur ? (
                        <>
                          <span className="text-4xl">⚠️</span>
                          <p className="text-xl font-bold text-orange-400">Tu es l'IMPOSTEUR !</p>
                          <div className="h-px w-full" style={{ background: 'rgba(249,115,22,0.3)' }} />
                          <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ton mot (différent des autres) :</p>
                          <p className="text-3xl font-bold text-orange-400">{currentEntry?.word}</p>
                        </>
                      ) : (
                        <>
                          <span className="text-5xl">🃏</span>
                          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Ton mot :</p>
                          <p className="text-4xl font-bold text-white">{currentEntry?.word}</p>
                        </>
                      )}
                      <p className="text-xs mt-2" style={{ color: 'var(--color-text-muted)' }}>
                        Disparaît dans 3 secondes…
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </div>

            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {currentDistribIdx + 1} / {players.length}
            </p>
          </motion.div>
        )}

        {/* ── DISCUSSION ───────────────────────────────────────────────────── */}
        {phase === 'discussion' && (
          <motion.div
            key="discussion"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Discussion</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Décrivez votre mot à tour de rôle — sans le dire. Un joueur a un mot légèrement différent…
              </p>
            </div>

            <div className="w-full max-w-xs">
              <div
                className="text-center text-5xl font-title mb-3"
                style={{ color: timerPercent < 25 ? '#EF4444' : '#F9FAFB' }}
              >
                {formatTime(timer)}
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                <motion.div
                  className="h-2 rounded-full"
                  animate={{ width: `${timerPercent}%` }}
                  transition={{ duration: 0.5 }}
                  style={{ background: timerPercent < 25 ? '#EF4444' : '#7C3AED' }}
                />
              </div>
            </div>

            <Button variant="secondary" size="md" onClick={stopDiscussion}>
              Passer au vote →
            </Button>
          </motion.div>
        )}

        {/* ── VOTE ─────────────────────────────────────────────────────────── */}
        {phase === 'vote' && (
          <motion.div
            key={`vote-${currentVoterIdx}`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="text-center">
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Vote de</p>
              <h2 className="text-3xl font-bold text-white">{players[currentVoterIdx]}</h2>
              <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Qui a un mot différent ?
              </p>
            </div>
            <div className="flex flex-col gap-2">
              {players.filter(p => p !== players[currentVoterIdx]).map(suspect => (
                <motion.button
                  key={suspect}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleVote(suspect)}
                  className="w-full rounded-2xl px-5 py-4 text-left font-semibold text-white"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  🕵️ {suspect}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── ANIMATION DE RÉVÉLATION ──────────────────────────────────────── */}
        {phase === 'revealing' && (
          <motion.div
            key="revealing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-8 py-6"
          >
            <motion.p
              className="text-2xl font-bold text-white text-center"
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            >
              ⚡ Dépouillement…
            </motion.p>

            {/* Noms qui clignotent */}
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {players.map((p, i) => (
                <motion.div
                  key={p}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.15 }}
                  className="flex items-center justify-between rounded-2xl px-5 py-3"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                >
                  <span className="font-semibold text-white">🕵️ {p}</span>
                  <motion.span
                    className="text-lg"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    ···
                  </motion.span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── RÉSULTAT ─────────────────────────────────────────────────────── */}
        {phase === 'result' && roundResult && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center gap-5 text-center"
          >
            {/* Verdict */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {roundResult.found ? (
                <>
                  <div className="text-6xl mb-3">🎉</div>
                  <h2 className="text-3xl font-bold text-white mb-1">Démasqué !</h2>
                  <p className="text-green-400 font-semibold">Le groupe a trouvé l'imposteur.</p>
                </>
              ) : (
                <>
                  <div className="text-6xl mb-3">🕵️</div>
                  <h2 className="text-3xl font-bold text-white mb-1">L'imposteur a gagné !</h2>
                  <p className="text-orange-400 font-semibold">Personne n'a vu la différence.</p>
                </>
              )}
            </motion.div>

            {/* Révélation des mots */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="w-full rounded-2xl p-5 text-left"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-muted)' }}>
                Révélation
              </p>
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Mot commun (tous sauf l'imposteur)
                  </p>
                  <p className="text-2xl font-bold" style={{ color: '#7C3AED' }}>{motCommun}</p>
                </div>
                <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                <div>
                  <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                    Mot de l'imposteur · {roundResult.imposteurName}
                  </p>
                  <p className="text-2xl font-bold text-orange-400">{motImposteur}</p>
                </div>
              </div>
            </motion.div>

            {/* Votes */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="w-full rounded-2xl p-4"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}
            >
              <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Votes</p>
              {Object.entries(roundResult.tally)
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => (
                  <div key={name} className="flex justify-between text-sm py-1">
                    <span className={name === roundResult.imposteurName ? 'text-orange-400 font-bold' : 'text-white'}>
                      {name}
                    </span>
                    <span style={{ color: name === roundResult.imposteurName ? '#EC4899' : 'var(--color-text-muted)' }}>
                      {count} vote{count > 1 ? 's' : ''}{name === roundResult.imposteurName && ' 🕵️'}
                    </span>
                  </div>
                ))}
            </motion.div>

            {/* Scoreboard */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="w-full rounded-2xl p-4"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}
            >
              <p className="text-sm font-semibold mb-3" style={{ color: '#7C3AED' }}>
                {manchesTotal && manche >= manchesTotal ? '🏆 Classement final' : `🏆 Scores — Manche ${manche}`}
              </p>
              {sortedScores.map((p, i) => (
                <div key={p} className="flex items-center justify-between py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs w-4" style={{ color: 'var(--color-text-muted)' }}>
                      {i + 1}.
                    </span>
                    <span className={`text-sm font-semibold ${p === roundResult.imposteurName ? 'text-orange-400' : 'text-white'}`}>
                      {p}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="h-1.5 rounded-full"
                      style={{
                        width: `${Math.max(4, (scores[p] || 0) * 12)}px`,
                        background: p === roundResult.imposteurName ? '#F97316' : '#7C3AED',
                        minWidth: '4px',
                      }}
                    />
                    <span className="text-sm font-bold text-white w-8 text-right">
                      {scores[p] || 0}
                      <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--color-text-muted)' }}>pts</span>
                    </span>
                  </div>
                </div>
              ))}
            </motion.div>

            {/* Actions */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
              className="flex gap-3 w-full"
            >
              <Button variant="ghost" onClick={() => navigate('/')}>Menu</Button>
              {manchesTotal === null || manche < manchesTotal ? (
                <Button variant="secondary" fullWidth onClick={handleNewManche}>
                  Manche {manche + 1}{manchesTotal ? ` / ${manchesTotal}` : ''} →
                </Button>
              ) : (
                <Button variant="primary" fullWidth onClick={() => navigate('/')}>
                  🏆 Fin de partie
                </Button>
              )}
            </motion.div>
          </motion.div>
        )}

      </AnimatePresence>

      <Modal
        open={showQuit}
        title="Quitter la partie ?"
        message="Tu vas revenir à l'accueil."
        confirmLabel="Quitter"
        cancelLabel="Continuer"
        confirmVariant="danger"
        onConfirm={() => navigate('/')}
        onCancel={() => setShowQuit(false)}
      />
    </Layout>
  )
}
