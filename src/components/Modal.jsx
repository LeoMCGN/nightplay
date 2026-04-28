import { motion, AnimatePresence } from 'framer-motion'
import Button from './Button'

export default function Modal({ open, title, message, onConfirm, onCancel, confirmLabel = 'Confirmer', cancelLabel = 'Annuler', confirmVariant = 'danger' }) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="rounded-2xl p-6 max-w-sm w-full"
            style={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)' }}
            onClick={e => e.stopPropagation()}
          >
            {title && (
              <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
            )}
            {message && (
              <p className="text-gray-300 mb-6">{message}</p>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onCancel} fullWidth>
                {cancelLabel}
              </Button>
              <Button variant={confirmVariant} onClick={onConfirm} fullWidth>
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
