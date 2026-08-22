-- ============================================================
-- FILMMETRICS DATABASE SCHEMA
-- Week 4: Backend & Database Integration
-- Week 5: Analytics support
-- Week 6: AI Insights support
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================

create extension if not exists "pgcrypto";


-- ============================================================
-- 1. MOVIES
-- ============================================================

create table if not exists public.movies (
    id uuid primary key default gen_random_uuid(),

    title text not null,

    description text,

    video_url text,

    thumbnail_url text,

    duration_seconds integer,

    review_code text unique,

    filmmaker_id uuid,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- 2. VIEWING SESSIONS
-- ============================================================

create table if not exists public.sessions (
    id uuid primary key default gen_random_uuid(),

    movie_id uuid not null
        references public.movies(id)
        on delete cascade,

    viewer_id text,

    started_at timestamptz not null default now(),

    ended_at timestamptz,

    duration_seconds numeric default 0,

    completion_percentage numeric default 0,

    user_agent text,

    metadata jsonb default '{}'::jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 3. PASSIVE VIEWING EVENTS
-- ============================================================

create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),

    session_id uuid not null
        references public.sessions(id)
        on delete cascade,

    movie_id uuid
        references public.movies(id)
        on delete cascade,

    event_type text not null,

    video_timestamp numeric,

    event_timestamp timestamptz not null default now(),

    value numeric,

    metadata jsonb default '{}'::jsonb,

    created_at timestamptz not null default now()
);


-- ============================================================
-- 4. REAL-TIME FEEDBACK
-- ============================================================

create table if not exists public.feedback (
    id uuid primary key default gen_random_uuid(),

    session_id uuid not null
        references public.sessions(id)
        on delete cascade,

    movie_id uuid
        references public.movies(id)
        on delete cascade,

    reaction text,

    comment text,

    video_timestamp numeric,

    created_at timestamptz not null default now(),

    constraint valid_reaction
    check (
        reaction is null
        or reaction in (
            '😊',
            '😢',
            '😕',
            '⭐',
            '❤️'
        )
    )
);


-- ============================================================
-- 5. SURVEY RESPONSES
-- ============================================================

create table if not exists public.survey (
    id uuid primary key default gen_random_uuid(),

    session_id uuid not null
        references public.sessions(id)
        on delete cascade,

    movie_id uuid
        references public.movies(id)
        on delete cascade,

    overall_rating numeric,

    would_recommend boolean,

    favorite_scene text,

    least_favorite_scene text,

    comments text,

    responses jsonb default '{}'::jsonb,

    created_at timestamptz not null default now(),

    constraint rating_range
    check (
        overall_rating is null
        or (
            overall_rating >= 1
            and overall_rating <= 5
        )
    )
);


-- ============================================================
-- 6. AI INSIGHTS
-- Week 6
-- ============================================================

create table if not exists public.ai_insights (
    id uuid primary key default gen_random_uuid(),

    movie_id uuid not null
        references public.movies(id)
        on delete cascade,

    summary text,

    audience_insights jsonb default '{}'::jsonb,

    scene_recommendations jsonb default '[]'::jsonb,

    sentiment_analysis jsonb default '{}'::jsonb,

    editing_suggestions jsonb default '[]'::jsonb,

    model_name text,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists idx_movies_review_code
on public.movies(review_code);


create index if not exists idx_sessions_movie_id
on public.sessions(movie_id);


create index if not exists idx_sessions_started_at
on public.sessions(started_at);


create index if not exists idx_events_session_id
on public.events(session_id);


create index if not exists idx_events_movie_id
on public.events(movie_id);


create index if not exists idx_events_type
on public.events(event_type);


create index if not exists idx_events_timestamp
on public.events(event_timestamp);


create index if not exists idx_feedback_session_id
on public.feedback(session_id);


create index if not exists idx_feedback_movie_id
on public.feedback(movie_id);


create index if not exists idx_feedback_timestamp
on public.feedback(video_timestamp);


create index if not exists idx_survey_session_id
on public.survey(session_id);


create index if not exists idx_survey_movie_id
on public.survey(movie_id);


create index if not exists idx_ai_insights_movie_id
on public.ai_insights(movie_id);


-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.movies enable row level security;

alter table public.sessions enable row level security;

alter table public.events enable row level security;

alter table public.feedback enable row level security;

alter table public.survey enable row level security;

alter table public.ai_insights enable row level security;


-- ============================================================
-- MOVIES POLICIES
-- ============================================================

create policy "Public can view movies"
on public.movies
for select
to anon, authenticated
using (true);


-- ============================================================
-- SESSION POLICIES
-- ============================================================

create policy "Anyone can create viewing sessions"
on public.sessions
for insert
to anon, authenticated
with check (true);


-- ============================================================
-- EVENT POLICIES
-- ============================================================

create policy "Anyone can create events"
on public.events
for insert
to anon, authenticated
with check (true);


-- ============================================================
-- FEEDBACK POLICIES
-- ============================================================

create policy "Anyone can submit feedback"
on public.feedback
for insert
to anon, authenticated
with check (true);


-- ============================================================
-- SURVEY POLICIES
-- ============================================================

create policy "Anyone can submit survey responses"
on public.survey
for insert
to anon, authenticated
with check (true);


-- ============================================================
-- AI INSIGHTS POLICIES
-- ============================================================

create policy "Authenticated users can view AI insights"
on public.ai_insights
for select
to authenticated
using (true);


create policy "Authenticated users can create AI insights"
on public.ai_insights
for insert
to authenticated
with check (true);


create policy "Authenticated users can update AI insights"
on public.ai_insights
for update
to authenticated
using (true)
with check (true);


-- ============================================================
-- ANALYTICS VIEWS
-- Week 5
-- ============================================================


-- ------------------------------------------------------------
-- Completion statistics
-- ------------------------------------------------------------

create or replace view public.movie_completion_stats as
select
    movie_id,

    count(*) as total_sessions,

    round(
        avg(completion_percentage)::numeric,
        2
    ) as average_completion_percentage,

    count(*) filter (
        where completion_percentage >= 90
    ) as completed_sessions

from public.sessions

group by movie_id;


-- ------------------------------------------------------------
-- Event distribution
-- ------------------------------------------------------------

create or replace view public.movie_event_stats as
select
    movie_id,

    event_type,

    count(*) as event_count

from public.events

group by movie_id, event_type;


-- ------------------------------------------------------------
-- Reaction distribution
-- ------------------------------------------------------------

create or replace view public.movie_reaction_stats as
select
    movie_id,

    reaction,

    count(*) as reaction_count

from public.feedback

where reaction is not null

group by movie_id, reaction;


-- ------------------------------------------------------------
-- Viewer comments
-- ------------------------------------------------------------

create or replace view public.movie_comments as
select
    id,

    movie_id,

    session_id,

    comment,

    video_timestamp,

    created_at

from public.feedback

where comment is not null
and length(trim(comment)) > 0;


-- ------------------------------------------------------------
-- Drop-off events
-- ------------------------------------------------------------

create or replace view public.movie_dropoff_stats as
select
    movie_id,

    video_timestamp,

    count(*) as dropoff_count

from public.events

where event_type in (
    'pause',
    'ended',
    'tab_switch',
    'dropoff'
)

group by movie_id, video_timestamp;


-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();

    return new;
end;
$$;


drop trigger if exists update_movies_updated_at
on public.movies;

create trigger update_movies_updated_at
before update on public.movies
for each row
execute function public.update_updated_at_column();


drop trigger if exists update_ai_insights_updated_at
on public.ai_insights;

create trigger update_ai_insights_updated_at
before update on public.ai_insights
for each row
execute function public.update_updated_at_column();


-- ============================================================
-- FINISHED
-- ============================================================
