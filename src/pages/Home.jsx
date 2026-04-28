import { motion } from 'framer-motion'
import Layout from '../components/Layout'
import GameCard from '../components/GameCard'
import { GAMES, APP_NAME } from '../data/games'

export default function Home() {
  return (
    <Layout>
      <div className="flex flex-col items-center text-center mb-10 pt-6">
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="font-title text-5xl sm:text-6xl mb-3"
          style={{
            background: 'linear-gradient(135deg, #7C3AED, #EC4899, #F97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {APP_NAME}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-lg"
          style={{ color: 'var(--color-text-muted)' }}
        >
          La soirée commence maintenant 🎉
        </motion.p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {GAMES.map((game, i) => (
          <GameCard key={game.id} game={game} index={i} />
        ))}
      </div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-center text-sm mt-10"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Aucune inscription · Tout dans le navigateur
      </motion.p>
    </Layout>
  )
}
