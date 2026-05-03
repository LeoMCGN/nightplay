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

      </AnimatePresence>
    </Layout>
  )
}
