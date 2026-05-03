import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { GameProvider } from './context/GameContext'
import Home from './pages/Home'
import PlayerSetup from './pages/PlayerSetup'
import ActionVerite from './pages/games/ActionVerite'
import Imposteur from './pages/games/Imposteur'
import Bouteille from './pages/games/Bouteille'
import Pictionary from './pages/games/Pictionary'
import PetitBac from './pages/games/PetitBac'

export default function App() {
  return (
    <GameProvider>
      <BrowserRouter>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/setup/:gameId" element={<PlayerSetup />} />
            <Route path="/play/action-verite" element={<ActionVerite />} />
            <Route path="/play/imposteur" element={<Imposteur />} />
            <Route path="/play/bouteille" element={<Bouteille />} />
            <Route path="/play/pictionary" element={<Pictionary />} />
            <Route path="/play/petit-bac" element={<PetitBac />} />
          </Routes>
        </AnimatePresence>
      </BrowserRouter>
    </GameProvider>
  )
}
