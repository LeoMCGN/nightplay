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

  // Config lobby (host uniquement)
  const [hostTimer,  setHostTimer]  = useState(120)
  const [hostRounds, setHostRounds] = useState(0)

  const isHost   = room && myPlayerId && room.host_id === myPlayerId
  const myPlayer = players.find(p => p.id === myPlayerId)
  const isLastRound = room && room.total_rounds > 0 && room.current_round >= room.total_rounds

  return (
    <Layout>
      <p className="text-white">ImposteurOnline — phase: {phase}</p>
    </Layout>
  )
}
