# Pictionary — Design Spec
*NightPlay · 2026-04-28*

## Contexte

NightPlay est une PWA React 19 + Vite + Tailwind CSS pour jeux de soirée. Elle contient déjà Action ou Vérité, La Bouteille et L'Imposteur. Chaque jeu suit le même pattern : une page JSX autonome + une entrée dans `games.js` + une route dans `App.jsx`. Le `GameContext` fournit la liste des joueurs, l'index du joueur courant et `nextPlayer()`.

## Objectif

Ajouter un jeu Pictionary : un joueur dessine sur son téléphone (canvas tactile), les autres devinent à l'oral. Timer configurable, score en mode individuel ou équipes, grosse base de mots par catégories + mots custom.

---

## Fichiers impactés

| Fichier | Changement |
|---|---|
| `src/data/games.js` | Ajout entrée Pictionary |
| `src/App.jsx` | Ajout route `/play/pictionary` + import |
| `src/pages/games/Pictionary.jsx` | **Nouveau** — composant principal |
| `src/data/pictionary.json` | **Nouveau** — base de mots par catégories |

---

## Flow de jeu

```
setup → secret → draw → result → [scores] → tour suivant (retour à secret)
```

### Phase `setup` (une seule fois au démarrage)

Paramètres configurables :
1. **Mode** : Individuel / Équipes
   - Si Équipes : choix du nombre d'équipes (2, 3, 4) puis assignation des joueurs par drag ou bouton
2. **Timer** : Off / 30s / 60s / 90s / 120s (toggle + slider discret)
3. **Catégories de mots** : cases à cocher (animaux, objets, films & séries, actions, métiers, lieux, nourriture) — au moins une obligatoire
4. **Mots custom** : champ texte + bouton Ajouter, liste des mots ajoutés avec suppression individuelle

Bouton "C'est parti !" disabled tant qu'aucune catégorie ou aucun mot custom sélectionné.

### Phase `secret`

- Affiche "Passe le téléphone à **[joueur]**" sur fond sombre
- Gros bouton "Voir mon mot" — appuie pour révéler
- Le mot s'affiche seul à l'écran (grand, centré)
- Bouton "Tout le monde est prêt — on dessine !" pour lancer le timer et passer au canvas

### Phase `draw`

- Canvas plein écran (occupe toute la hauteur disponible)
- Header compact : mot affiché en haut (visible du dessinateur), timer si activé
- Barre d'outils en bas :
  - Palette 8 couleurs (noir, blanc, rouge, orange, jaune, vert, bleu, violet)
  - 3 tailles de trait (fin / normal / épais)
  - Toggle gomme
  - Bouton effacer tout (hold 0.6s pour confirmer, évite les fausses manips)
- Deux boutons d'action :
  - **"✅ Deviné !"** : en mode individuel → saisie rapide du nom du devineur parmi la liste joueurs ; en mode équipes → simple confirmation
  - **"⏭ Passer"** : passe le tour sans point
- Quand timer atteint 0 : vibration (API Vibration si dispo) + passage automatique à `result`

### Phase `result`

- Affiche le mot, si deviné ou non, points attribués ce tour
- Bouton "Voir les scores" (optionnel, modal)
- Bouton "Tour suivant →" → retour à `secret` avec le joueur/équipe suivant

---

## Canvas

- `<canvas>` HTML5 natif
- Events : `pointerdown`, `pointermove`, `pointerup`, `pointerleave`
- `touch-action: none` sur le canvas pour bloquer le scroll
- `willReadFrequently: false`, `desynchronized: true` pour les perfs
- Fond blanc (nécessaire pour le rendu visuel)
- Effacement automatique entre chaque tour (au passage à `secret`)

---

## Données mots — `pictionary.json`

Structure :
```json
{
  "animaux": ["chien", "baleine", "girafe", ...],
  "objets": ["parapluie", "réfrigérateur", ...],
  "films": ["Titanic", "Le Roi Lion", ...],
  "actions": ["nager", "sauter", "conduire", ...],
  "metiers": ["pompier", "chirurgien", ...],
  "lieux": ["plage", "aéroport", "forêt", ...],
  "nourriture": ["pizza", "sushi", "crêpe", ...]
}
```

Minimum 30 mots par catégorie. Les mots custom s'ajoutent à la pool de la partie uniquement (pas persistés).

---

## Scoring

### Mode individuel
- Dessinateur : **+2 pts** si quelqu'un devine avant la fin du timer
- Devineur désigné : **+1 pt**
- Aucun point si temps écoulé ou "Passer"

### Mode équipes
- L'équipe qui devine (pas celle qui dessine) : **+2 pts**
- Aucun point si temps écoulé ou "Passer"
- Les équipes alternent : équipe A dessine → équipe B devine → équipe B dessine → équipe A devine → etc.
- Si 3+ équipes : rotation circulaire

### Tableau des scores
- Accessible via bouton discret dans le header pendant la phase `draw`
- Modal plein écran : classement avec noms et points
- Pas de limite de tours — on joue jusqu'à décision manuelle

---

## Intégration avec le pattern existant

- Utilise `useGame()` uniquement pour `players` (liste des joueurs saisie dans PlayerSetup)
- Tout l'état (phase, scores, équipes, timer, mots, index courant) est local au composant
- Utilise `useWakeLock()` pour garder l'écran allumé pendant le dessin
- Suit les conventions UI : `Layout`, `Button`, `Modal`, Framer Motion pour les transitions entre phases
- Pas de modification du `GameContext`

---

## Ce qui n'est pas dans le scope

- Dessin multijoueur en temps réel (réseau)
- Sauvegarde des parties
- Personnalisation des couleurs de la palette
- Export/partage du dessin
