export const APP_NAME = 'NightPlay'

export const GAMES = [
  {
    id: 'action-verite',
    name: 'Action ou Vérité',
    emoji: '🎯',
    description: 'Choisis ton camp : défi ou confession !',
    color: '#EC4899',
    gradient: 'from-pink-600 to-orange-500',
    minPlayers: 2,
    maxPlayers: 10,
    route: '/play/action-verite',
    tags: [
      { label: '👥 Grand public', color: '#6366F1' },
      { label: '💀 Hard', color: '#F97316' },
      { label: '🔥 Hot', color: '#EC4899' },
    ],
  },
  {
    id: 'bouteille',
    name: 'La Bouteille',
    emoji: '🍾',
    description: 'La bouteille tourne, le destin désigne.',
    color: '#EC4899',
    gradient: 'from-pink-600 to-rose-700',
    minPlayers: 2,
    maxPlayers: 12,
    route: '/play/bouteille',
    tags: [
      { label: '👥 Grand public', color: '#6366F1' },
      { label: '💋 Classique', color: '#EC4899' },
    ],
  },
  {
    id: 'imposteur',
    name: "L'Imposteur",
    emoji: '🕵️',
    description: 'Trouve qui cache un mot différent.',
    color: '#7C3AED',
    gradient: 'from-violet-600 to-purple-900',
    minPlayers: 3,
    maxPlayers: 10,
    route: '/play/imposteur',
    tags: [
      { label: '👥 Grand public', color: '#6366F1' },
      { label: '🧠 Stratégie', color: '#7C3AED' },
    ],
  },
]
