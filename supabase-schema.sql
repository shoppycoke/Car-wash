-- ================================================================
-- DRACARYS AUTO — Schéma base de données v2
-- Exécuter dans Supabase → SQL Editor
-- ATTENTION : supprime et recrée toutes les tables existantes
-- ================================================================


-- ── 1. NETTOYAGE COMPLET ──────────────────────────────────────────

drop trigger  if exists on_auth_user_created    on auth.users;
drop trigger  if exists sync_loyalty_points     on public.points_transactions;
drop trigger  if exists sync_points             on public.points_transactions;
drop trigger  if exists set_profiles_updated_at on public.profiles;

drop function if exists public.check_referral_code(text)   cascade;
drop function if exists public.handle_new_user()           cascade;
drop function if exists public.generate_referral_code()    cascade;
drop function if exists public.sync_loyalty_points()       cascade;
drop function if exists public.sync_points_total()         cascade;
drop function if exists public.set_updated_at()            cascade;
drop function if exists public.is_admin()                  cascade;

drop table if exists public.parrainages         cascade;
drop table if exists public.reductions          cascade;
drop table if exists public.points_transactions cascade;
drop table if exists public.prestations         cascade;
drop table if exists public.profiles            cascade;


-- ── 2. TABLES ─────────────────────────────────────────────────────

-- profiles : un enregistrement par utilisateur (lié à auth.users)
-- Les mots de passe ne sont JAMAIS stockés ici, Supabase Auth les gère.
create table public.profiles (
  id             uuid        primary key references auth.users(id) on delete cascade,
  full_name      text,
  email          text,
  phone          text,
  avatar_url     text,
  role           text        not null default 'client'
                             check (role in ('client', 'admin')),
  loyalty_points integer     not null default 0,
  referral_code  text        not null unique,
  referred_by    text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
comment on column public.profiles.referred_by is
  'Code de parrainage saisi à l''inscription (texte, résolu côté serveur)';
comment on column public.profiles.loyalty_points is
  'Synchronisé automatiquement depuis points_transactions via trigger';


-- prestations : services réalisés pour un client (saisie admin uniquement)
create table public.prestations (
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


-- points_transactions : chaque mouvement de points (+/-)
create table public.points_transactions (
  id            uuid        primary key default gen_random_uuid(),
  client_id     uuid        not null references public.profiles(id) on delete cascade,
  montant       integer     not null,
  type          text        not null
                            check (type in ('prestation', 'echange', 'avis', 'parrainage', 'manuel')),
  description   text,
  prestation_id uuid        references public.prestations(id) on delete set null,
  created_at    timestamptz not null default now(),
  created_by    uuid        references auth.users(id)
);


-- reductions : réductions disponibles pour un client
create table public.reductions (
  id          uuid        primary key default gen_random_uuid(),
  client_id   uuid        not null references public.profiles(id) on delete cascade,
  type        text        not null check (type in ('5eur', '10pct')),
  description text        not null,
  utilisee    boolean     not null default false,
  utilisee_at timestamptz,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);


-- parrainages : relation parrain → filleul (créée automatiquement par le trigger)
create table public.parrainages (
  id              uuid        primary key default gen_random_uuid(),
  parrain_id      uuid        not null references public.profiles(id),
  filleul_id      uuid        not null references public.profiles(id),
  valide          boolean     not null default false,
  valide_at       timestamptz,
  reduction_creee boolean     not null default false,
  created_at      timestamptz not null default now(),
  unique(parrain_id, filleul_id)
);


-- ── 3. FONCTIONS ──────────────────────────────────────────────────

-- Génère un code de 6 caractères sans ambiguïtés visuelles (O/0/I/1/l)
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


-- Crée le profil à chaque nouvelle inscription + gère le parrainage
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public as $$
declare
  ref_code     text;
  attempts     int  := 0;
  parrain_uuid uuid;
  ref_used     text;
begin
  -- Génère un code de parrainage unique
  loop
    ref_code := generate_referral_code();
    exit when not exists (select 1 from public.profiles where referral_code = ref_code);
    attempts := attempts + 1;
    exit when attempts >= 10;
  end loop;

  -- Récupère et normalise le code de parrainage saisi
  ref_used := upper(trim(coalesce(new.raw_user_meta_data->>'referred_by', '')));
  if ref_used = '' then
    ref_used := null;
  end if;

  -- Résout le code parrain → UUID (si code invalide, parrainage ignoré silencieusement)
  if ref_used is not null then
    select id into parrain_uuid
    from public.profiles
    where referral_code = ref_used;
    if not found then
      ref_used     := null;
      parrain_uuid := null;
    end if;
  end if;

  -- Crée le profil
  insert into public.profiles (id, full_name, email, phone, referred_by, referral_code)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), ''),
    new.email,
    nullif(trim(coalesce(new.raw_user_meta_data->>'phone', '')), ''),
    ref_used,
    ref_code
  );

  -- Enregistre le parrainage si code valide
  if parrain_uuid is not null then
    insert into public.parrainages (parrain_id, filleul_id)
    values (parrain_uuid, new.id)
    on conflict do nothing;
  end if;

  return new;
end;
$$;


-- Mise à jour automatique de updated_at
create or replace function public.set_updated_at()
returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- Recalcule loyalty_points après chaque modification dans points_transactions
create or replace function public.sync_loyalty_points()
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
  set loyalty_points = (
    select coalesce(sum(montant), 0)
    from public.points_transactions
    where client_id = target_id
  )
  where id = target_id;
  return coalesce(new, old);
end;
$$;


-- Vérifie si l'utilisateur connecté est admin (security definer = contourne RLS)
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


-- Vérifie si un code de parrainage existe (appelable par un utilisateur anonyme)
create or replace function public.check_referral_code(code text)
returns boolean
language sql
security definer
stable as $$
  select exists(
    select 1 from public.profiles
    where referral_code = upper(trim(code))
  );
$$;


-- ── 4. TRIGGERS ───────────────────────────────────────────────────

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

create trigger sync_loyalty_points
  after insert or update or delete on public.points_transactions
  for each row execute procedure public.sync_loyalty_points();


-- ── 5. ROW LEVEL SECURITY ─────────────────────────────────────────

alter table public.profiles            enable row level security;
alter table public.prestations         enable row level security;
alter table public.points_transactions enable row level security;
alter table public.reductions          enable row level security;
alter table public.parrainages         enable row level security;


-- ── profiles ──────────────────────────────────────────────────────

-- Un utilisateur voit uniquement son propre profil (ou admin voit tout)
create policy "profiles: select"
  on public.profiles for select
  using (auth.uid() = id or is_admin());

-- Un utilisateur modifie uniquement son profil, sans pouvoir changer son rôle
create policy "profiles: update own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (
    auth.uid() = id
    and role = (select role from public.profiles where id = auth.uid())
  );

-- L'admin peut tout faire
create policy "profiles: admin all"
  on public.profiles for all
  using (is_admin());


-- ── prestations ───────────────────────────────────────────────────

create policy "prestations: select"
  on public.prestations for select
  using (auth.uid() = client_id or is_admin());

create policy "prestations: admin all"
  on public.prestations for all
  using (is_admin());


-- ── points_transactions ───────────────────────────────────────────

create policy "transactions: select"
  on public.points_transactions for select
  using (auth.uid() = client_id or is_admin());

-- Un client peut uniquement insérer un échange de ses propres points
create policy "transactions: client exchange"
  on public.points_transactions for insert
  with check (auth.uid() = client_id and type = 'echange');

create policy "transactions: admin all"
  on public.points_transactions for all
  using (is_admin());


-- ── reductions ────────────────────────────────────────────────────

create policy "reductions: select"
  on public.reductions for select
  using (auth.uid() = client_id or is_admin());

create policy "reductions: admin all"
  on public.reductions for all
  using (is_admin());


-- ── parrainages ───────────────────────────────────────────────────

create policy "parrainages: select"
  on public.parrainages for select
  using (auth.uid() in (parrain_id, filleul_id) or is_admin());

create policy "parrainages: admin all"
  on public.parrainages for all
  using (is_admin());


-- ── 6. INDEX ──────────────────────────────────────────────────────

create index idx_profiles_referral_code  on public.profiles(referral_code);
create index idx_profiles_role           on public.profiles(role);
create index idx_profiles_email          on public.profiles(email);
create index idx_prestations_client      on public.prestations(client_id);
create index idx_points_tx_client        on public.points_transactions(client_id);
create index idx_reductions_client       on public.reductions(client_id);
create index idx_parrainages_parrain     on public.parrainages(parrain_id);
create index idx_parrainages_filleul     on public.parrainages(filleul_id);


-- ── 7. DÉFINIR LE PREMIER ADMIN ───────────────────────────────────
--
-- 1. Créez votre compte sur auth.html
-- 2. Exécutez ensuite cette requête dans SQL Editor (remplacez l'email) :
--
--    update public.profiles
--    set role = 'admin'
--    where email = 'votre@email.fr';
--
-- Vérification :
--
--    select id, email, role, referral_code
--    from public.profiles
--    where role = 'admin';
--
-- ═══════════════════════════════════════════════════════════════════
-- RÉSUMÉ DES TABLES
-- ═══════════════════════════════════════════════════════════════════
--
--  profiles            — un par utilisateur, lié à auth.users
--  prestations         — services réalisés (saisie admin)
--  points_transactions — mouvements de points (+/-)
--  reductions          — réductions disponibles
--  parrainages         — relation parrain ↔ filleul
--
-- FONCTIONS CLÉS
--
--  handle_new_user()       — trigger auto : crée profil + parrainage
--  sync_loyalty_points()   — trigger auto : recalcule loyalty_points
--  is_admin()              — helper RLS : vérifie le rôle admin
--  check_referral_code()   — RPC publique : valide un code de parrainage
--
-- SÉCURITÉ
--
--  - Mots de passe : gérés exclusivement par Supabase Auth (jamais stockés ici)
--  - RLS activé sur toutes les tables
--  - Un client ne peut pas modifier son rôle
--  - Les accès admin sont protégés par is_admin() (security definer)
--  - La clé service_role ne doit JAMAIS être exposée côté frontend
-- ═══════════════════════════════════════════════════════════════════
