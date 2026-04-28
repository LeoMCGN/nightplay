# Pictionary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un jeu Pictionary complet à NightPlay — canvas tactile, timer configurable, mode individuel/équipes, base de mots par catégories + mots custom.

**Architecture:** Composant autonome `Pictionary.jsx` qui gère tout son état en local (même pattern qu'ActionVerite). Canvas HTML5 natif avec pointer events. Données mots dans `pictionary.json`.

**Tech Stack:** React 19, Framer Motion, Tailwind CSS, HTML5 Canvas API, pointer events

---

## Fichiers

| Fichier | Action |
|---|---|
| `src/data/pictionary.json` | Créer — base de mots par catégories |
| `src/data/games.js` | Modifier — ajouter entrée Pictionary |
| `src/App.jsx` | Modifier — import + route `/play/pictionary` |
| `src/pages/games/Pictionary.jsx` | Créer — composant principal (~5 sections) |

---

## Task 1 : Données mots `pictionary.json`

**Files:**
- Create: `src/data/pictionary.json`

- [ ] **Créer le fichier avec 7 catégories, 30+ mots chacune**

```json
{
  "animaux": [
    "chien","chat","éléphant","girafe","pingouin","crocodile","dauphin","baleine",
    "araignée","serpent","aigle","hibou","flamant rose","kangourou","koala",
    "requin","pieuvre","papillon","grenouille","tortue","loup","renard","ours",
    "singe","zèbre","lion","tigre","perroquet","cheval","cochon","vache","mouton",
    "poule","canard","lapin"
  ],
  "objets": [
    "parapluie","réfrigérateur","télévision","chaussure","lunettes","montre",
    "bougie","valise","escalier","ascenseur","miroir","brosse à dents","peigne",
    "ciseaux","marteau","clé","cadenas","ampoule","prise électrique","téléphone",
    "ordinateur","casque","vélo","moto","voiture","avion","bateau","fusée",
    "crayon","stylo","livre","agenda","sac à dos","panier","bouteille"
  ],
  "films": [
    "Titanic","Le Roi Lion","Avatar","Inception","Intouchables","La La Land",
    "Forrest Gump","Matrix","Jurassic Park","Harry Potter","Star Wars","Frozen",
    "Toy Story","Le Seigneur des Anneaux","Indiana Jones","Batman","Spider-Man",
    "Shrek","Zootopie","Interstellar","Pulp Fiction","Le Parrain","Dirty Dancing",
    "Top Gun","Grease","Bohemian Rhapsody","La Reine des Neiges","Raiponce",
    "Cars","Coco","Moi Moche et Méchant","Les Minions","Astérix","Tintin"
  ],
  "actions": [
    "nager","sauter","courir","danser","chanter","dormir","manger","boire",
    "conduire","voler","tomber","grimper","lancer","attraper","pousser","tirer",
    "lire","écrire","dessiner","peindre","cuisiner","jardiner","photographier",
    "skier","surfer","boxer","jongler","méditer","pleurer","rire","crier",
    "chuchoter","embrasser","applaudir","bâiller"
  ],
  "metiers": [
    "pompier","chirurgien","astronaute","cuisinier","coiffeur","architecte",
    "pilote","plongeur","détective","magicien","clown","journaliste","photographe",
    "musicien","peintre","sculpteur","professeur","dentiste","vétérinaire",
    "boulanger","boucher","pâtissier","jardinier","plombier","électricien",
    "facteur","policier","juge","avocat","acteur","mannequin","sportif","marin",
    "agriculteur","pompiste"
  ],
  "lieux": [
    "plage","forêt","montagne","désert","aéroport","gare","musée","bibliothèque",
    "stade","cinéma","hôpital","école","université","restaurant","hôtel",
    "supermarché","marché","zoo","parc d'attractions","cirque","casino","église",
    "château","phare","île","grotte","volcan","jungle","banquise","prairie",
    "port","tunnel","pont","tour Eiffel","pyramide"
  ],
  "nourriture": [
    "pizza","sushi","crêpe","hamburger","tacos","raclette","fondue","paëlla",
    "ramen","croissant","baguette","camembert","macarons","éclair","tarte tatin",
    "glace","crème brûlée","mousse au chocolat","choucroute","cassoulet",
    "bouillabaisse","quiche","soufflé","brioche","madeleine","biscuit","gaufre",
    "churros","donuts","nachos","guacamole","hummus","sashimi","dim sum","kebab"
  ]
}
```

- [ ] **Commit**

```bash
git add src/data/pictionary.json
git commit -m "feat: add pictionary word database (7 categories, 35 words each)"
```

---

## Task 2 : Enregistrer le jeu dans `games.js` et `App.jsx`

**Files:**
- Modify: `src/data/games.js`
- Modify: `src/App.jsx`

- [ ] **Ajouter l'entrée dans `src/data/games.js`** après l'entrée `imposteur` :

```js
  {
    id: 'pictionary',
    name: 'Pictionary',
    emoji: '🎨',
    description: 'Dessine, fais deviner, marque des points !',
    color: '#10B981',
    gradient: 'from-emerald-500 to-teal-600',
    minPlayers: 2,
    maxPlayers: 16,
    route: '/play/pictionary',
    tags: [
      { label: '👥 Grand public', color: '#6366F1' },
      { label: '🎨 Créativité', color: '#10B981' },
      { label: '⏱ Timer', color: '#F97316' },
    ],
  },
```

- [ ] **Ajouter import et route dans `src/App.jsx`** :

```jsx
// Ajouter l'import en haut avec les autres :
import Pictionary from './pages/games/Pictionary'

// Ajouter la route dans <Routes> :
<Route path="/play/pictionary" element={<Pictionary />} />
```

- [ ] **Commit**

```bash
git add src/data/games.js src/App.jsx
git commit -m "feat: register Pictionary game in router and game list"
```

---

## Task 3 : Composant Pictionary — Setup

**Files:**
- Create: `src/pages/games/Pictionary.jsx`

- [ ] **Créer le fichier avec les imports, constantes et phase `setup`**

```jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '../../components/Layout'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useGame } from '../../context/GameContext'
import { useWakeLock } from '../../hooks/useWakeLock'
import wordsData from '../../data/pictionary.json'

// ── Constantes ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'animaux',    label: 'Animaux',        emoji: '🐘' },
  { id: 'objets',     label: 'Objets',          emoji: '🪑' },
  { id: 'films',      label: 'Films & Séries',  emoji: '🎬' },
  { id: 'actions',    label: 'Actions',         emoji: '🏃' },
  { id: 'metiers',    label: 'Métiers',         emoji: '👷' },
  { id: 'lieux',      label: 'Lieux',           emoji: '🗺️' },
  { id: 'nourriture', label: 'Nourriture',      emoji: '🍕' },
]

const TIMER_OPTIONS = [
  { label: 'Sans timer', value: 0 },
  { label: '30s',        value: 30 },
  { label: '60s',        value: 60 },
  { label: '90s',        value: 90 },
  { label: '2 min',      value: 120 },
]

const TEAM_COUNT_OPTIONS = [2, 3, 4]

const PALETTE = [
  '#000000','#FFFFFF','#EF4444','#F97316',
  '#EAB308','#22C55E','#3B82F6','#8B5CF6',
]

const BRUSH_SIZES = [
  { label: 'S', value: 3 },
  { label: 'M', value: 8 },
  { label: 'L', value: 18 },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildWordPool(selectedCats, customWords) {
  let pool = []
  selectedCats.forEach(id => {
    if (wordsData[id]) pool = pool.concat(wordsData[id])
  })
  pool = pool.concat(customWords)
  return shuffle(pool)
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function Pictionary() {
  const navigate = useNavigate()
  const { players } = useGame()
  useWakeLock()

  useEffect(() => {
    if (players.length === 0) navigate('/')
  }, [])

  // ── Phase ─────────────────────────────────────────────────────────────────
  const [phase, setPhase] = useState('setup') // setup | secret | draw | result

  // ── Config setup ──────────────────────────────────────────────────────────
  const [mode, setMode]               = useState('individuel') // 'individuel' | 'equipes'
  const [teamCount, setTeamCount]     = useState(2)
  const [teams, setTeams]             = useState({})           // { 'Équipe 1': ['Alice','Bob'], ... }
  const [timerValue, setTimerValue]   = useState(60)
  const [selectedCats, setSelectedCats] = useState({ animaux: true, objets: true, films: false, actions: false, metiers: false, lieux: false, nourriture: false })
  const [customInput, setCustomInput] = useState('')
  const [customWords, setCustomWords] = useState([])

  // ── Jeu ───────────────────────────────────────────────────────────────────
  const [wordPool, setWordPool]           = useState([])
  const [wordIdx, setWordIdx]             = useState(0)
  const [currentWord, setCurrentWord]     = useState('')
  const [drawerIndex, setDrawerIndex]     = useState(0)   // index dans players (individuel) ou dans l'équipe active
  const [activeTeamIdx, setActiveTeamIdx] = useState(0)   // mode équipes
  const [teamDrawerIdx, setTeamDrawerIdx] = useState({})  // { teamName: playerIndex }
  const [scores, setScores]               = useState({})  // { name: points } ou { teamName: points }
  const [timeLeft, setTimeLeft]           = useState(0)
  const [timerRunning, setTimerRunning]   = useState(false)
  const [lastPoints, setLastPoints]       = useState(null)
  const [showScores, setShowScores]       = useState(false)
  const [showQuit, setShowQuit]           = useState(false)
  const [guesserModal, setGuesserModal]   = useState(false)

  // ── Setup : initialiser les équipes quand teamCount ou players change ─────
  useEffect(() => {
    if (mode !== 'equipes') return
    const newTeams = {}
    for (let i = 0; i < teamCount; i++) {
      newTeams[`Équipe ${i + 1}`] = []
    }
    // Répartir les joueurs round-robin
    players.forEach((p, i) => {
      const key = `Équipe ${(i % teamCount) + 1}`
      newTeams[key].push(p)
    })
    setTeams(newTeams)
  }, [mode, teamCount, players])

  // ── Timer ─────────────────────────────────────────────────────────────────
  const timerRef = useRef(null)

  function startTimer() {
    if (timerValue === 0) return
    setTimeLeft(timerValue)
    setTimerRunning(true)
  }

  useEffect(() => {
    if (!timerRunning) return
    if (timeLeft <= 0) {
      setTimerRunning(false)
      handleTimeout()
      return
    }
    timerRef.current = setTimeout(() => setTimeLeft(t => t - 1), 1000)
    return () => clearTimeout(timerRef.current)
  }, [timerRunning, timeLeft])

  function stopTimer() {
    clearTimeout(timerRef.current)
    setTimerRunning(false)
  }

  function handleTimeout() {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200])
    endTurn(false, null)
  }

  // ── Computed ──────────────────────────────────────────────────────────────
  const activeCatIds    = Object.entries(selectedCats).filter(([, v]) => v).map(([k]) => k)
  const canStart        = activeCatIds.length > 0 || customWords.length > 0
  const currentDrawer   = players[drawerIndex] || players[0]
  const currentTeamName = Object.keys(teams)[activeTeamIdx] || 'Équipe 1'
  const currentTeamPlayers = teams[currentTeamName] || []
  const teamDrawerOffset   = teamDrawerIdx[currentTeamName] ?? 0
  const currentTeamDrawer  = currentTeamPlayers[teamDrawerOffset % (currentTeamPlayers.length || 1)]

  const drawerLabel = mode === 'individuel' ? currentDrawer : currentTeamDrawer

  // ── Gestion des custom words ──────────────────────────────────────────────
  function addCustomWord() {
    const w = customInput.trim()
    if (!w) return
    setCustomWords(prev => [...prev, w])
    setCustomInput('')
  }

  function removeCustomWord(idx) {
    setCustomWords(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Démarrage ─────────────────────────────────────────────────────────────
  function handleStartGame() {
    const pool = buildWordPool(activeCatIds, customWords)
    const initScores = {}
    if (mode === 'individuel') {
      players.forEach(p => { initScores[p] = 0 })
    } else {
      Object.keys(teams).forEach(t => { initScores[t] = 0 })
    }
    const tdIdx = {}
    Object.keys(teams).forEach(t => { tdIdx[t] = 0 })
    setWordPool(pool)
    setWordIdx(0)
    setScores(initScores)
    setDrawerIndex(0)
    setActiveTeamIdx(0)
    setTeamDrawerIdx(tdIdx)
    setPhase('secret')
  }

  // ── Mot suivant ───────────────────────────────────────────────────────────
  function pickNextWord(pool, idx) {
    const word = pool[idx % pool.length]
    if (idx + 1 >= pool.length) {
      // On a épuisé le pool, on le reshufffle
      const fresh = buildWordPool(activeCatIds, customWords)
      setWordPool(fresh)
      setWordIdx(0)
    } else {
      setWordIdx(idx + 1)
    }
    return word
  }

  function handleRevealWord() {
    const word = pickNextWord(wordPool, wordIdx)
    setCurrentWord(word)
    setPhase('draw')
    startTimer()
  }

  // ── Fin de tour ───────────────────────────────────────────────────────────
  function endTurn(guessed, guesserId) {
    stopTimer()
    const pts = {}

    if (guessed) {
      if (mode === 'individuel') {
        pts[currentDrawer] = (scores[currentDrawer] || 0) + 2
        if (guesserId) pts[guesserId] = (scores[guesserId] || 0) + 1
      } else {
        // L'équipe qui devine = l'équipe suivante dans la rotation
        const teamNames   = Object.keys(teams)
        const guessingTeam = teamNames[(activeTeamIdx + 1) % teamNames.length]
        pts[guessingTeam] = (scores[guessingTeam] || 0) + 2
      }
      setLastPoints({ guessed: true, drawer: drawerLabel, guesser: guesserId })
    } else {
      setLastPoints({ guessed: false, drawer: drawerLabel })
    }

    setScores(prev => ({ ...prev, ...pts }))
    setPhase('result')
  }

  function handleGuessed() {
    if (mode === 'individuel') {
      setGuesserModal(true)
    } else {
      endTurn(true, null)
    }
  }

  function handleGuesserSelected(name) {
    setGuesserModal(false)
    endTurn(true, name)
  }

  function handlePass() {
    endTurn(false, null)
  }

  // ── Tour suivant ──────────────────────────────────────────────────────────
  function handleNextTurn() {
    clearCanvas()
    if (mode === 'individuel') {
      setDrawerIndex(i => (i + 1) % players.length)
    } else {
      const teamNames = Object.keys(teams)
      const nextTeamIdx = (activeTeamIdx + 1) % teamNames.length
      setActiveTeamIdx(nextTeamIdx)
      const nextTeamName = teamNames[nextTeamIdx]
      const nextTeamPlayers = teams[nextTeamName] || []
      setTeamDrawerIdx(prev => ({
        ...prev,
        [nextTeamName]: ((prev[nextTeamName] ?? 0) + 1) % (nextTeamPlayers.length || 1),
      }))
    }
    setPhase('secret')
  }

  // ── Canvas ────────────────────────────────────────────────────────────────
  const canvasRef    = useRef(null)
  const drawing      = useRef(false)
  const lastPos      = useRef({ x: 0, y: 0 })
  const [color, setColor]         = useState('#000000')
  const [brushSize, setBrushSize] = useState(8)
  const [eraser, setEraser]       = useState(false)

  function getPos(e, canvas) {
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    return {
      x: (clientX - rect.left) * (canvas.width  / rect.width),
      y: (clientY - rect.top)  * (canvas.height / rect.height),
    }
  }

  function startDraw(e) {
    e.preventDefault()
    drawing.current = true
    const canvas = canvasRef.current
    const pos = getPos(e, canvas)
    lastPos.current = pos
    const ctx = canvas.getContext('2d')
    ctx.beginPath()
    ctx.arc(pos.x, pos.y, (eraser ? brushSize * 2 : brushSize) / 2, 0, Math.PI * 2)
    ctx.fillStyle = eraser ? '#FFFFFF' : color
    ctx.fill()
  }

  function draw(e) {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    const pos    = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = eraser ? '#FFFFFF' : color
    ctx.lineWidth   = eraser ? brushSize * 2 : brushSize
    ctx.lineCap     = 'round'
    ctx.lineJoin    = 'round'
    ctx.stroke()
    lastPos.current = pos
  }

  function endDraw(e) {
    e.preventDefault()
    drawing.current = false
  }

  const clearCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  // Initialiser fond blanc au montage et à chaque nouveau tour
  useEffect(() => {
    if (phase === 'draw') clearCanvas()
  }, [phase, clearCanvas])

  // ── Hold-to-clear (600ms) ─────────────────────────────────────────────────
  const clearHoldRef  = useRef(null)
  const [clearing, setClearing] = useState(false)

  function onClearStart() {
    setClearing(true)
    clearHoldRef.current = setTimeout(() => {
      clearCanvas()
      setClearing(false)
    }, 600)
  }

  function onClearEnd() {
    clearTimeout(clearHoldRef.current)
    setClearing(false)
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <Layout>
      <AnimatePresence mode="wait">

        {/* ── SETUP ──────────────────────────────────────────────────────── */}
        {phase === 'setup' && (
          <motion.div
            key="setup"
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
              <h2 className="text-2xl font-bold text-white mb-1">🎨 Pictionary</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Configure ta partie
              </p>
            </div>

            {/* Mode */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Mode de jeu</p>
              <div className="flex gap-2">
                {[
                  { id: 'individuel', label: '👤 Individuel' },
                  { id: 'equipes',    label: '👥 Équipes' },
                ].map(m => (
                  <motion.button
                    key={m.id}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setMode(m.id)}
                    className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                    style={{
                      background: mode === m.id ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)',
                      border: `2px solid ${mode === m.id ? '#10B981' : 'rgba(255,255,255,0.08)'}`,
                      color: mode === m.id ? '#fff' : 'var(--color-text-muted)',
                    }}
                  >
                    {m.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Nombre d'équipes */}
            <AnimatePresence>
              {mode === 'equipes' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="overflow-hidden"
                >
                  <p className="text-sm font-semibold text-white mb-2">Nombre d'équipes</p>
                  <div className="flex gap-2">
                    {TEAM_COUNT_OPTIONS.map(n => (
                      <motion.button
                        key={n}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => setTeamCount(n)}
                        className="flex-1 rounded-2xl py-3 text-sm font-semibold"
                        style={{
                          background: teamCount === n ? 'rgba(16,185,129,0.25)' : 'rgba(255,255,255,0.05)',
                          border: `2px solid ${teamCount === n ? '#10B981' : 'rgba(255,255,255,0.08)'}`,
                          color: teamCount === n ? '#fff' : 'var(--color-text-muted)',
                        }}
                      >
                        {n} équipes
                      </motion.button>
                    ))}
                  </div>
                  {/* Aperçu de la répartition */}
                  <div className="mt-3 flex flex-col gap-2">
                    {Object.entries(teams).map(([name, members]) => (
                      <div
                        key={name}
                        className="rounded-xl px-4 py-2 text-sm"
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        <span className="font-bold text-white">{name} :</span>{' '}
                        <span style={{ color: 'var(--color-text-muted)' }}>
                          {members.join(', ') || '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Timer */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Timer</p>
              <div className="flex gap-2 flex-wrap">
                {TIMER_OPTIONS.map(opt => (
                  <motion.button
                    key={opt.value}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setTimerValue(opt.value)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{
                      background: timerValue === opt.value ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.05)',
                      border: `1px solid ${timerValue === opt.value ? '#F97316' : 'rgba(255,255,255,0.1)'}`,
                      color: timerValue === opt.value ? '#F97316' : 'var(--color-text-muted)',
                    }}
                  >
                    {opt.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Catégories */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Catégories</p>
              <div className="flex flex-col gap-2">
                {CATEGORIES.map(cat => {
                  const active = selectedCats[cat.id]
                  return (
                    <motion.button
                      key={cat.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedCats(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                      className="flex items-center justify-between rounded-2xl px-5 py-3 text-left"
                      style={{
                        background: active ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
                        border: `2px solid ${active ? '#10B981' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{cat.emoji}</span>
                        <span className="font-bold text-white text-sm">{cat.label}</span>
                      </div>
                      <div
                        className="w-5 h-5 rounded-full border-2 flex items-center justify-center"
                        style={{
                          borderColor: active ? '#10B981' : 'rgba(255,255,255,0.3)',
                          background: active ? '#10B981' : 'transparent',
                        }}
                      >
                        {active && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>

            {/* Mots custom */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Mots personnalisés</p>
              <div className="flex gap-2">
                <input
                  value={customInput}
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addCustomWord()}
                  placeholder="Ajouter un mot…"
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white"
                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
                />
                <Button onClick={addCustomWord} size="md" variant="secondary">+</Button>
              </div>
              {customWords.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {customWords.map((w, i) => (
                    <span
                      key={i}
                      className="flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold"
                      style={{ background: 'rgba(16,185,129,0.2)', color: '#10B981' }}
                    >
                      {w}
                      <button onClick={() => removeCustomWord(i)} className="ml-1 opacity-70 hover:opacity-100">×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <Button onClick={handleStartGame} fullWidth size="lg" disabled={!canStart}>
              C'est parti ! 🎨
            </Button>
          </motion.div>
        )}

        {/* ── SECRET ─────────────────────────────────────────────────────── */}
        {phase === 'secret' && (
          <motion.div
            key="secret"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="flex flex-col items-center justify-center min-h-[70vh] gap-8 text-center"
          >
            <div>
              <p className="text-lg font-semibold mb-1" style={{ color: 'var(--color-text-muted)' }}>
                Passe le téléphone à
              </p>
              <h2 className="text-4xl font-bold text-white">{drawerLabel}</h2>
              {mode === 'equipes' && (
                <p className="text-sm mt-1" style={{ color: '#10B981' }}>{currentTeamName}</p>
              )}
            </div>

            {currentWord === '' ? (
              <Button onClick={handleRevealWord} size="lg" variant="primary">
                👁 Voir mon mot
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center gap-6"
              >
                <div
                  className="rounded-3xl px-8 py-6 text-center"
                  style={{ background: 'rgba(16,185,129,0.15)', border: '2px solid #10B981' }}
                >
                  <p className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: '#10B981' }}>
                    Ton mot
                  </p>
                  <p className="text-5xl font-bold text-white">{currentWord}</p>
                </div>
                <Button onClick={() => { setPhase('draw'); startTimer() }} size="lg" variant="primary">
                  Tout le monde est prêt — On dessine !
                </Button>
              </motion.div>
            )}

            <button
              onClick={() => setShowQuit(true)}
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ✕ Quitter
            </button>
          </motion.div>
        )}

        {/* ── DRAW ───────────────────────────────────────────────────────── */}
        {phase === 'draw' && (
          <motion.div
            key="draw"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col"
            style={{ minHeight: '100vh' }}
          >
            {/* Header compact */}
            <div className="flex items-center justify-between mb-3">
              <button
                onClick={() => setShowScores(true)}
                className="text-xs px-3 py-1 rounded-full font-semibold"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--color-text-muted)' }}
              >
                🏆 Scores
              </button>
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: 'var(--color-text-muted)' }}>
                  {drawerLabel} dessine
                </p>
                <p className="text-base font-bold text-white">{currentWord}</p>
              </div>
              {timerValue > 0 ? (
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

            {/* Canvas */}
            <canvas
              ref={canvasRef}
              width={800}
              height={900}
              onPointerDown={startDraw}
              onPointerMove={draw}
              onPointerUp={endDraw}
              onPointerLeave={endDraw}
              style={{
                width: '100%',
                flex: 1,
                borderRadius: 16,
                background: '#fff',
                touchAction: 'none',
                cursor: eraser ? 'cell' : 'crosshair',
                border: '2px solid rgba(255,255,255,0.1)',
              }}
            />

            {/* Barre d'outils */}
            <div className="mt-3 flex flex-col gap-3">
              {/* Palette couleurs */}
              <div className="flex items-center gap-2 flex-wrap">
                {PALETTE.map(c => (
                  <button
                    key={c}
                    onClick={() => { setColor(c); setEraser(false) }}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      background: c,
                      border: color === c && !eraser ? '3px solid white' : '2px solid rgba(255,255,255,0.2)',
                      boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px rgba(0,0,0,0.2)' : 'none',
                    }}
                  />
                ))}
              </div>

              {/* Taille + gomme + effacer */}
              <div className="flex items-center gap-2">
                {BRUSH_SIZES.map(b => (
                  <button
                    key={b.value}
                    onClick={() => { setBrushSize(b.value); setEraser(false) }}
                    className="rounded-xl px-3 py-2 text-sm font-bold"
                    style={{
                      background: brushSize === b.value && !eraser ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.07)',
                      border: `1px solid ${brushSize === b.value && !eraser ? '#10B981' : 'rgba(255,255,255,0.1)'}`,
                      color: '#fff',
                    }}
                  >
                    {b.label}
                  </button>
                ))}
                <button
                  onClick={() => setEraser(e => !e)}
                  className="rounded-xl px-3 py-2 text-sm font-bold"
                  style={{
                    background: eraser ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${eraser ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                    color: eraser ? '#EF4444' : '#fff',
                  }}
                >
                  🧹
                </button>
                <button
                  onPointerDown={onClearStart}
                  onPointerUp={onClearEnd}
                  onPointerLeave={onClearEnd}
                  className="rounded-xl px-3 py-2 text-sm font-bold ml-auto"
                  style={{
                    background: clearing ? 'rgba(239,68,68,0.3)' : 'rgba(255,255,255,0.07)',
                    border: `1px solid ${clearing ? '#EF4444' : 'rgba(255,255,255,0.1)'}`,
                    color: clearing ? '#EF4444' : '#fff',
                    transition: 'all 0.15s',
                  }}
                >
                  {clearing ? '🗑 …' : '🗑'}
                </button>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <Button variant="primary" size="lg" fullWidth onClick={handleGuessed}>
                  ✅ Deviné !
                </Button>
                <Button variant="ghost" size="lg" fullWidth onClick={handlePass}>
                  ⏭ Passer
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── RESULT ─────────────────────────────────────────────────────── */}
        {phase === 'result' && lastPoints && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center gap-6 py-12 text-center"
          >
            <div className="text-6xl">{lastPoints.guessed ? '🎉' : '😅'}</div>
            <div>
              <p className="text-3xl font-bold text-white mb-1">
                {lastPoints.guessed ? 'Bien joué !' : 'Raté…'}
              </p>
              <p className="text-lg" style={{ color: 'var(--color-text-muted)' }}>
                Le mot était : <span className="font-bold text-white">{currentWord}</span>
              </p>
            </div>

            {lastPoints.guessed && (
              <div
                className="rounded-2xl px-6 py-4 text-sm"
                style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)' }}
              >
                {mode === 'individuel' ? (
                  <>
                    <p style={{ color: '#10B981' }}>
                      <strong>{lastPoints.drawer}</strong> +2 pts
                    </p>
                    {lastPoints.guesser && (
                      <p style={{ color: '#10B981' }}>
                        <strong>{lastPoints.guesser}</strong> +1 pt
                      </p>
                    )}
                  </>
                ) : (
                  <p style={{ color: '#10B981' }}>
                    L'équipe adverse +2 pts
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-3 w-full">
              <Button onClick={() => setShowScores(true)} variant="secondary" fullWidth>
                🏆 Voir les scores
              </Button>
              <Button onClick={handleNextTurn} variant="primary" size="lg" fullWidth>
                Tour suivant →
              </Button>
            </div>

            <button
              onClick={() => setShowQuit(true)}
              className="text-sm"
              style={{ color: 'var(--color-text-muted)' }}
            >
              ✕ Quitter
            </button>
          </motion.div>
        )}

      </AnimatePresence>

      {/* ── MODAL DEVINEUR (mode individuel) ──────────────────────────── */}
      <AnimatePresence>
        {guesserModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.7)' }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="rounded-2xl p-6 w-full max-w-sm"
              style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <h3 className="text-xl font-bold text-white mb-4">Qui a deviné ?</h3>
              <div className="flex flex-col gap-2 mb-4">
                {players
                  .filter(p => p !== currentDrawer)
                  .map(p => (
                    <button
                      key={p}
                      onClick={() => handleGuesserSelected(p)}
                      className="rounded-xl px-4 py-3 text-left font-semibold text-white"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      {p}
                    </button>
                  ))}
              </div>
              <Button variant="ghost" fullWidth onClick={() => { setGuesserModal(false); endTurn(true, null) }}>
                Personne en particulier
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL SCORES ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {showScores && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.8)' }}
            onClick={() => setShowScores(false)}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              className="rounded-2xl p-6 w-full max-w-sm"
              style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold text-white mb-4">🏆 Scores</h3>
              <div className="flex flex-col gap-2">
                {Object.entries(scores)
                  .sort(([, a], [, b]) => b - a)
                  .map(([name, pts], i) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{ background: i === 0 ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.05)', border: `1px solid ${i === 0 ? 'rgba(16,185,129,0.3)' : 'rgba(255,255,255,0.08)'}` }}
                    >
                      <span className="font-bold text-white">
                        {i === 0 ? '🥇 ' : i === 1 ? '🥈 ' : i === 2 ? '🥉 ' : ''}{name}
                      </span>
                      <span className="font-bold" style={{ color: '#10B981' }}>{pts} pts</span>
                    </div>
                  ))}
              </div>
              <Button variant="secondary" fullWidth className="mt-4" onClick={() => setShowScores(false)}>
                Fermer
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MODAL QUITTER ─────────────────────────────────────────────── */}
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
```

- [ ] **Commit**

```bash
git add src/pages/games/Pictionary.jsx
git commit -m "feat: add Pictionary game component (canvas, timer, teams, scoring)"
```

---

## Task 4 : Vérification manuelle

- [ ] **Lancer le dev server**

```bash
cd "d:/ENTREPRISE/LEO MACAIGNE/NIGHTPLAY/nightplay"
npm run dev
```

- [ ] **Vérifier le flow complet :**
  1. L'accueil affiche la carte Pictionary (🎨, gradient vert)
  2. Cliquer → PlayerSetup → saisir 3+ joueurs → démarrer
  3. Setup : tester mode individuel + mode équipes (2 puis 3 équipes)
  4. Tester timer Off et 60s
  5. Cocher/décocher catégories, ajouter un mot custom
  6. Phase secret : vérifier que le mot s'affiche après tap
  7. Phase draw : tester palette, tailles, gomme, hold-to-clear
  8. Cliquer "Deviné !" → modal devineur (mode individuel) → vérifier points
  9. Cliquer "Passer" → résultat sans points
  10. Vérifier que les scores s'accumulent correctement sur plusieurs tours
  11. Timer : attendre expiration → vérifier vibration + passage automatique à result

- [ ] **Corriger les éventuels bugs visuels ou logiques détectés**

- [ ] **Commit final si corrections**

```bash
git add -p
git commit -m "fix: pictionary post-review corrections"
```

---

## Self-Review

**Spec coverage :**
- ✅ Canvas tactile HTML5 natif (pointer events, touch-action: none)
- ✅ Timer configurable (Off / 30s / 60s / 90s / 120s)
- ✅ Mode individuel + équipes (2/3/4 équipes)
- ✅ Scoring individuel (+2 dessinateur, +1 devineur) et équipes (+2 équipe devinatrice)
- ✅ Catégories cochables (7 catégories, 35 mots chacune)
- ✅ Mots custom ajoutables/supprimables
- ✅ Palette 8 couleurs + 3 tailles + gomme + hold-to-clear
- ✅ Phase secret (passe le téléphone / voir le mot)
- ✅ Vibration API à expiration du timer
- ✅ Tableau des scores modal accessible depuis draw et result
- ✅ Modal quitter
- ✅ useWakeLock pour garder l'écran allumé
- ✅ Framer Motion transitions entre phases
- ✅ Route + entrée games.js

**Aucun placeholder — tout le code est fourni dans les steps.**

**Consistance des noms :**
- `clearCanvas()` utilisé partout de façon cohérente
- `endTurn(guessed, guesserId)` appelé depuis handleGuessed, handlePass, handleTimeout
- `handleNextTurn()` → réinitialise canvas + passe à `secret`
- `buildWordPool(selectedCats, customWords)` utilisé dans handleStartGame et auto-reshape du pool
