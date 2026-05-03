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

  return (
    <Layout>
      <p className="text-white">PetitBac — phase: {phase}</p>
    </Layout>
  )
}
