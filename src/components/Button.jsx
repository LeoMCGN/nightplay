import { motion } from 'framer-motion'

const variants = {
  primary: 'bg-violet-600 hover:bg-violet-500 text-white border-transparent',
  secondary: 'bg-transparent border-violet-500 text-violet-300 hover:bg-violet-500/10',
  danger: 'bg-red-600 hover:bg-red-500 text-white border-transparent',
  ghost: 'bg-transparent border-transparent text-gray-400 hover:text-white',
  rose: 'bg-pink-600 hover:bg-pink-500 text-white border-transparent',
  orange: 'bg-orange-500 hover:bg-orange-400 text-white border-transparent',
}

const sizes = {
  sm: 'px-4 py-2 text-sm min-h-[36px]',
  md: 'px-5 py-3 text-base min-h-[48px]',
  lg: 'px-8 py-4 text-lg min-h-[56px]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  onClick,
  disabled = false,
  fullWidth = false,
  children,
  className = '',
}) {
  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`
        inline-flex items-center justify-center gap-2
        font-semibold rounded-2xl border-2 cursor-pointer
        transition-colors duration-200 select-none
        disabled:opacity-40 disabled:cursor-not-allowed
        ${variants[variant]}
        ${sizes[size]}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
    >
      {children}
    </motion.button>
  )
}
