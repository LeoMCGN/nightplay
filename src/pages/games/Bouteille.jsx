import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Layout from '../../components/Layout'
import Button from '../../components/Button'
import Modal from '../../components/Modal'
import { useGame } from '../../context/GameContext'
import { useWakeLock } from '../../hooks/useWakeLock'

function secureRandInt(max) {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] % max
}

// Palette de couleurs pour les segments
const COLORS = [
  '#7C3AED', '#EC4899', '#8B5CF6', '#F43F5E',
  '#6366F1', '#A855F7', '#DB2777', '#4F46E5',
  '#9333EA', '#BE185D', '#7C3AED', '#EC4899',
]

const SPIN_DURATION = 4200 // ms
const SVG_SIZE      = 280
const CX            = SVG_SIZE / 2  // 140
const CY            = SVG_SIZE / 2  // 140
const OUTER_R       = 128
const INNER_R       = 24
const TEXT_R        = 82  // rayon pour les labels

// Convertit un angle CSS (0=top, clockwise) en coordonnées cartésiennes
function polar(r, angleDeg) {
  const rad = (angleDeg - 90) * (Math.PI / 180)
  return { x: CX + r * Math.cos(rad), y: CY + r * Math.sin(rad) }
}

// Chemin SVG d'un segment de tarte
function segPath(startDeg, endDeg) {
  const s     = polar(OUTER_R, startDeg)
  const e     = polar(OUTER_R, endDeg)
  const large = (endDeg - startDeg) > 180 ? 1 : 0
  return `M ${CX} ${CY} L ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${OUTER_R} ${OUTER_R} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)} Z`
}

export default function Bouteille() {
  const navigate   = useNavigate()
  const { players } = useGame()
  useWakeLock()

  const [spinnerIdx,  setSpinnerIdx]  = useState(0)
  const [selectedIdx, setSelectedIdx] = useState(null)
  const [rotation,    setRotation]    = useState(0)
  const [phase,       setPhase]       = useState('idle')
  const [showQuit,    setShowQuit]    = useState(false)
  const [turn,        setTurn]        = useState(1)

  const n        = players.length
  const segAngle = 360 / n

  // Angle du centre du segment i (clockwise depuis le top)
  const midAngle = i => segAngle * (i + 0.5)

  function handleSpin() {
    if (phase !== 'idle') return

    let targetIdx
    if (n > 1) {
      do { targetIdx = secureRandInt(n) }
      while (targetIdx === spinnerIdx)
    } else { targetIdx = 0 }

    // Rotation nécessaire pour centrer l'aiguille sur le segment cible
    const target  = midAngle(targetIdx)
    const current = ((rotation % 360) + 360) % 360
    const diff    = ((target - current) + 360) % 360
    const spins   = (4 + secureRandInt(4)) * 360

    setPhase('spinning')
    setSelectedIdx(targetIdx)
    setRotation(rotation + spins + diff)
    setTimeout(() => setPhase('result'), SPIN_DURATION)
  }

  function handleNext() {
    const nextIdx = (spinnerIdx + 1) % n
    if (nextIdx === 0) setTurn(t => t + 1)
    setSpinnerIdx(nextIdx)
    setSelectedIdx(null)
    setPhase('idle')
  }

  const currentSpinner  = players[spinnerIdx]
  const selectedColor   = selectedIdx !== null ? COLORS[selectedIdx % COLORS.length] : '#EC4899'

  return (
    <Layout>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setShowQuit(true)}
          className="text-sm"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ✕ Quitter
        </button>
        <span
          className="text-sm font-bold px-3 py-1 rounded-full"
          style={{ background: 'rgba(236,72,153,0.2)', color: '#EC4899' }}
        >
          🍾 Tour {turn}
        </span>
        <div style={{ width: 60 }} />
      </div>

      {/* Qui tourne */}
      <motion.p
        key={spinnerIdx}
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center text-base font-bold text-white mb-5"
      >
        {currentSpinner} tourne la bouteille
      </motion.p>

      {/* Roue + aiguille */}
      <div className="flex justify-center mb-8">
        <div className="relative" style={{ width: SVG_SIZE, height: SVG_SIZE }}>

          {/* ── SVG ROUE (statique) ── */}
          <svg
            width={SVG_SIZE}
            height={SVG_SIZE}
            className="absolute inset-0"
            style={{ overflow: 'visible' }}
          >
            <defs>
              {/* Filtre glow pour le segment sélectionné */}
              <filter id="seg-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              {/* Filtre glow pour l'aiguille */}
              <filter id="needle-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Segments */}
            {players.map((player, i) => {
              const start     = segAngle * i
              const end       = segAngle * (i + 1)
              const mid       = midAngle(i)
              const color     = COLORS[i % COLORS.length]
              const isSelected = phase === 'result' && i === selectedIdx

              // Position et rotation du texte
              const tp       = polar(TEXT_R, mid)
              // Retourner le texte si dans la moitié basse pour qu'il reste lisible
              const textRot  = mid > 90 && mid < 270 ? mid + 180 : mid
              const fontSize = n > 9 ? 9 : n > 6 ? 11 : 13

              return (
                <g key={player}>
                  <path
                    d={segPath(start, end)}
                    fill={color}
                    opacity={isSelected ? 1 : 0.55}
                    filter={isSelected ? 'url(#seg-glow)' : undefined}
                    style={{ transition: 'opacity 0.4s' }}
                  />
                  {/* Séparateur entre segments */}
                  {(() => {
                    const p = polar(OUTER_R, start)
                    return (
                      <line
                        x1={CX} y1={CY}
                        x2={p.x.toFixed(2)} y2={p.y.toFixed(2)}
                        stroke="rgba(0,0,0,0.35)"
                        strokeWidth="1.5"
                      />
                    )
                  })()}
                  {/* Nom du joueur */}
                  <text
                    x={tp.x}
                    y={tp.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${textRot}, ${tp.x.toFixed(2)}, ${tp.y.toFixed(2)})`}
                    fontSize={fontSize}
                    fontWeight="800"
                    fill="white"
                    opacity={isSelected ? 1 : 0.9}
                    style={{ fontFamily: 'Nunito, sans-serif', userSelect: 'none' }}
                  >
                    {player.length > 9 ? player.slice(0, 8) + '…' : player}
                  </text>
                </g>
              )
            })}

            {/* Anneau extérieur décoratif */}
            <circle
              cx={CX} cy={CY} r={OUTER_R}
              fill="none"
              stroke="rgba(255,255,255,0.18)"
              strokeWidth="2"
            />

            {/* Hub central */}
            <circle
              cx={CX} cy={CY} r={INNER_R}
              fill="#0D0D1A"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
            />
          </svg>

          {/* ── AIGUILLE (tourne) ── */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={
              phase === 'spinning'
                ? { duration: SPIN_DURATION / 1000, ease: [0.1, 0.85, 0.2, 1] }
                : { duration: 0 }
            }
            style={{
              position: 'absolute',
              left: CX,
              top: CY,
              width: 0,
              height: 0,
              transformOrigin: '0 0',
            }}
          >
            {/* Corps de l'aiguille */}
            <div
              style={{
                position: 'absolute',
                left: -2,
                top: -(OUTER_R - INNER_R - 6),
                width: 4,
                height: OUTER_R - INNER_R - 6,
                background: 'linear-gradient(to top, rgba(236,72,153,0.15), #EC4899)',
                borderRadius: '3px 3px 0 0',
              }}
            />
            {/* Pointe triangulaire */}
            <div
              style={{
                position: 'absolute',
                left: -6,
                top: -(OUTER_R - INNER_R - 2),
                width: 0,
                height: 0,
                borderLeft: '6px solid transparent',
                borderRight: '6px solid transparent',
                borderBottom: '14px solid #EC4899',
                filter: 'drop-shadow(0 0 6px rgba(236,72,153,0.8))',
              }}
            />
            {/* Pivot central */}
            <div
              style={{
                position: 'absolute',
                left: -10,
                top: -10,
                width: 20,
                height: 20,
                borderRadius: '50%',
                background: '#EC4899',
                boxShadow: '0 0 14px rgba(236,72,153,0.8)',
              }}
            />
          </motion.div>
        </div>
      </div>

      {/* Actions */}
      <AnimatePresence mode="wait">
        {phase === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Button variant="rose" size="lg" fullWidth onClick={handleSpin}>
              Lancer 🍾
            </Button>
          </motion.div>
        )}

        {phase === 'spinning' && (
          <motion.div
            key="spinning"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center"
          >
            <motion.p
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              className="text-lg font-semibold"
              style={{ color: 'var(--color-text-muted)' }}
            >
              La bouteille tourne…
            </motion.p>
          </motion.div>
        )}

        {phase === 'result' && selectedIdx !== null && (
          <motion.div
            key="result"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 18 }}
            className="flex flex-col items-center gap-5"
          >
            <div
              className="w-full rounded-2xl py-4 px-6 text-center"
              style={{
                background: `${selectedColor}18`,
                border: `1px solid ${selectedColor}55`,
              }}
            >
              <p className="text-sm mb-1" style={{ color: 'var(--color-text-muted)' }}>
                La bouteille désigne
              </p>
              <h2 className="text-4xl font-bold" style={{ color: selectedColor }}>
                {players[selectedIdx]}
              </h2>
            </div>
            <Button variant="rose" size="lg" fullWidth onClick={handleNext}>
              Tour suivant →
            </Button>
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
