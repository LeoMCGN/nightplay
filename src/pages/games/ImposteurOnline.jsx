import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import Layout from '../../components/Layout'
import Button from '../../components/Button'
import pairesData from '../../data/imposteur.json'

// ── Constantes ────────────────────────────────────────────────────────────────

const TIMER_OPTIONS = [
  { label: 'Sans timer', value: 0 },
  { label: '1 min',      value: 60 },
  { label: '2 min',      value: 120 },
  { label: '3 min',      value: 180 },
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

function calcTally(players) {
  const tally = {}
  players.forEach(p => {
    if (p.voted_for) tally[p.voted_for] = (tally[p.voted_for] || 0) + 1
  })
  const maxVotes = Object.values(tally).length ? Math.max(...Object.values(tally)) : 0
  const mostVoted = Object.keys(tally).filter(k => tally[k] === maxVotes)
  const imposteurPlayer = players.find(p => p.is_imposteur)
  const found = imposteurPlayer ? mostVoted.includes(imposteurPlayer.name) : false
  return { tally, imposteurPlayer, found }
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function ImposteurOnline() {
  const navigate = useNavigate()

  // Phase : entry | lobby | distribution | discussion | vote | revealing | result | finished
  const [phase, setPhase] = useState('entry')

  // Identité locale
  const [myName, setMyName]         = useState('')
  const [myPlayerId, setMyPlayerId] = useState(null)
  const [joinCode, setJoinCode]     = useState('')
  const [joinError, setJoinError]   = useState('')
  const [showJoin, setShowJoin]     = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)

  // État du jeu (miroir Supabase)
  const [room, setRoom]               = useState(null)
  const [players, setPlayers]         = useState([])
  const [currentRound, setCurrentRound] = useState(null)

  // Timer discussion
  const [timeLeft, setTimeLeft]         = useState(0)
  const [timerRunning, setTimerRunning] = useState(false)
  const timerRef = useRef(null)
  const computedRef = useRef(false)

  // Config lobby (host uniquement)
  const [hostTimer,  setHostTimer]  = useState(120)
  const [hostRounds, setHostRounds] = useState(0)

  const isHost   = room && myPlayerId && room.host_id === myPlayerId
  const myPlayer = players.find(p => p.id === myPlayerId)
  const isLastRound = room && room.total_rounds > 0 && room.current_round >= room.total_rounds

  // ── Créer une room ─────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!myName.trim()) return
    const code = generateCode()
    const playerId = crypto.randomUUID()

    const { data: roomData, error: roomErr } = await supabase
      .from('imp_rooms')
      .insert({ code, host_id: playerId })
      .select()
      .single()
    if (roomErr) { console.error(roomErr); return }

    const { data: playerData, error: playerErr } = await supabase
      .from('imp_players')
      .insert({ id: playerId, room_id: roomData.id, name: myName.trim(), is_host: true })
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
      .from('imp_rooms')
      .select()
      .eq('code', joinCode.trim().toUpperCase())
      .eq('status', 'waiting')
      .single()
    if (roomErr || !roomData) { setJoinError('Code invalide ou partie déjà commencée.'); return }

    const playerId = crypto.randomUUID()
    const { error: playerErr } = await supabase
      .from('imp_players')
      .insert({ id: playerId, room_id: roomData.id, name: myName.trim(), is_host: false })
    if (playerErr) { console.error(playerErr); return }

    const { data: existingPlayers } = await supabase
      .from('imp_players').select().eq('room_id', roomData.id)

    const newPlayer = { id: playerId, room_id: roomData.id, name: myName.trim(), is_host: false, score: 0, word: null, is_imposteur: false, voted_for: null, status: 'waiting' }
    const allPlayers = existingPlayers
      ? existingPlayers.some(p => p.id === playerId) ? existingPlayers : [...existingPlayers, newPlayer]
      : [newPlayer]

    setMyPlayerId(playerId)
    setRoom(roomData)
    setPlayers(allPlayers)
    setPhase('lobby')
  }

  // ── Realtime subscriptions ────────────────────────────────────────────────
  useEffect(() => {
    if (!room) return
    const channel = supabase.channel(`imp-room-${room.id}`)
    channel
      .on('postgres_changes', { event: '*', schema: 'public', table: 'imp_rooms', filter: `id=eq.${room.id}` },
        payload => { if (payload.new) setRoom(payload.new) }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'imp_players', filter: `room_id=eq.${room.id}` },
        payload => {
          if (payload.eventType === 'INSERT')
            setPlayers(prev => [...prev.filter(p => p.id !== payload.new.id), payload.new])
          else if (payload.eventType === 'UPDATE')
            setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new : p))
          else if (payload.eventType === 'DELETE')
            setPlayers(prev => prev.filter(p => p.id !== payload.old.id))
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'imp_rounds', filter: `room_id=eq.${room.id}` },
        payload => { if (payload.new) setCurrentRound(payload.new) }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [room?.id])

  // ── Transitions de phase selon room.status ────────────────────────────────
  useEffect(() => {
    if (!room) return
    if (room.status === 'waiting')      setPhase('lobby')
    if (room.status === 'distribution') { setPhase('distribution'); computedRef.current = false }
    if (room.status === 'discussion')   { setPhase('discussion'); if (room.discussion_time > 0) { setTimeLeft(room.discussion_time); setTimerRunning(true) } }
    if (room.status === 'vote')         { setPhase('vote'); setTimerRunning(false) }
    if (room.status === 'revealing')    setPhase('revealing')
    if (room.status === 'result')       setPhase('result')
    if (room.status === 'finished')     setPhase('finished')
  }, [room?.status])

  // ── Timer discussion ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!timerRunning) return
    if (timeLeft <= 0) {
      setTimerRunning(false)
      if (isHost) supabase.from('imp_rooms').update({ status: 'vote' }).eq('id', room.id)
      return
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timerRunning, timeLeft, isHost, room])

  // ── Calcul résultats (host) ───────────────────────────────────────────────
  const computeAndSaveResults = useCallback(async () => {
    if (!isHost || computedRef.current) return
    computedRef.current = true
    const { tally, imposteurPlayer, found } = calcTally(players)

    await Promise.all(players.map(p => {
      const delta = found && !p.is_imposteur ? 1 : (!found && p.is_imposteur ? 2 : 0)
      if (!delta) return Promise.resolve()
      return supabase.from('imp_players').update({ score: p.score + delta }).eq('id', p.id)
    }))

    await supabase.from('imp_rooms').update({ status: 'revealing' }).eq('id', room.id)
    setTimeout(async () => {
      await supabase.from('imp_rooms').update({ status: 'result' }).eq('id', room.id)
    }, 2600)
  }, [isHost, players, room])

  // ── Host détecte quand tous ont voté ─────────────────────────────────────
  useEffect(() => {
    if (!isHost || room?.status !== 'vote') return
    const allVoted = players.length >= 3 && players.every(p => p.voted_for)
    if (allVoted) computeAndSaveResults()
  }, [players, isHost, room?.status, computeAndSaveResults])

  // ── Lancer la partie / manche (host) ─────────────────────────────────────
  async function handleStartGame() {
    await supabase.from('imp_rooms').update({
      discussion_time: hostTimer,
      total_rounds: hostRounds,
      current_round: 1,
    }).eq('id', room.id)
    await handleStartRound(1)
  }

  async function handleStartRound(roundNumber) {
    const paire = pairesData.paires[Math.floor(Math.random() * pairesData.paires.length)]
    const imposteurIdx = Math.floor(Math.random() * players.length)
    const imposteurPlayer = players[imposteurIdx]

    await Promise.all(players.map(p =>
      supabase.from('imp_players').update({
        word: p.id === imposteurPlayer.id ? paire.imposteur : paire.commun,
        is_imposteur: p.id === imposteurPlayer.id,
        voted_for: null,
        status: 'waiting',
      }).eq('id', p.id)
    ))

    await supabase.from('imp_rounds').insert({
      room_id: room.id,
      round_number: roundNumber,
      mot_commun: paire.commun,
      mot_imposteur: paire.imposteur,
      imposteur_player_id: imposteurPlayer.id,
    })

    await supabase.from('imp_rooms').update({ status: 'distribution' }).eq('id', room.id)
  }

  // ── Joueur prêt (distribution) ────────────────────────────────────────────
  async function handleReady() {
    await supabase.from('imp_players').update({ status: 'ready' }).eq('id', myPlayerId)
  }

  // ── Host démarre la discussion quand tous sont prêts ──────────────────────
  useEffect(() => {
    if (!isHost || room?.status !== 'distribution') return
    const allReady = players.length >= 3 && players.every(p => p.status === 'ready')
    if (allReady) supabase.from('imp_rooms').update({ status: 'discussion' }).eq('id', room.id)
  }, [players, isHost, room?.status])

  // ── Vote ──────────────────────────────────────────────────────────────────
  async function handleVote(suspectName) {
    await supabase.from('imp_players').update({ voted_for: suspectName }).eq('id', myPlayerId)
  }

  // ── Manche suivante ───────────────────────────────────────────────────────
  async function handleNextRound() {
    if (!isHost) return
    const nextRound = room.current_round + 1
    await supabase.from('imp_rooms').update({ current_round: nextRound }).eq('id', room.id)
    await handleStartRound(nextRound)
  }

  async function handleEndGame() {
    if (!isHost) return
    await supabase.from('imp_rooms').update({ status: 'finished' }).eq('id', room.id)
  }

  const formatTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
  const timerPercent = room?.discussion_time > 0 ? (timeLeft / room.discussion_time) * 100 : 100

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout>
      <AnimatePresence mode="wait">

        {/* ── ENTRY ──────────────────────────────────────────────────────── */}
        {phase === 'entry' && (
          <motion.div key="entry" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6">
            <div>
              <button onClick={() => navigate('/')} className="text-sm mb-4 block" style={{ color: 'var(--color-text-muted)' }}>← Retour</button>
              <h2 className="text-2xl font-bold text-white mb-1">🕵️ L'Imposteur Online</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Multijoueur — chacun sur son téléphone</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Ton prénom</p>
              <input
                value={myName}
                onChange={e => setMyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && myName.trim() && handleCreate()}
                placeholder="Entre ton prénom…"
                className="w-full rounded-xl px-4 py-3 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
              />
            </div>

            <AnimatePresence>
              {myName.trim() && (
                <motion.div key="actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                  <Button onClick={handleCreate} fullWidth size="lg">🎮 Créer une partie</Button>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ou</span>
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  </div>

                  {!showJoin ? (
                    <Button onClick={() => setShowJoin(true)} fullWidth size="lg" variant="secondary">🔑 Rejoindre une partie</Button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                      <input
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && joinCode.length === 6 && handleJoin()}
                        placeholder="Code à 6 lettres — ex : ABCDEF"
                        maxLength={6}
                        autoFocus
                        className="w-full rounded-xl px-4 py-3 text-center text-lg text-white font-mono tracking-widest"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
                      />
                      <Button onClick={handleJoin} fullWidth size="lg" variant="secondary" disabled={joinCode.length < 6}>Rejoindre →</Button>
                      {joinError && <p className="text-sm text-center" style={{ color: '#EF4444' }}>{joinError}</p>}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ── LOBBY ──────────────────────────────────────────────────────── */}
        {phase === 'lobby' && room && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-5">

            {/* Bloc code */}
            <div className="rounded-2xl p-5 flex flex-col items-center gap-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Code de la partie</p>
              <p className="text-5xl font-bold font-mono tracking-widest" style={{ color: '#7C3AED' }}>{room.code}</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { navigator.clipboard.writeText(room.code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) }}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: codeCopied ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.15)', border: `1px solid ${codeCopied ? '#10B981' : '#7C3AED'}`, color: codeCopied ? '#10B981' : '#A78BFA' }}
              >
                {codeCopied ? '✓ Copié !' : '📋 Copier'}
              </motion.button>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Partage ce code avec tes amis</p>
            </div>

            {/* Joueurs */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Joueurs ({players.length})</p>
              <div className="flex flex-col gap-2">
                {players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-lg">{p.is_host ? '👑' : '🕵️'}</span>
                    <span className="font-semibold text-white">{p.name}</span>
                    {p.id === myPlayerId && <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>toi</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Paramètres host */}
            {isHost && (
              <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-semibold text-white">⚙️ Paramètres</p>

                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Timer de discussion</p>
                  <div className="flex gap-2 flex-wrap">
                    {TIMER_OPTIONS.map(opt => (
                      <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => setHostTimer(opt.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: hostTimer === opt.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hostTimer === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`, color: hostTimer === opt.value ? '#A78BFA' : 'var(--color-text-muted)' }}>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Manches</p>
                  <div className="flex gap-2 flex-wrap">
                    {ROUND_OPTIONS.map(opt => (
                      <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => setHostRounds(opt.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: hostRounds === opt.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hostRounds === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`, color: hostRounds === opt.value ? '#A78BFA' : 'var(--color-text-muted)' }}>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleStartGame} fullWidth size="lg" disabled={players.length < 3}>
                  🚀 Lancer la partie
                </Button>
                {players.length < 3 && <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Il faut au moins 3 joueurs</p>}
              </div>
            )}

            {!isHost && (
              <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                En attente que le host lance la partie…
              </p>
            )}
          </motion.div>
        )}

        {/* ── DISTRIBUTION ───────────────────────────────────────────────────────────────── */}
        {phase === 'distribution' && myPlayer && (
          <motion.div key="distribution" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="flex flex-col items-center gap-8 text-center">
            <div>
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Manche {room?.current_round}{room?.total_rounds > 0 ? ` / ${room.total_rounds}` : ''}
              </p>
              <h2 className="text-2xl font-bold text-white">Ton mot secret</h2>
            </div>

            <div className="w-full max-w-xs rounded-2xl p-8 flex flex-col items-center gap-4"
              style={{ background: myPlayer.is_imposteur ? 'rgba(249,115,22,0.1)' : 'rgba(124,58,237,0.1)', border: `2px solid ${myPlayer.is_imposteur ? '#F97316' : '#7C3AED'}` }}>
              {myPlayer.is_imposteur ? (
                <>
                  <span className="text-4xl">⚠️</span>
                  <p className="text-xl font-bold text-orange-400">Tu es l'IMPOSTEUR !</p>
                  <div className="h-px w-full" style={{ background: 'rgba(249,115,22,0.3)' }} />
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Ton mot (différent des autres) :</p>
                  <p className="text-3xl font-bold text-orange-400">{myPlayer.word}</p>
                </>
              ) : (
                <>
                  <span className="text-5xl">🃏</span>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Ton mot :</p>
                  <p className="text-4xl font-bold text-white">{myPlayer.word}</p>
                </>
              )}
            </div>

            {myPlayer.status !== 'ready' ? (
              <Button onClick={handleReady} size="lg" variant="primary" fullWidth>✅ Prêt !</Button>
            ) : (
              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm" style={{ color: '#10B981' }}>
                ✓ En attente des autres joueurs… ({players.filter(p => p.status === 'ready').length}/{players.length})
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ── DISCUSSION ─────────────────────────────────────────────────────────────────── */}
        {phase === 'discussion' && (
          <motion.div key="discussion" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-2">Discussion</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Décrivez votre mot à tour de rôle — sans le dire. Un joueur a un mot différent…
              </p>
            </div>

            {room?.discussion_time > 0 && (
              <div className="w-full max-w-xs">
                <div className="text-center text-5xl font-bold mb-3" style={{ color: timeLeft / room.discussion_time < 0.25 ? '#EF4444' : '#F9FAFB' }}>
                  {formatTime(timeLeft)}
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  <motion.div className="h-2 rounded-full" animate={{ width: `${timerPercent}%` }} transition={{ duration: 0.5 }}
                    style={{ background: timerPercent < 25 ? '#EF4444' : '#7C3AED' }} />
                </div>
              </div>
            )}

            {isHost && (
              <Button variant="secondary" size="md" onClick={() => supabase.from('imp_rooms').update({ status: 'vote' }).eq('id', room.id)}>
                Passer au vote →
              </Button>
            )}
            {!isHost && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Le host passera au vote quand la discussion sera terminée</p>}
          </motion.div>
        )}

        {/* ── VOTE ───────────────────────────────────────────────────────────────────────── */}
        {phase === 'vote' && (
          <motion.div key="vote" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-white mb-1">Qui est l'imposteur ?</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                {players.filter(p => p.voted_for).length}/{players.length} ont voté
              </p>
            </div>

            {!myPlayer?.voted_for ? (
              <div className="flex flex-col gap-2">
                {players.filter(p => p.id !== myPlayerId).map(suspect => (
                  <motion.button key={suspect.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => handleVote(suspect.name)}
                    className="w-full rounded-2xl px-5 py-4 text-left font-semibold text-white"
                    style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                    🕵️ {suspect.name}
                  </motion.button>
                ))}
              </div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center flex flex-col items-center gap-3">
                <p className="text-white">Tu as voté pour <strong>{myPlayer.voted_for}</strong></p>
                <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>En attente des autres…</p>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── REVEALING ──────────────────────────────────────────────────── */}
        {phase === 'revealing' && (
          <motion.div key="revealing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-8 py-6">
            <motion.p className="text-2xl font-bold text-white text-center" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 0.8, repeat: Infinity }}>
              ⚡ Dépouillement…
            </motion.p>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              {players.map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                  className="flex items-center justify-between rounded-2xl px-5 py-3"
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <span className="font-semibold text-white">🕵️ {p.name}</span>
                  <motion.span className="text-lg" animate={{ opacity: [1, 0, 1] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }} style={{ color: 'var(--color-text-muted)' }}>···</motion.span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── RESULT ─────────────────────────────────────────────────────── */}
        {phase === 'result' && currentRound && (() => {
          const { tally, imposteurPlayer, found } = calcTally(players)
          const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
          return (
            <motion.div key="result" initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 20 }} className="flex flex-col items-center gap-5 text-center">
              <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                {found ? (
                  <><div className="text-6xl mb-3">🎉</div><h2 className="text-3xl font-bold text-white mb-1">Démasqué !</h2><p className="text-green-400 font-semibold">Le groupe a trouvé l'imposteur.</p></>
                ) : (
                  <><div className="text-6xl mb-3">🕵️</div><h2 className="text-3xl font-bold text-white mb-1">L'imposteur a gagné !</h2><p className="text-orange-400 font-semibold">Personne n'a vu la différence.</p></>
                )}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="w-full rounded-2xl p-5 text-left" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <p className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-muted)' }}>Révélation</p>
                <div className="flex flex-col gap-3">
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Mot commun</p>
                    <p className="text-2xl font-bold" style={{ color: '#7C3AED' }}>{currentRound.mot_commun}</p>
                  </div>
                  <div className="h-px" style={{ background: 'rgba(255,255,255,0.08)' }} />
                  <div>
                    <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>Mot de l'imposteur · {imposteurPlayer?.name}</p>
                    <p className="text-2xl font-bold text-orange-400">{currentRound.mot_imposteur}</p>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="w-full rounded-2xl p-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <p className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-muted)' }}>Votes</p>
                {Object.entries(tally).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
                  <div key={name} className="flex justify-between text-sm py-1">
                    <span className={name === imposteurPlayer?.name ? 'text-orange-400 font-bold' : 'text-white'}>{name}</span>
                    <span style={{ color: name === imposteurPlayer?.name ? '#EC4899' : 'var(--color-text-muted)' }}>{count} vote{count > 1 ? 's' : ''}{name === imposteurPlayer?.name && ' 🕵️'}</span>
                  </div>
                ))}
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="w-full rounded-2xl p-4" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.25)' }}>
                <p className="text-sm font-semibold mb-3" style={{ color: '#7C3AED' }}>🏆 Scores</p>
                {sortedPlayers.map((p, i) => (
                  <div key={p.id} className="flex items-center justify-between py-1.5">
                    <span className={`text-sm font-semibold ${p.is_imposteur ? 'text-orange-400' : 'text-white'}`}>{i + 1}. {p.name}</span>
                    <span className="text-sm font-bold text-white">{p.score} pts</span>
                  </div>
                ))}
              </motion.div>

              {isHost && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="flex gap-3 w-full">
                  <Button variant="ghost" onClick={() => supabase.from('imp_rooms').update({ status: 'finished' }).eq('id', room.id)}>Quitter</Button>
                  {!isLastRound ? (
                    <Button variant="secondary" fullWidth onClick={handleNextRound}>
                      Manche {room.current_round + 1}{room.total_rounds > 0 ? ` / ${room.total_rounds}` : ''} →
                    </Button>
                  ) : (
                    <Button variant="primary" fullWidth onClick={handleEndGame}>🏆 Voir le podium</Button>
                  )}
                </motion.div>
              )}
              {!isHost && <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>En attente du host…</p>}
            </motion.div>
          )
        })()}

        {/* ── FINISHED ───────────────────────────────────────────────────── */}
        {phase === 'finished' && (
          <motion.div key="finished" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 py-8 text-center">
            <div className="text-6xl">🏆</div>
            <h2 className="text-3xl font-bold text-white">Fin de la partie !</h2>
            <div className="flex flex-col gap-2 w-full">
              {[...players].sort((a, b) => b.score - a.score).map((p, i) => (
                <motion.div key={p.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="flex items-center justify-between rounded-2xl px-5 py-4"
                  style={{ background: i === 0 ? 'rgba(124,58,237,0.2)' : i === 1 ? 'rgba(156,163,175,0.15)' : i === 2 ? 'rgba(180,120,60,0.15)' : 'rgba(255,255,255,0.05)', border: `2px solid ${i === 0 ? '#7C3AED' : i === 1 ? '#9CA3AF' : i === 2 ? '#B47C3C' : 'rgba(255,255,255,0.08)'}` }}>
                  <span className="text-xl font-black text-white">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`} {p.name}</span>
                  <span className="text-xl font-bold" style={{ color: '#A78BFA' }}>{p.score} pts</span>
                </motion.div>
              ))}
            </div>
            <div className="flex flex-col gap-3 w-full mt-4">
              <Button onClick={() => navigate('/play/imposteur-online')} fullWidth size="lg">🔄 Rejouer</Button>
              <Button onClick={() => navigate('/')} fullWidth variant="ghost">🏠 Accueil</Button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </Layout>
  )
}
