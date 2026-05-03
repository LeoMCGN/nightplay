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
              <input value={myName} onChange={e => setMyName(e.target.value)} placeholder="Entrer ton prénom…" className="w-full rounded-xl px-4 py-3 text-sm text-white" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }} />
            </div>
            <Button onClick={handleCreate} fullWidth size="lg" disabled={!myName.trim()}>🎮 Créer une partie</Button>
            <div>
              <p className="text-sm font-semibold text-white mb-2">Rejoindre avec un code</p>
              <div className="flex gap-2">
                <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())} placeholder="EX: ABCDEF" maxLength={6} className="flex-1 rounded-xl px-4 py-3 text-sm text-white font-mono tracking-widest" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }} />
                <Button onClick={handleJoin} size="md" variant="secondary" disabled={!myName.trim() || joinCode.length < 6}>Rejoindre</Button>
              </div>
              {joinError && <p className="text-sm mt-2" style={{ color: '#EF4444' }}>{joinError}</p>}
            </div>
          </motion.div>
        )}

        {/* ── LOBBY ──────────────────────────────────────────────────────── */}
        {phase === 'lobby' && room && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6">
            <div className="text-center">
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>Code de la partie</p>
              <p className="text-5xl font-bold tracking-widest" style={{ color: '#7C3AED' }}>{room.code}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>Partage ce code avec tes amis</p>
            </div>
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
            {isHost && (
              <>
                <div>
                  <p className="text-sm font-semibold text-white mb-2">Timer de discussion</p>
                  <div className="flex gap-2 flex-wrap">
                    {TIMER_OPTIONS.map(opt => (
                      <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => setHostTimer(opt.value)} className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: hostTimer === opt.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hostTimer === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`, color: hostTimer === opt.value ? '#A78BFA' : 'var(--color-text-muted)' }}>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-semibold text-white mb-2">Manches</p>
                  <div className="flex gap-2 flex-wrap">
                    {ROUND_OPTIONS.map(opt => (
                      <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => setHostRounds(opt.value)} className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: hostRounds === opt.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hostRounds === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`, color: hostRounds === opt.value ? '#A78BFA' : 'var(--color-text-muted)' }}>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>
                <Button onClick={handleStartGame} fullWidth size="lg" disabled={players.length < 3}>🚀 Lancer la partie</Button>
                {players.length < 3 && <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Il faut au moins 3 joueurs</p>}
              </>
            )}
            {!isHost && <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>En attente du host…</p>}
          </motion.div>
        )}

      </AnimatePresence>
    </Layout>
  )
}
