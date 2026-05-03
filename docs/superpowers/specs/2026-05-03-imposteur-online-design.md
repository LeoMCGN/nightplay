# Spec — L'Imposteur Online (multijoueur Supabase)

**Date :** 2026-05-03  
**Statut :** Approuvé

---

## Contexte

Portage du jeu "L'Imposteur" en multijoueur temps réel via Supabase Realtime. Chaque joueur joue sur son propre device. La version actuelle (`Imposteur.jsx`) reste intacte — un nouveau composant `ImposteurOnline.jsx` est créé, accessible via une nouvelle route et une nouvelle carte sur la Home.

---

## Architecture

### Stack
- **Frontend** : React + Vite (existant)
- **Temps réel** : Supabase Realtime (existant, `src/lib/supabase.js`)
- **Base de données** : Supabase PostgreSQL (même projet que Petit Bac)
- **Déploiement** : Vercel (existant)

### Supabase — 3 tables

#### `imp_rooms`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE | Code à 6 caractères majuscules |
| host_id | uuid | player_id du host |
| status | text | `waiting` / `distribution` / `discussion` / `vote` / `revealing` / `result` / `finished` |
| current_round | int | Manche en cours (1-based) |
| total_rounds | int | 0 = libre (pas de limite) |
| discussion_time | int | Durée du timer en secondes (60/120/180/0=sans) |
| created_at | timestamptz | |

#### `imp_players`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | UUID généré côté client |
| room_id | uuid FK | |
| name | text | Prénom du joueur |
| score | int | Score cumulé |
| is_host | bool | |
| word | text | Mot secret assigné (null avant distribution) |
| is_imposteur | bool | true si ce joueur est l'imposteur |
| voted_for | text | Nom du suspect voté (null avant vote) |

#### `imp_rounds`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| room_id | uuid FK | |
| round_number | int | |
| mot_commun | text | Mot que tous les innocents reçoivent |
| mot_imposteur | text | Mot légèrement différent de l'imposteur |
| imposteur_player_id | uuid | FK vers imp_players |

### Realtime
Chaque client s'abonne via un seul channel `imp-room-${room.id}` à :
- `imp_rooms` WHERE `id = room_id` → changements de statut, round
- `imp_players` WHERE `room_id = room_id` → arrivée joueurs, votes, mises à jour scores

---

## Flux de jeu détaillé

### 1. Entry (statut : `waiting`)
- Saisie du prénom
- Bouton **Créer une partie** → génère code 6 chars, crée la room + le joueur host
- Bouton **Rejoindre** + saisie du code → rejoint si statut `waiting`

### 2. Lobby (statut : `waiting`)
- Code affiché en grand pour partage
- Liste des joueurs connectés (realtime)
- Host configure :
  - Timer de discussion (Sans timer / 1 min / 2 min / 3 min)
  - Nombre de manches (Libre / 3 / 5 / 10)
- Bouton **Lancer** visible uniquement pour le host (min. 3 joueurs)

### 3. Distribution (statut : `distribution`)
Le host déclenche la distribution au lancement de chaque manche :
1. Tire une paire aléatoire depuis `imposteur.json`
2. Désigne un imposteur aléatoire parmi les joueurs
3. Met à jour `imp_players.word` et `imp_players.is_imposteur` pour chaque joueur
4. Insère dans `imp_rounds`
5. Passe la room en `distribution`

Chaque joueur voit sur son device :
- Son mot secret (affiché directement, plus de pass-and-play)
- S'il est l'imposteur : badge orange "Tu es l'IMPOSTEUR !"
- Bouton **Prêt** → met son statut à `ready`

Quand tous les joueurs sont `ready` → host passe la room en `discussion`.

### 4. Discussion (statut : `discussion`)
- Timer visible et synchronisé pour tous (décompte local basé sur `room.discussion_time`)
- À expiration → room passe automatiquement en `vote` (déclenché par le host)
- Bouton **Passer au vote** visible uniquement pour le host (arrête le timer)
- Les joueurs discutent à voix haute autour de la table

### 5. Vote (statut : `vote`)
- Chaque joueur voit la liste de tous les autres joueurs
- Tape sur un nom pour voter → `imp_players.voted_for` mis à jour
- Compteur "X/Y ont voté" visible par tous
- Quand tous ont voté → host détecte et passe en `revealing`

### 6. Révélation (statut : `revealing`)
- Animation de dépouillement (2.5s) — identique à la version actuelle
- Calcul automatique (host) :
  - Décompte des votes, identifie le plus accusé
  - Si l'imposteur est le plus accusé : innocents +1 pt chacun
  - Sinon : imposteur +2 pts
  - Mise à jour `imp_players.score`
- Host passe en `result` après 2.5s

### 7. Résultat (statut : `result`)
- Verdict (Démasqué / L'imposteur a gagné)
- Mots révélés (mot commun + mot imposteur + qui était l'imposteur)
- Votes de chaque joueur
- Classement des scores
- Host : bouton **Manche suivante** ou **Voir le podium** si dernière manche

### 8. Fin de partie (statut : `finished`)
- Podium animé
- Boutons **Rejouer** et **Accueil**

---

## Scoring

- Groupe a trouvé l'imposteur (imposteur est le plus voté) : tous les innocents **+1 pt**
- Imposteur non trouvé : imposteur **+2 pts**
- Égalité de votes : l'imposteur n'est pas trouvé → imposteur +2 pts

---

## Intégration dans NightPlay

### `supabase/schema-imposteur.sql`
Script SQL à exécuter dans le dashboard Supabase.

### `src/data/games.js`
Nouvelle entrée `imposteur-online` avec route `/play/imposteur-online`, couleur `#7C3AED`, gradient `from-violet-600 to-purple-900`, tags `📱 Multijoueur`, `🧠 Stratégie`.

### `src/App.jsx`
Route `/play/imposteur-online` → `ImposteurOnline`

### `src/pages/games/ImposteurOnline.jsx`
Nouveau composant. L'existant `Imposteur.jsx` reste intact.

---

## Ce qui n'est PAS dans le scope

- Modifier `Imposteur.jsx` existant
- Authentification (joueurs anonymes par UUID local)
- Chat intégré
- Contestation de votes
