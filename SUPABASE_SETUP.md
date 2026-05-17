# Supabase Setup Guide

This app now uses **Supabase Postgres** for users and conversations.

## 1) Environment variables

Add these to your `.env` and Vercel project settings:

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
JWT_SECRET=your_jwt_secret
GROQ_API_KEY=...
MISTRAL_API_KEY=...
OPENAI_API_KEY=...
```

## 2) Create tables in Supabase SQL editor

```sql
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.users(id) on delete cascade,
  chat_id text not null,
  title text not null default 'New Chat',
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, chat_id)
);
```

## 3) RLS recommendation

Because this app uses the **service role key on the backend**, RLS is optional for app functionality, but still recommended for defense in depth if you later move to client-side Supabase access.
