create table if not exists imp_rooms (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  host_id uuid not null,
  status text not null default 'waiting',
  current_round int not null default 0,
  total_rounds int not null default 0,
  discussion_time int not null default 120,
  imposteur_knows boolean not null default true,
  created_at timestamptz not null default now()
);

-- Pour une base déjà existante (la table ci-dessus ne sera pas recréée) :
alter table imp_rooms add column if not exists imposteur_knows boolean not null default true;

create table if not exists imp_players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references imp_rooms(id) on delete cascade,
  name text not null,
  score int not null default 0,
  is_host bool not null default false,
  word text,
  is_imposteur bool not null default false,
  voted_for text,
  status text not null default 'waiting'
);

create table if not exists imp_rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references imp_rooms(id) on delete cascade,
  round_number int not null,
  mot_commun text not null,
  mot_imposteur text not null,
  imposteur_player_id uuid references imp_players(id)
);

alter publication supabase_realtime add table imp_rooms;
alter publication supabase_realtime add table imp_players;
alter publication supabase_realtime add table imp_rounds;

alter table imp_rooms enable row level security;
alter table imp_players enable row level security;
alter table imp_rounds enable row level security;

create policy "anon_all" on imp_rooms for all to anon using (true) with check (true);
create policy "anon_all" on imp_players for all to anon using (true) with check (true);
create policy "anon_all" on imp_rounds for all to anon using (true) with check (true);
