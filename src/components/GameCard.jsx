import { useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'

export default function GameCard({ game, index }) {
  const navigate = useNavigate()
  const [hovered, setHovered] = useState(false)

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(`/setup/${game.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative cursor-pointer rounded-2xl p-6 flex flex-col gap-3 overflow-hidden select-none"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: `1px solid ${hovered ? game.color + '80' : game.color + '40'}`,
        boxShadow: hovered ? `0 0 24px 0 ${game.color}40` : 'none',
        transition: 'box-shadow 0.2s, border-color 0.2s',
      }}
    >
      {/* Gradient accent top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
        style={{ background: game.color }}
      />

      <div className="text-4xl">{game.emoji}</div>

      <div>
        <h3 className="text-xl font-bold text-white font-body">{game.name}</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
          {game.description}
        </p>
      </div>

      <div className="flex items-center justify-between mt-auto pt-2 gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          {game.tags.map(tag => (
            <span
              key={tag.label}
              className="text-xs font-semibold px-2.5 py-1 rounded-full"
              style={{ background: `${tag.color}20`, color: tag.color }}
            >
              {tag.label}
            </span>
          ))}
        </div>
        <span className="text-xs shrink-0" style={{ color: 'var(--color-text-muted)' }}>
          {game.minPlayers}–{game.maxPlayers} joueurs
        </span>
      </div>
    </motion.div>
  )
}
