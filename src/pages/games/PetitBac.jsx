import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'
import Button from '../../components/Button'

// ── Constantes ────────────────────────────────────────────────────────────────

const LETTERS = 'ABCDEFGHIJLMNOPRST'.split('')

const ALL_CATEGORIES = [
  { id: 'prenom',    label: 'Prénom' },
  { id: 'ville',     label: 'Ville' },
  { id: 'pays',      label: 'Pays' },
  { id: 'animal',    label: 'Animal' },
  { id: 'metier',    label: 'Métier' },
  { id: 'fruit',     label: 'Fruit / Légume' },
  { id: 'objet',     label: 'Objet' },
  { id: 'marque',    label: 'Marque' },
  { id: 'film',      label: 'Film' },
  { id: 'serie',     label: 'Série' },
  { id: 'sport',     label: 'Sport' },
  { id: 'jeu_video', label: 'Jeu vidéo' },
]

const TIMER_OPTIONS = [
  { label: 'Sans timer', value: 0 },
  { label: '60s',        value: 60 },
  { label: '90s',        value: 90 },
  { label: '2 min',      value: 120 },
]

const ROUND_OPTIONS = [
  { label: 'Libre', value: 0 },
  { label: '3',     value: 3 },
  { label: '5',     value: 5 },
  { label: '10',    value: 10 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function randomLetter() {
  return LETTERS[Math.floor(Math.random() * LETTERS.length)]
}

function normalizeAnswer(str) {
  return str.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

function computePoints(answers) {
  const normalized = answers.map(a => normalizeAnswer(a.answer))
  return answers.map((a, i) => {
    if (!normalized[i]) return { ...a, points: 0 }
    const count = normalized.filter(n => n && n === normalized[i]).length
    return { ...a, points: count > 1 ? 1 : 2 }
  })
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function PetitBac() {
  const navigate = useNavigate()

  // Phase : entry | lobby | playing | revealing | scores | finished
  const [phase, setPhase] = useState('entry')

  // Identité locale
  const [myName, setMyName]         = useState('')
  const [myPlayerId, setMyPlayerId] = useState(null)
  const [joinCode, setJoinCode]     = useState('')
  const [joinError, setJoinError]   = useState('')

  // État du jeu (miroir Supabase)
  const [room, setRoom]                   = useState(null)
  const [players, setPlayers]             = useState([])
  const [currentRound, setCurrentRound]   = useState(null)
  const [answers, setAnswers]             = useState([])

  // Saisie locale (phase playing)
  const [myAnswers, setMyAnswers] = useState({})

  // Timer
  const [timeLeft, setTimeLeft]         = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef(null)

  // Config lobby (host uniquement)
  const [hostCategories, setHostCategories] = useState(
    Object.fromEntries(ALL_CATEGORIES.map(c => [c.id, true]))
  )
  const [hostTimer,  setHostTimer]  = useState(60)
  const [hostRounds, setHostRounds] = useState(0)

  const isHost = room && myPlayerId && room.host_id === myPlayerId

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return

    const channel = supabase.channel(`room-${room.id}`)

    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bac_rooms', filter: `id=eq.${room.id}` },
        payload => {
          if (payload.new) setRoom(payload.new)
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bac_players', filter: `room_id=eq.${room.id}` },
        payload => {
          if (payload.eventType === 'INSERT') {
            setPlayers(prev => [...prev.filter(p => p.id !== payload.new.id), payload.new])
          } else if (payload.eventType === 'UPDATE') {
            setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bac_rounds', filter: `room_id=eq.${room.id}` },
        payload => {
          if (payload.new) setCurrentRound(payload.new)
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bac_answers' },
        payload => {
          if (payload.new) {
            setAnswers(prev => [...prev.filter(a => a.id !== payload.new.id), payload.new])
          }
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room?.id])

  // ── Transitions de phase selon room.status ────────────────────────────────
  useEffect(() => {
    if (!room) return
    if (room.status === 'waiting')   setPhase('lobby')
    if (room.status === 'playing')   { setPhase('playing'); initTimer(room.timer_seconds) }
    if (room.status === 'revealing') setPhase('revealing')
    if (room.status === 'scores')    setPhase('scores')
    if (room.status === 'finished')  setPhase('finished')
  }, [room?.status])

  // ── Host détecte quand tous ont répondu ───────────────────────────────────
  useEffect(() => {
    if (!isHost || !currentRound || room?.status !== 'playing') return
    const allAnswered = players.length >= 2 && players.every(p => p.status === 'answered')
    if (allAnswered) {
      supabase.from('bac_rooms').update({ status: 'revealing' }).eq('id', room.id)
    }
  }, [players, isHost, currentRound, room?.status])

  // ── Timer ─────────────────────────────────────────────────────────────────
  function initTimer(seconds) {
    if (seconds === 0) return
    setTimeLeft(seconds)
    setTimerRunning(true)
  }

  useEffect(() => {
    if (!timerRunning) return
    if (timeLeft <= 0) {
      setTimerRunning(false)
      if (navigator.vibrate) navigator.vibrate([200, 100, 200])
      handleSubmitAnswers()
      return
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timerRunning, timeLeft])

  // ── Lancer la partie (host) ───────────────────────────────────────────────
  async function handleStartGame() {
    const activeCats = Object.entries(hostCategories).filter(([, v]) => v).map(([k]) => k)
    await supabase.from('bac_rooms').update({
      status: 'playing',
      timer_seconds: hostTimer,
      total_rounds: hostRounds,
      categories: activeCats,
      current_round: 1,
    }).eq('id', room.id)

    await supabase.from('bac_rounds').insert({
      room_id: room.id,
      round_number: 1,
      letter: randomLetter(),
    })
  }

  // ── Soumettre les réponses ────────────────────────────────────────────────
  const handleSubmitAnswers = useCallback(async () => {
    if (!currentRound || !myPlayerId) return
    clearTimeout(timerRef.current)
    setTimerRunning(false)

    const activeCats = room?.categories || []
    const rows = activeCats.map(cat => ({
      round_id: currentRound.id,
      player_id: myPlayerId,
      category: cat,
      answer: myAnswers[cat] || '',
    }))

    await supabase.from('bac_answers').insert(rows)
    await supabase.from('bac_players').update({ status: 'answered' }).eq('id', myPlayerId)
  }, [currentRound, myPlayerId, myAnswers, room?.categories])

  // ── Créer une room ─────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!myName.trim()) return
    const code = generateCode()
    const playerId = crypto.randomUUID()

    const { data: roomData, error: roomErr } = await supabase
      .from('bac_rooms')
      .insert({ code, host_id: playerId })
      .select()
      .single()

    if (roomErr) { console.error(roomErr); return }

    const { data: playerData, error: playerErr } = await supabase
      .from('bac_players')
      .insert({ room_id: roomData.id, name: myName.trim(), is_host: true, id: playerId })
      .select()
      .single()

    if (playerErr) { console.error(playerErr); return }

    setMyPlayerId(playerId)
    setRoom(roomData)
    setPlayers([playerData])
    setPhase('lobby')
  }

  // ── Rejoindre une room ────────────────────────────────────────────────────
  async function handleJoin() {
    if (!myName.trim() || !joinCode.trim()) return
    setJoinError('')

    const { data: roomData, error: roomErr } = await supabase
      .from('bac_rooms')
      .select()
      .eq('code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .single()

    if (roomErr || !roomData) {
      setJoinError('Code invalide ou partie déjà commencée.')
      return
    }

    const playerId = crypto.randomUUID()
    const { data: playerData, error: playerErr } = await supabase
      .from('bac_players')
      .insert({ room_id: roomData.id, name: myName.trim(), is_host: false, id: playerId })
      .select()
      .single()

    if (playerErr) { console.error(playerErr); return }

    const { data: existingPlayers } = await supabase
      .from('bac_players')
      .select()
      .eq('room_id', roomData.id)

    setMyPlayerId(playerId)
    setRoom(roomData)
    setPlayers(existingPlayers || [])
    setPhase('lobby')
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <AnimatePresence mode="wait">

        {/* ── ENTRY ──────────────────────────────────────────────────────── */}
        {phase === 'entry' && (
          <motion.div
            key="entry"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            <div>
              <button
                onClick={() => navigate('/')}
                className="text-sm mb-4 block"
                style={{ color: 'var(--color-text-muted)' }}
              >
                ← Retour
              </button>
              <h2 className="text-2xl font-bold text-white mb-1">🔤 Le Petit Bac</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Multijoueur — chacun sur son téléphone
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Ton prénom</p>
              <input
                value={myName}
                onChange={e => setMyName(e.target.value)}
                placeholder="Entrer ton prénom…"
                className="w-full rounded-xl px-4 py-3 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
              />
            </div>

            <Button onClick={handleCreate} fullWidth size="lg" disabled={!myName.trim()}>
              🎮 Créer une partie
            </Button>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Rejoindre avec un code</p>
              <div className="flex gap-2">
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="EX: ABCDEF"
                  maxLength={6}
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white font-mono tracking-widest"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
                />
                <Button
                  onClick={handleJoin}
                  size="md"
                  variant="secondary"
                  disabled={!myName.trim() || joinCode.length < 6}
                >
                  Rejoindre
                </Button>
              </div>
              {joinError && (
                <p className="text-sm mt-2" style={{ color: '#EF4444' }}>{joinError}</p>
              )}
            </div>
          </motion.div>
        )}

        {/* ── LOBBY ──────────────────────────────────────────────────────── */}
        {phase === 'lobby' && room && (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col gap-6"
          >
            <div className="text-center">
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Code de la partie
              </p>
              <p className="text-5xl font-bold tracking-widest" style={{ color: '#F59E0B' }}>
                {room.code}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                Partage ce code avec tes amis
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">
                Joueurs ({players.length})
              </p>
              <div className="flex flex-col gap-2">
                {players.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    <span className="text-lg">{p.is_host ? '👑' : '👤'}</span>
                    <span className="font-semibold text-white">{p.name}</span>
                    {p.id === myPlayerId && (
                      <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>toi</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {isHost && (
              <>
                <div>
                  <p className="text-sm font-semibold text-white mb-2">Catégories</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_CATEGORIES.map(cat => {
                      const active = hostCategories[cat.id]
                      return (
                        <motion.button
                          key={cat.id}
                          whileTap={{ scale: 0.97 }}
                          onClick={() => setHostCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm"
                          style={{
                            background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)',
                            border: `1px solid ${active ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`,
                            color: active ? '#fff' : 'var(--color-text-muted)',
                          }}
                        >
                          {cat.label}
                          {active && <span style={{ color: '#F59E0B' }}>✓</span>}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white mb-2">Timer</p>
                  <div className="flex gap-2 flex-wrap">
                    {TIMER_OPTIONS.map(opt => (
                      <motion.button
                        key={opt.value}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setHostTimer(opt.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{
                          background: hostTimer === opt.value ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${hostTimer === opt.value ? '#F97316' : 'rgba(255,255,255,0.1)'}`,
                          color: hostTimer === opt.value ? '#F97316' : 'var(--color-text-muted)',
                        }}
                      >
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-white mb-2">Rounds</p>
                  <div className="flex gap-2 flex-wrap">
                    {ROUND_OPTIONS.map(opt => (
                      <motion.button
                        key={opt.value}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => setHostRounds(opt.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{
                          background: hostRounds === opt.value ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)',
                          border: `1px solid ${hostRounds === opt.value ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
                          color: hostRounds === opt.value ? '#F59E0B' : 'var(--color-text-muted)',
                        }}
                      >
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleStartGame}
                  fullWidth
                  size="lg"
                  disabled={players.length < 2 || Object.values(hostCategories).every(v => !v)}
                >
                  🚀 Lancer la partie
                </Button>
              </>
            )}

            {!isHost && (
              <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                En attente du host…
              </p>
            )}
          </motion.div>
        )}

        {/* ── PLAYING ────────────────────────────────────────────────────── */}
        {phase === 'playing' && currentRound && room && (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                  Round {room.current_round}{room.total_rounds > 0 ? `/${room.total_rounds}` : ''}
                </p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
                  {players.filter(p => p.status === 'answered').length}/{players.length} ont répondu
                </p>
              </div>
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-6xl font-black"
                style={{ color: '#F59E0B' }}
              >
                {currentRound.letter}
              </motion.div>
              {room.timer_seconds > 0 ? (
                <div
                  className="text-2xl font-bold tabular-nums"
                  style={{ color: timeLeft <= 10 ? '#EF4444' : '#10B981', minWidth: 40, textAlign: 'right' }}
                >
                  {timeLeft}s
                </div>
              ) : (
                <div style={{ width: 40 }} />
              )}
            </div>

            <div className="flex flex-col gap-3">
              {(room.categories || []).map(catId => {
                const cat = ALL_CATEGORIES.find(c => c.id === catId)
                if (!cat) return null
                const alreadyAnswered = players.find(p => p.id === myPlayerId)?.status === 'answered'
                return (
                  <div key={catId}>
                    <p className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: 'var(--color-text-muted)' }}>
                      {cat.label}
                    </p>
                    <input
                      value={myAnswers[catId] || ''}
                      onChange={e => setMyAnswers(prev => ({ ...prev, [catId]: e.target.value }))}
                      placeholder={`Un mot en ${currentRound.letter}…`}
                      disabled={alreadyAnswered}
                      className="w-full rounded-xl px-4 py-3 text-sm text-white"
                      style={{
                        background: 'rgba(255,255,255,0.07)',
                        border: '1px solid rgba(255,255,255,0.12)',
                        outline: 'none',
                        opacity: alreadyAnswered ? 0.5 : 1,
                      }}
                    />
                  </div>
                )
              })}
            </div>

            {players.find(p => p.id === myPlayerId)?.status !== 'answered' && (
              <Button onClick={handleSubmitAnswers} fullWidth size="lg" variant="primary">
                ✅ Terminé !
              </Button>
            )}

            {players.find(p => p.id === myPlayerId)?.status === 'answered' && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center text-sm"
                style={{ color: '#10B981' }}
              >
                ✓ Réponses envoyées — en attente des autres joueurs…
              </motion.p>
            )}
          </motion.div>
        )}

      </AnimatePresence>
    </Layout>
  )
}
