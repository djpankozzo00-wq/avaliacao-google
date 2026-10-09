-- Execute este SQL no SQL Editor do seu projeto Supabase.
create extension if not exists pgcrypto;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  review_url text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies enable row level security;

-- O acesso é feito exclusivamente pelas rotas de servidor usando a service role key.
-- Não crie políticas públicas de leitura ou escrita para esta tabela.
