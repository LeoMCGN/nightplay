# Spec — Le Petit Bac (multijoueur Supabase)

**Date :** 2026-05-03  
**Statut :** Approuvé

---

## Contexte

Ajout d'un nouveau jeu "Le Petit Bac" à l'app NightPlay. Contrairement aux autres jeux (single-device, pass-and-play), ce jeu est **multijoueur sur devices séparés** via Supabase Realtime. Chaque joueur joue sur son propre téléphone en rejoignant une room avec un code à 6 caractères.

---

## Architecture

### Stack
- **Frontend** : React + Vite (existant)
- **Temps réel** : Supabase Realtime (abonnements sur tables)
- **Base de données** : Supabase PostgreSQL
- **Déploiement** : Vercel (existant)

### Supabase — 4 tables

#### `bac_rooms`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| code | text UNIQUE | Code à 6 caractères majuscules |
| host_id | text | player_id du host |
| status | text | `waiting` / `playing` / `revealing` / `scores` / `finished` |
| current_round | int | Numéro du round en cours (1-based) |
| total_rounds | int | 0 = libre (pas de limite) |
| timer_seconds | int | 0 = sans timer, sinon 60/90/120 |
| categories | text[] | Liste des catégories activées |
| created_at | timestamptz | |

#### `bac_players`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| room_id | uuid FK | |
| name | text | Nom du joueur |
| score | int | Score total cumulé |
| status | text | `waiting` / `answered` |
| is_host | bool | |

#### `bac_rounds`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| room_id | uuid FK | |
| round_number | int | |
| letter | char(1) | Lettre tirée aléatoirement |
| status | text | `playing` / `done` |

#### `bac_answers`
| Colonne | Type | Description |
|---|---|---|
| id | uuid PK | |
| round_id | uuid FK | |
| player_id | uuid FK | |
| category | text | Nom de la catégorie |
| answer | text | Réponse du joueur (vide si aucune) |
| points | int | Calculé à la révélation : 0 / 1 / 2 |

### Realtime
Chaque client s'abonne à :
- `bac_rooms` WHERE `id = room_id` → changements de statut, round
- `bac_players` WHERE `room_id = room_id` → arrivée/départ joueurs, statuts
- `bac_answers` WHERE `round_id = current_round_id` → suivi de qui a répondu

---

## Flux de jeu détaillé

### 1. Accueil — Créer ou rejoindre
- Bouton **Créer une partie** → génère un code à 6 chars, crée la room, passe en lobby
- Bouton **Rejoindre** → saisie du code → rejoint la room si statut `waiting`
- Le joueur saisit son prénom avant d'entrer (pas de GameContext partagé ici, chaque device est indépendant)

### 2. Lobby (statut : `waiting`)
- Affiche le code en grand pour le partager
- Liste des joueurs connectés (realtime)
- Le host voit les options de configuration :
  - Catégories à activer (checkboxes)
  - Timer par round (Sans timer / 60s / 90s / 2min)
  - Nombre de rounds (Libre / 3 / 5 / 10)
- Bouton **Lancer la partie** visible uniquement pour le host (min. 2 joueurs)

### 3. Lettre du round (statut : `playing`)
- Le host clique "Round suivant" → insert dans `bac_rounds` avec lettre aléatoire
- Tous les clients voient la lettre apparaître avec une animation
- Timer démarre simultanément pour tous

### 4. Saisie des réponses
- Formulaire avec toutes les catégories activées
- Champ texte par catégorie, préfixé par la lettre (placeholder : "un mot en **B**…")
- Bouton **Terminé** → insère les réponses dans `bac_answers`, passe le player status à `answered`
- Quand timer expire → même effet que "Terminé" (réponses vides pour les champs non remplis)
- Compteur visible : "X/Y joueurs ont répondu"
- Quand **tous** les joueurs ont `status = answered` → le client du host détecte cela via Realtime et met à jour le statut de la room en `revealing` (un seul client trigger la transition pour éviter les races)

### 5. Révélation (statut : `revealing`)
- Calcul des points automatique :
  - Pour chaque catégorie, normaliser les réponses (lowercase, trim)
  - Réponse vide → 0 pt
  - Réponse partagée avec au moins un autre joueur → 1 pt
  - Réponse unique → 2 pts
  - Mettre à jour `bac_answers.points` et cumuler dans `bac_players.score`
- Le calcul est déclenché par le host (évite les doublons de calcul)
- Affichage catégorie par catégorie : toutes les réponses des joueurs, avec badge de points

### 6. Scores inter-rounds (statut : `scores`)
- Classement de tous les joueurs avec score cumulé
- Bouton **Round suivant** (host) ou **Voir le podium** si dernier round

### 7. Fin de partie (statut : `finished`)
- Podium animé (top 3)
- Score final de tous les joueurs
- Bouton **Rejouer** (recrée une room) et **Quitter**

---

## Catégories disponibles

| ID | Label |
|---|---|
| prenom | Prénom |
| ville | Ville |
| pays | Pays |
| animal | Animal |
| metier | Métier |
| fruit | Fruit / Légume |
| objet | Objet |
| marque | Marque |
| film | Film |
| serie | Série |
| sport | Sport |
| jeu_video | Jeu vidéo |

Toutes activées par défaut. Le host peut en désactiver.

---

## Scoring

- Réponse vide : **0 pt**
- Réponse identique à au moins un autre joueur (insensible à la casse, espaces ignorés) : **1 pt**
- Réponse unique : **2 pts**
- Les points sont stockés dans `bac_answers.points` puis cumulés dans `bac_players.score`

---

## Lettres disponibles

Alphabet français sans les lettres rares : **A B C D E F G H I J L M N O P R S T V** (pas de K, Q, W, X, Y, Z sauf si activés en option ultérieure).

---

## Intégration dans NightPlay

### `src/data/games.js`
Ajout d'une entrée pour Le Petit Bac avec route `/play/petit-bac`, couleur `#F59E0B`, gradient `from-amber-500 to-yellow-600`, tags `👥 Multijoueur`, `🧠 Culture générale`, `⏱ Timer`.

### `src/App.jsx`
Ajout de la route `/play/petit-bac` pointant vers le nouveau composant.

### `src/pages/games/PetitBac.jsx`
Composant principal gérant toutes les phases du jeu.

### `src/lib/supabase.js` (nouveau)
Client Supabase initialisé avec les variables d'environnement `VITE_SUPABASE_URL` et `VITE_SUPABASE_ANON_KEY`.

---

## Variables d'environnement requises

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

À ajouter dans `.env.local` et dans les variables d'environnement Vercel.

---

## Ce qui n'est PAS dans le scope

- Authentification utilisateur (joueurs anonymes, identifiés par un UUID local)
- Chat entre joueurs
- Contestation de réponses (vote)
- Personnalisation des noms d'équipes
- Catégories custom saisies par le host (prévu pour une itération future)
