-- =======================================================
-- DRACARYS AUTO — Schéma fidélité
-- À exécuter dans l'éditeur SQL de votre projet Supabase
-- https://app.supabase.com → SQL Editor
-- =======================================================

-- -------------------------------------------------------
-- TABLES
-- -------------------------------------------------------

create table if not exists public.profiles (
  id                uuid        primary key references auth.users on delete cascade,
  prenom            text        not null,
  telephone         text,
  code_parrainage   text        unique not null,
  parrain_id        uuid        references public.profiles(id) on delete set null,
  points            integer     not null default 0,
  role              text        not null default 'client'
                                check (role in ('client', 'admin')),
  rgpd_accepted_at  timestamptz,
  created_at        timestamptz not null default now()
);

create table if not exists public.prestations (
  id              uuid          primary key default gen_random_uuid(),
  client_id       uuid          not null references public.profiles(id) on delete cascade,
  date            date          not null default current_date,
  montant         numeric(10,2) not null check (montant >= 0),
  formule         text,
  description     text,
  statut          text          not null default 'completed'
                                check (statut in ('pending', 'completed', 'cancelled')),
  points_credited integer       not null default 0,
  created_at      timestamptz   not null default now(),
  created_by      uuid          references auth.users(id)
);

create table if not exists public.points_transactions (
  id            uuid        primary key default gen_random_uuid(),
  client_id     uuid        not null references public.profiles(id) on delete cascade,
  montant       integer     not null,
  type          text        not null
                            check (type in (
                              'prestation',
                              'echange',
                              'avis',
                              'parrainage',
                              'manuel'
                            )),
  description   text,
  prestation_id uuid        references public.prestations(id) on delete set null,
  created_at    timestamptz not null default now(),
  created_by    uuid        references auth.users(id)
);

create table if not exists public.reductions (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null check (type in ('5eur', '10pct')),
  description text        not null,
  utilisee    boolean     not null default false,
  utilisee_at timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);

create table if not exists public.parrainages (
  id               uuid        primary key default gen_random_uuid(),
  parrain_id       uuid        not null references public.profiles(id),
  filleul_id       uuid        not null references public.profiles(id),
  valide           boolean     not null default false,
  valide_at        timestamptz,
  reduction_creee  boolean     not null default false,
  created_at       timestamptz not null default now(),
  unique(parrain_id, filleul_id)
);

-- -------------------------------------------------------
-- FONCTIONS & TRIGGERS
-- -------------------------------------------------------

-- Génère un code de parrainage de 6 caractères (sans ambiguïtés O/0/I/1/l)
create or replace function public.generate_referral_code()
returns text
language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code     text := '';
  i        int;
begin
  for i in 1..6 loop
    code := code || substr(alphabet, (floor(random() * length(alphabet)) + 1)::int, 1);
  end loop;
  return code;
end;
$$;

-- Crée automatiquement un profil à chaque inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  ref_code text;
  attempts int := 0;
begin
  loop
    ref_code := generate_referral_code();
    exit when not exists (select 1 from profiles where code_parrainage = ref_code);
    attempts := attempts + 1;
    exit when attempts >= 10;
  end loop;

  insert into public.profiles (id, prenom, code_parrainage)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'prenom', 'Client'),
    ref_code
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Synchronise le total de points après chaque transaction
create or replace function public.sync_points_total()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  target_id uuid;
begin
  target_id := coalesce(
    case tg_op when 'DELETE' then old.client_id else new.client_id end,
    old.client_id
  );
  update public.profiles
  set points = (
    select coalesce(sum(montant), 0)
    from public.points_transactions
    where client_id = target_id
  )
  where id = target_id;
  return coalesce(new, old);
end;
$$;

drop trigger if exists sync_points on public.points_transactions;
create trigger sync_points
  after insert or update or delete on public.points_transactions
  for each row execute procedure public.sync_points_total();

-- -------------------------------------------------------
-- ROW LEVEL SECURITY
-- -------------------------------------------------------

alter table public.profiles            enable row level security;
alter table public.prestations         enable row level security;
alter table public.points_transactions enable row level security;
alter table public.reductions          enable row level security;
alter table public.parrainages         enable row level security;

-- Fonction helper : utilisateur connecté = admin ?
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable as $$
  select coalesce(
    (select role = 'admin' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- profiles
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or is_admin());

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_admin" on public.profiles
  for all using (is_admin());

-- prestations
create policy "prestations_select" on public.prestations
  for select using (auth.uid() = client_id or is_admin());

create policy "prestations_admin" on public.prestations
  for all using (is_admin());

-- points_transactions
create policy "transactions_select" on public.points_transactions
  for select using (auth.uid() = client_id or is_admin());

create policy "transactions_admin" on public.points_transactions
  for all using (is_admin());

-- reductions
create policy "reductions_select" on public.reductions
  for select using (auth.uid() = client_id or is_admin());

create policy "reductions_update_own" on public.reductions
  for update using (auth.uid() = client_id);

create policy "reductions_admin" on public.reductions
  for all using (is_admin());

-- parrainages
create policy "parrainages_select" on public.parrainages
  for select using (auth.uid() in (parrain_id, filleul_id) or is_admin());

create policy "parrainages_insert_filleul" on public.parrainages
  for insert with check (auth.uid() = filleul_id);

create policy "parrainages_admin" on public.parrainages
  for all using (is_admin());

-- -------------------------------------------------------
-- INDEX
-- -------------------------------------------------------
create index if not exists idx_points_tx_client  on public.points_transactions(client_id);
create index if not exists idx_prestations_client on public.prestations(client_id);
create index if not exists idx_reductions_client  on public.reductions(client_id);
create index if not exists idx_parrainages_parrain on public.parrainages(parrain_id);
create index if not exists idx_profiles_code      on public.profiles(code_parrainage);

-- -------------------------------------------------------
-- PREMIER ADMIN
-- Pour définir un administrateur, exécutez ceci après
-- avoir créé votre compte via auth.html, en remplaçant
-- l'email par le vôtre :
--
--   update public.profiles
--   set role = 'admin'
--   where id = (
--     select id from auth.users where email = 'votre@email.fr'
--   );
-- -------------------------------------------------------
