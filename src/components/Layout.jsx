import { motion } from 'framer-motion'

const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
}

const pageTransition = {
  duration: 0.3,
  ease: 'easeInOut',
}

export default function Layout({ children, className = '' }) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={`min-h-screen w-full font-body ${className}`}
      style={{ background: 'var(--bg-primary)' }}
    >
      <div className="max-w-3xl mx-auto px-4 py-6 min-h-screen">
        {children}
      </div>
    </motion.div>
  )
}
