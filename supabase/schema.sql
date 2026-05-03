-- Tables pour Le Petit Bac

create table if not exists bac_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null,
  status text not null default 'waiting',
  current_round int not null default 0,
  total_rounds int not null default 0,
  timer_seconds int not null default 60,
  categories text[] not null default array[
    'prenom','ville','pays','animal','metier',
    'fruit','objet','marque','film','serie','sport','jeu_video'
  ],
  created_at timestamptz not null default now()
);

create table if not exists bac_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references bac_rooms(id) on delete cascade,
  name text not null,
  score int not null default 0,
  status text not null default 'waiting',
  is_host bool not null default false
);

create table if not exists bac_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references bac_rooms(id) on delete cascade,
  round_number int not null,
  letter char(1) not null,
  status text not null default 'playing'
);

create table if not exists bac_answers (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references bac_rounds(id) on delete cascade,
  player_id uuid not null references bac_players(id) on delete cascade,
  category text not null,
  answer text not null default '',
  points int not null default 0
);

-- Activer Realtime sur les 4 tables
alter publication supabase_realtime add table bac_rooms;
alter publication supabase_realtime add table bac_players;
alter publication supabase_realtime add table bac_rounds;
alter publication supabase_realtime add table bac_answers;

-- RLS : accès complet pour les clients anonymes (pas d'auth dans cette app)
alter table bac_rooms enable row level security;
alter table bac_players enable row level security;
alter table bac_rounds enable row level security;
alter table bac_answers enable row level security;

create policy "anon_all" on bac_rooms for all to anon using (true) with check (true);
create policy "anon_all" on bac_players for all to anon using (true) with check (true);
create policy "anon_all" on bac_rounds for all to anon using (true) with check (true);
create policy "anon_all" on bac_answers for all to anon using (true) with check (true);
