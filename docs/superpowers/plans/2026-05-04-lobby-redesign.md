# Lobby Redesign — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bypasser PlayerSetup pour les jeux online et redesigner les écrans entry + lobby de PetitBac et ImposteurOnline pour un flux plus clair.

**Architecture:** Ajout d'un flag `online` dans `games.js` + navigation conditionnelle dans `GameCard`. Remplacement du JSX entry et lobby dans les deux composants online avec un nouveau flux 2-étapes (prénom → créer/rejoindre) et un lobby avec code copiable et section paramètres séparée.

**Tech Stack:** React 19, Framer Motion, Tailwind CSS, `navigator.clipboard`

> **Note TDD :** Pas d'infrastructure de tests. Vérifications manuelles dans le navigateur.

---

## Structure des fichiers

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/data/games.js` | Modifier | Ajouter `online: true` sur petit-bac et imposteur-online |
| `src/components/GameCard.jsx` | Modifier | Navigation directe si `game.online` |
| `src/pages/games/PetitBac.jsx` | Modifier | Ajouter states + remplacer JSX entry/lobby |
| `src/pages/games/ImposteurOnline.jsx` | Modifier | Ajouter states + remplacer JSX entry/lobby |

---

## Task 1 : Bypass PlayerSetup

**Files:**
- Modify: `src/data/games.js`
- Modify: `src/components/GameCard.jsx`

- [ ] **Step 1 : Ajouter `online: true` dans games.js**

Lire `src/data/games.js`. Ajouter `online: true` dans les deux entrées concernées.

Dans l'entrée `petit-bac`, ajouter après `route: '/play/petit-bac',` :
```js
    online: true,
```

Dans l'entrée `imposteur-online`, ajouter après `route: '/play/imposteur-online',` :
```js
    online: true,
```

- [ ] **Step 2 : Navigation conditionnelle dans GameCard.jsx**

Lire `src/components/GameCard.jsx`. Remplacer la ligne :
```js
      onClick={() => navigate(`/setup/${game.id}`)}
```
par :
```js
      onClick={() => navigate(game.online ? game.route : `/setup/${game.id}`)}
```

- [ ] **Step 3 : Vérifier manuellement**

Lancer `npm run dev`. Cliquer sur "Le Petit Bac" → doit aller directement sur `/play/petit-bac` sans passer par PlayerSetup. Cliquer sur "Action ou Vérité" → doit toujours passer par PlayerSetup.

- [ ] **Step 4 : Commit**

```bash
git add src/data/games.js src/components/GameCard.jsx
git commit -m "feat: bypass PlayerSetup for online games"
```

---

## Task 2 : Redesign entry + lobby PetitBac

**Files:**
- Modify: `src/pages/games/PetitBac.jsx`

- [ ] **Step 1 : Ajouter les nouveaux states**

Lire `src/pages/games/PetitBac.jsx`. Trouver le bloc de states (autour de la ligne 74) :
```js
  const [joinCode, setJoinCode]     = useState('')
  const [joinError, setJoinError]   = useState('')
```
Ajouter juste après :
```js
  const [showJoin, setShowJoin]     = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
```

- [ ] **Step 2 : Remplacer le JSX de la phase entry**

Trouver le bloc `{phase === 'entry' && (` dans le JSX (vers la ligne 375). Remplacer tout le bloc `{phase === 'entry' && ( ... )}` (jusqu'à la ligne `)}` qui le ferme, vers la ligne 437) par :

```jsx
        {/* ── ENTRY ──────────────────────────────────────────────────────── */}
        {phase === 'entry' && (
          <motion.div key="entry" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6">
            <div>
              <button onClick={() => navigate('/')} className="text-sm mb-4 block" style={{ color: 'var(--color-text-muted)' }}>← Retour</button>
              <h2 className="text-2xl font-bold text-white mb-1">🔤 Le Petit Bac</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Multijoueur — chacun sur son téléphone</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Ton prénom</p>
              <input
                value={myName}
                onChange={e => setMyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && myName.trim() && handleCreate()}
                placeholder="Entre ton prénom…"
                className="w-full rounded-xl px-4 py-3 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
              />
            </div>

            <AnimatePresence>
              {myName.trim() && (
                <motion.div key="actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                  <Button onClick={handleCreate} fullWidth size="lg">🎮 Créer une partie</Button>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ou</span>
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  </div>

                  {!showJoin ? (
                    <Button onClick={() => setShowJoin(true)} fullWidth size="lg" variant="secondary">🔑 Rejoindre une partie</Button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                      <input
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && joinCode.length === 6 && handleJoin()}
                        placeholder="Code à 6 lettres — ex : ABCDEF"
                        maxLength={6}
                        autoFocus
                        className="w-full rounded-xl px-4 py-3 text-center text-lg text-white font-mono tracking-widest"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
                      />
                      <Button onClick={handleJoin} fullWidth size="lg" variant="secondary" disabled={joinCode.length < 6}>Rejoindre →</Button>
                      {joinError && <p className="text-sm text-center" style={{ color: '#EF4444' }}>{joinError}</p>}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
```

- [ ] **Step 3 : Remplacer le JSX de la phase lobby**

Trouver le bloc `{phase === 'lobby' && room && (` (vers la ligne 440). Remplacer tout le bloc `{phase === 'lobby' && room && ( ... )}` (jusqu'à la ligne 567) par :

```jsx
        {/* ── LOBBY ──────────────────────────────────────────────────────── */}
        {phase === 'lobby' && room && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-5">

            {/* Bloc code */}
            <div className="rounded-2xl p-5 flex flex-col items-center gap-3" style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Code de la partie</p>
              <p className="text-5xl font-bold font-mono tracking-widest" style={{ color: '#F59E0B' }}>{room.code}</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { navigator.clipboard.writeText(room.code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) }}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: codeCopied ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.15)', border: `1px solid ${codeCopied ? '#10B981' : '#F59E0B'}`, color: codeCopied ? '#10B981' : '#F59E0B' }}
              >
                {codeCopied ? '✓ Copié !' : '📋 Copier'}
              </motion.button>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Partage ce code avec tes amis</p>
            </div>

            {/* Joueurs */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Joueurs ({players.length})</p>
              <div className="flex flex-col gap-2">
                {players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-lg">{p.is_host ? '👑' : '🎮'}</span>
                    <span className="font-semibold text-white">{p.name}</span>
                    {p.id === myPlayerId && <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>toi</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Paramètres host */}
            {isHost && (
              <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-semibold text-white">⚙️ Paramètres</p>

                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Catégories</p>
                  <div className="grid grid-cols-2 gap-2">
                    {ALL_CATEGORIES.map(cat => {
                      const active = hostCategories[cat.id]
                      return (
                        <motion.button key={cat.id} whileTap={{ scale: 0.97 }}
                          onClick={() => setHostCategories(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                          className="flex items-center justify-between rounded-xl px-3 py-2 text-left text-sm"
                          style={{ background: active ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${active ? '#F59E0B' : 'rgba(255,255,255,0.08)'}`, color: active ? '#fff' : 'var(--color-text-muted)' }}>
                          {cat.label}
                          {active && <span style={{ color: '#F59E0B' }}>✓</span>}
                        </motion.button>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Timer</p>
                  <div className="flex gap-2 flex-wrap">
                    {TIMER_OPTIONS.map(opt => (
                      <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => setHostTimer(opt.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: hostTimer === opt.value ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hostTimer === opt.value ? '#F97316' : 'rgba(255,255,255,0.1)'}`, color: hostTimer === opt.value ? '#F97316' : 'var(--color-text-muted)' }}>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Manches</p>
                  <div className="flex gap-2 flex-wrap">
                    {ROUND_OPTIONS.map(opt => (
                      <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => setHostRounds(opt.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: hostRounds === opt.value ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hostRounds === opt.value ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`, color: hostRounds === opt.value ? '#F59E0B' : 'var(--color-text-muted)' }}>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleStartGame} fullWidth size="lg" disabled={players.length < 2 || Object.values(hostCategories).every(v => !v)}>
                  🚀 Lancer la partie
                </Button>
                {players.length < 2 && <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Il faut au moins 2 joueurs</p>}
              </div>
            )}

            {!isHost && (
              <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                En attente que le host lance la partie…
              </p>
            )}
          </motion.div>
        )}
```

- [ ] **Step 4 : Vérifier manuellement**

Ouvrir deux onglets sur `/play/petit-bac`.
- Onglet 1 : entrer un prénom → les deux boutons apparaissent. Créer une partie → lobby avec code en grand + bouton Copier (vérifie que ça copie dans le presse-papier).
- Onglet 2 : entrer un prénom → cliquer "Rejoindre" → input code apparaît. Entrer le code → les deux onglets voient les deux joueurs en temps réel.

- [ ] **Step 5 : Commit**

```bash
git add src/pages/games/PetitBac.jsx
git commit -m "feat: redesign entry and lobby for PetitBac"
```

---

## Task 3 : Redesign entry + lobby ImposteurOnline

**Files:**
- Modify: `src/pages/games/ImposteurOnline.jsx`

- [ ] **Step 1 : Ajouter les nouveaux states**

Lire `src/pages/games/ImposteurOnline.jsx`. Trouver le bloc de states (autour de la ligne 54) :
```js
  const [joinCode, setJoinCode]     = useState('')
  const [joinError, setJoinError]   = useState('')
```
Ajouter juste après :
```js
  const [showJoin, setShowJoin]     = useState(false)
  const [codeCopied, setCodeCopied] = useState(false)
```

- [ ] **Step 2 : Remplacer le JSX de la phase entry**

Trouver le bloc `{/* ── ENTRY */}` dans le JSX. Remplacer tout le bloc `{phase === 'entry' && ( ... )}` par :

```jsx
        {/* ── ENTRY ──────────────────────────────────────────────────────── */}
        {phase === 'entry' && (
          <motion.div key="entry" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-6">
            <div>
              <button onClick={() => navigate('/')} className="text-sm mb-4 block" style={{ color: 'var(--color-text-muted)' }}>← Retour</button>
              <h2 className="text-2xl font-bold text-white mb-1">🕵️ L'Imposteur Online</h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Multijoueur — chacun sur son téléphone</p>
            </div>

            <div>
              <p className="text-sm font-semibold text-white mb-2">Ton prénom</p>
              <input
                value={myName}
                onChange={e => setMyName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && myName.trim() && handleCreate()}
                placeholder="Entre ton prénom…"
                className="w-full rounded-xl px-4 py-3 text-sm text-white"
                style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
              />
            </div>

            <AnimatePresence>
              {myName.trim() && (
                <motion.div key="actions" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
                  <Button onClick={handleCreate} fullWidth size="lg">🎮 Créer une partie</Button>

                  <div className="flex items-center gap-3">
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>ou</span>
                    <div className="h-px flex-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                  </div>

                  {!showJoin ? (
                    <Button onClick={() => setShowJoin(true)} fullWidth size="lg" variant="secondary">🔑 Rejoindre une partie</Button>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2">
                      <input
                        value={joinCode}
                        onChange={e => setJoinCode(e.target.value.toUpperCase())}
                        onKeyDown={e => e.key === 'Enter' && joinCode.length === 6 && handleJoin()}
                        placeholder="Code à 6 lettres — ex : ABCDEF"
                        maxLength={6}
                        autoFocus
                        className="w-full rounded-xl px-4 py-3 text-center text-lg text-white font-mono tracking-widest"
                        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)', outline: 'none' }}
                      />
                      <Button onClick={handleJoin} fullWidth size="lg" variant="secondary" disabled={joinCode.length < 6}>Rejoindre →</Button>
                      {joinError && <p className="text-sm text-center" style={{ color: '#EF4444' }}>{joinError}</p>}
                    </motion.div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
```

- [ ] **Step 3 : Remplacer le JSX de la phase lobby**

Trouver le bloc `{/* ── LOBBY */}`. Remplacer tout le bloc `{phase === 'lobby' && room && ( ... )}` par :

```jsx
        {/* ── LOBBY ──────────────────────────────────────────────────────── */}
        {phase === 'lobby' && room && (
          <motion.div key="lobby" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col gap-5">

            {/* Bloc code */}
            <div className="rounded-2xl p-5 flex flex-col items-center gap-3" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.3)' }}>
              <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--color-text-muted)' }}>Code de la partie</p>
              <p className="text-5xl font-bold font-mono tracking-widest" style={{ color: '#7C3AED' }}>{room.code}</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { navigator.clipboard.writeText(room.code); setCodeCopied(true); setTimeout(() => setCodeCopied(false), 2000) }}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold"
                style={{ background: codeCopied ? 'rgba(16,185,129,0.2)' : 'rgba(124,58,237,0.15)', border: `1px solid ${codeCopied ? '#10B981' : '#7C3AED'}`, color: codeCopied ? '#10B981' : '#A78BFA' }}
              >
                {codeCopied ? '✓ Copié !' : '📋 Copier'}
              </motion.button>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Partage ce code avec tes amis</p>
            </div>

            {/* Joueurs */}
            <div>
              <p className="text-sm font-semibold text-white mb-2">Joueurs ({players.length})</p>
              <div className="flex flex-col gap-2">
                {players.map(p => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <span className="text-lg">{p.is_host ? '👑' : '🕵️'}</span>
                    <span className="font-semibold text-white">{p.name}</span>
                    {p.id === myPlayerId && <span className="text-xs ml-auto" style={{ color: 'var(--color-text-muted)' }}>toi</span>}
                  </div>
                ))}
              </div>
            </div>

            {/* Paramètres host */}
            {isHost && (
              <div className="rounded-2xl p-4 flex flex-col gap-4" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
                <p className="text-sm font-semibold text-white">⚙️ Paramètres</p>

                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Timer de discussion</p>
                  <div className="flex gap-2 flex-wrap">
                    {TIMER_OPTIONS.map(opt => (
                      <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => setHostTimer(opt.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: hostTimer === opt.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hostTimer === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`, color: hostTimer === opt.value ? '#A78BFA' : 'var(--color-text-muted)' }}>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs mb-2" style={{ color: 'var(--color-text-muted)' }}>Manches</p>
                  <div className="flex gap-2 flex-wrap">
                    {ROUND_OPTIONS.map(opt => (
                      <motion.button key={opt.value} whileTap={{ scale: 0.96 }} onClick={() => setHostRounds(opt.value)}
                        className="px-4 py-2 rounded-xl text-sm font-semibold"
                        style={{ background: hostRounds === opt.value ? 'rgba(124,58,237,0.25)' : 'rgba(255,255,255,0.05)', border: `1px solid ${hostRounds === opt.value ? '#7C3AED' : 'rgba(255,255,255,0.1)'}`, color: hostRounds === opt.value ? '#A78BFA' : 'var(--color-text-muted)' }}>
                        {opt.label}
                      </motion.button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleStartGame} fullWidth size="lg" disabled={players.length < 3}>
                  🚀 Lancer la partie
                </Button>
                {players.length < 3 && <p className="text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>Il faut au moins 3 joueurs</p>}
              </div>
            )}

            {!isHost && (
              <p className="text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>
                En attente que le host lance la partie…
              </p>
            )}
          </motion.div>
        )}
```

- [ ] **Step 4 : Vérifier manuellement**

Ouvrir `/play/imposteur-online`. Même vérification que Petit Bac avec 3 onglets minimum (min 3 joueurs pour lancer).

- [ ] **Step 5 : Commit**

```bash
git add src/pages/games/ImposteurOnline.jsx
git commit -m "feat: redesign entry and lobby for ImposteurOnline"
```

---

## Task 4 : Deploy

- [ ] **Step 1 : Build + deploy**

```bash
npx vercel --prod
```

Expected : build réussi, `nightplay.vercel.app` mis à jour.

- [ ] **Step 2 : Vérifier sur mobile**

Tester les deux jeux online sur téléphone réel.

---

## Checklist de couverture spec

| Requirement | Task |
|---|---|
| `online: true` sur petit-bac et imposteur-online | Task 1 |
| GameCard navigue directement pour jeux online | Task 1 |
| Entry : prénom d'abord, puis créer/rejoindre | Tasks 2 & 3 |
| Bouton "Rejoindre" révèle l'input code | Tasks 2 & 3 |
| Lobby : code en grand avec bouton copier | Tasks 2 & 3 |
| Feedback "Copié !" 2 secondes | Tasks 2 & 3 |
| Paramètres host dans section séparée | Tasks 2 & 3 |
| Non-host : message "En attente que le host lance" | Tasks 2 & 3 |
| Deploy | Task 4 |
