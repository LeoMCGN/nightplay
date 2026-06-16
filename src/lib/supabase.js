import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Transforme une erreur Supabase / réseau en message clair pour le joueur.
// `action` complète la phrase, ex. "créer la partie" → "Impossible de créer la partie : …".
export function supabaseErrorMessage(err, action = 'effectuer cette action') {
  const msg = String(err?.message || '')

  // Pas de code PostgREST => la requête n'a pas atteint la base (DNS, réseau,
  // projet Supabase en veille…). C'est le cas le plus fréquent côté joueur.
  const isConnection =
    !err?.code || /fetch|network|load failed|time?out|connexion/i.test(msg)
  if (isConnection) {
    return "Connexion au serveur impossible 😕 Le serveur de jeu est peut-être en veille — réessaie dans quelques instants."
  }

  // Table absente : la base existe mais le schéma n'a pas été appliqué.
  if (err?.code === '42P01') {
    return "Le serveur de jeu n'est pas correctement configuré (table manquante)."
  }

  return `Impossible de ${action}${msg ? ` : ${msg}` : '.'}`
}
