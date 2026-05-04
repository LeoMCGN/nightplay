# Spec — Redesign lobby multijoueur + bypass PlayerSetup

**Date :** 2026-05-04  
**Statut :** Approuvé

---

## Contexte

Les jeux multijoueurs en ligne (Petit Bac, Imposteur Online) passent actuellement par `PlayerSetup` avant d'arriver à leur propre écran d'entrée. Le joueur entre tous les noms dans PlayerSetup, puis re-entre son prénom dans le jeu. Doublon inutile. De plus, l'écran d'entrée et le lobby des jeux online manquent de clarté.

---

## Scope

1. **Bypass PlayerSetup** pour les jeux online
2. **Redesign entry** (écran d'entrée) — même UX pour PetitBac et ImposteurOnline
3. **Redesign lobby** (salle d'attente) — même UX pour PetitBac et ImposteurOnline

Hors scope : nouveau mode local pour les jeux online, modifications des jeux locaux existants.

---

## Changements

### 1. `src/data/games.js`

Ajouter `online: true` sur les entrées `petit-bac` et `imposteur-online`.

### 2. `src/components/GameCard.jsx`

Si `game.online === true` → `navigate(game.route)` directement.  
Sinon → `navigate('/setup/' + game.id)` (comportement actuel).

### 3. `src/pages/games/PetitBac.jsx` — Phase entry + lobby

#### Entry (phase `entry`)

Flux en 2 étapes visuelles dans un même écran :

**Étape 1 — Prénom**
- Label "Ton prénom"
- Input text, placeholder "Entre ton prénom…"
- L'étape 2 apparaît uniquement quand le prénom est renseigné (≥ 1 char)

**Étape 2 — Action** (visible après prénom)
- Bouton principal : `🎮 Créer une partie`
- Séparateur "ou"
- Bouton secondaire : `🔑 Rejoindre une partie`
  - Au clic → révèle un input code 6 chars + bouton "Rejoindre"
  - Message d'erreur si code invalide

#### Lobby (phase `lobby`)

```
Titre du jeu (emoji + nom)

Bloc code :
  Label "Code de la partie"
  Code en très grand (font-mono, tracking-widest, couleur accent)
  Bouton [📋 Copier] → copie dans presse-papier, feedback "Copié !"
  Sous-texte "Partage ce code avec tes amis"

Bloc joueurs :
  Label "Joueurs (N/max)"
  Liste : 👑 nom (toi) / 🎮 nom

Bloc paramètres (host seulement, dans une section visuellement séparée) :
  Timer : [Sans] [1min] [2min] [3min]
  Manches : [Libre] [3] [5] [10]
  Bouton [🚀 Lancer] — grisé si < minPlayers
  Message "Il faut au moins X joueurs" si pas assez

Non-host :
  "En attente que [host] lance la partie…"
```

### 4. `src/pages/games/ImposteurOnline.jsx` — Phase entry + lobby

Même redesign que PetitBac avec les paramètres propres à l'Imposteur (minPlayers = 3).

---

## Comportement du bouton Copier

```js
navigator.clipboard.writeText(room.code)
// puis setCodeCopied(true) → reset après 2s
```

Affiche "✓ Copié !" pendant 2 secondes puis revient à "📋 Copier".

---

## Ce qui ne change pas

- `Imposteur.jsx` (version locale) — intact
- `PlayerSetup.jsx` — intact (utilisé par action-verite, bouteille, imposteur, pictionary)
- Logique métier de PetitBac et ImposteurOnline — uniquement la UI entry/lobby change
