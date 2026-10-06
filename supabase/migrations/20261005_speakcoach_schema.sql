-- ============================================================================
-- SpeakCoach — canonical, idempotent schema migration
-- ----------------------------------------------------------------------------
-- Safe on a fresh project AND on a database that already ran either of the two
-- legacy migrations (20250101_initial_schema.sql / old 20261005 file):
--   * tables are created with IF NOT EXISTS,
--   * every column that either legacy version defined is ADD COLUMN IF NOT
--     EXISTS, so older tables converge to this shape,
--   * divergent legacy columns are dropped/renamed inside guarded DO blocks,
--   * all policies are dropped (any name) and recreated,
--   * constraints are added only when missing.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enum-like value sets (kept in sync with src/types/database.ts)
-- ---------------------------------------------------------------------------
-- modes:      free_talk, technical_interview, hr_interview, gd_simulator,
--             incident_scenario, explain_to_manager, presentation_pitch,
--             conversation_skills, full_mock_interview, rapid_fire, redo_drill
-- domains:    fundamentals, cybersecurity_fundamentals, networking,
--             web_security, soc_ir, offensive_basics, cloud_iam, grc

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT DEFAULT 'Student',
    college_year TEXT DEFAULT '3rd Year',
    domain_focus TEXT DEFAULT 'Cybersecurity & SOC',
    target_role TEXT DEFAULT 'Security Analyst / Consultant',
    target_roles TEXT[] DEFAULT ARRAY['Security Analyst', 'SOC Analyst', 'Penetration Tester', 'Cloud Security Associate'],
    coach_tone TEXT DEFAULT 'realistic',
    pacing_preference TEXT DEFAULT 'normal',
    filler_strictness TEXT DEFAULT 'balanced',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.profiles ALTER COLUMN email DROP NOT NULL;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS domain_focus TEXT DEFAULT 'Cybersecurity & SOC';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_role TEXT DEFAULT 'Security Analyst / Consultant';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS target_roles TEXT[] DEFAULT ARRAY['Security Analyst', 'SOC Analyst', 'Penetration Tester', 'Cloud Security Associate'];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS coach_tone TEXT DEFAULT 'realistic';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pacing_preference TEXT DEFAULT 'normal';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS filler_strictness TEXT DEFAULT 'balanced';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------------
-- sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'free_talk',
    technical_domain TEXT DEFAULT 'soc_ir',
    started_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    ended_at TIMESTAMPTZ,
    duration_sec INTEGER NOT NULL DEFAULT 0,
    overall_score NUMERIC(4,1),
    scores JSONB NOT NULL DEFAULT '{}'::jsonb,
    summary JSONB NOT NULL DEFAULT '{}'::jsonb,
    transcript JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS technical_domain TEXT DEFAULT 'soc_ir';
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS duration_sec INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS scores JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS summary JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS transcript JSONB NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------------
-- messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    text TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- streaks (canonical columns: current_streak / longest_streak)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    last_active_date DATE,
    freezes_left INTEGER NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS current_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS last_active_date DATE;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS freezes_left INTEGER NOT NULL DEFAULT 1;
ALTER TABLE public.streaks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------------
-- rewards (global catalog) + reward_wallet (per-user unlocks)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    streak_required INTEGER NOT NULL DEFAULT 0,
    xp_value INTEGER NOT NULL DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT rewards_title_key UNIQUE (title)
);

ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS xp_value INTEGER NOT NULL DEFAULT 100;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS streak_required INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.rewards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

CREATE TABLE IF NOT EXISTS public.reward_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
    custom_title TEXT,
    claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    status TEXT NOT NULL DEFAULT 'claimed'
);

ALTER TABLE public.reward_wallet ADD COLUMN IF NOT EXISTS reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE;
ALTER TABLE public.reward_wallet ADD COLUMN IF NOT EXISTS custom_title TEXT;
ALTER TABLE public.reward_wallet ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.reward_wallet ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'claimed';

-- ---------------------------------------------------------------------------
-- daily_plan
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.daily_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    plan_data JSONB NOT NULL DEFAULT '{"warmup_done": false, "vocab_done": false, "core_drill_done": false, "live_conversation_done": false, "review_done": false}'::jsonb,
    is_completed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT daily_plan_user_date_key UNIQUE (user_id, plan_date)
);

ALTER TABLE public.daily_plan ADD COLUMN IF NOT EXISTS plan_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE public.daily_plan ADD COLUMN IF NOT EXISTS plan_data JSONB NOT NULL DEFAULT '{"warmup_done": false, "vocab_done": false, "core_drill_done": false, "live_conversation_done": false, "review_done": false}'::jsonb;
ALTER TABLE public.daily_plan ADD COLUMN IF NOT EXISTS is_completed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.daily_plan ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------------
-- settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_audio BOOLEAN NOT NULL DEFAULT FALSE,
    preferred_voice TEXT NOT NULL DEFAULT 'Zephyr',
    session_length_minutes INTEGER NOT NULL DEFAULT 15,
    preferred_session_minutes INTEGER NOT NULL DEFAULT 15,
    target_domains TEXT[] DEFAULT ARRAY['cybersecurity_fundamentals', 'soc_ir', 'web_security'],
    theme TEXT NOT NULL DEFAULT 'dark',
    vocal_variety_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS store_audio BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS preferred_voice TEXT NOT NULL DEFAULT 'Zephyr';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS session_length_minutes INTEGER NOT NULL DEFAULT 15;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS preferred_session_minutes INTEGER NOT NULL DEFAULT 15;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS target_domains TEXT[] DEFAULT ARRAY['cybersecurity_fundamentals', 'soc_ir', 'web_security'];
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS theme TEXT NOT NULL DEFAULT 'dark';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vocal_variety_enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now());

-- ---------------------------------------------------------------------------
-- Converge databases created by the two legacy migrations
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    -- streaks: legacy 2026 file used current/longest -> copy into canonical columns, then drop.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'streaks' AND column_name = 'current'
    ) THEN
        UPDATE public.streaks SET current_streak = "current"
        WHERE current_streak = 0 AND "current" <> 0;
        UPDATE public.streaks SET longest_streak = longest
        WHERE longest_streak = 0 AND longest <> 0;
        ALTER TABLE public.streaks DROP COLUMN IF EXISTS "current";
        ALTER TABLE public.streaks DROP COLUMN IF EXISTS longest;
    END IF;

    -- rewards: legacy 2026 file was a per-user table -> strip per-user columns.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'rewards' AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.rewards DROP CONSTRAINT IF EXISTS rewards_title_key;
        ALTER TABLE public.rewards DROP COLUMN IF EXISTS user_id;
        ALTER TABLE public.rewards DROP COLUMN IF EXISTS milestone_type;
        ALTER TABLE public.rewards DROP COLUMN IF EXISTS claimed_at;
    END IF;

    -- reward_wallet: legacy 2026 file was user_id PK with xp/gems/unlocked_badges.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'reward_wallet' AND column_name = 'xp'
    ) THEN
        ALTER TABLE public.reward_wallet DROP COLUMN IF EXISTS xp;
        ALTER TABLE public.reward_wallet DROP COLUMN IF EXISTS gems;
        ALTER TABLE public.reward_wallet DROP COLUMN IF EXISTS unlocked_badges;
        ALTER TABLE public.reward_wallet DROP CONSTRAINT IF EXISTS reward_wallet_pkey;
        ALTER TABLE public.reward_wallet
            ADD COLUMN IF NOT EXISTS id UUID PRIMARY KEY DEFAULT gen_random_uuid();
    END IF;

    -- daily_plan: legacy 2026 file used date/tasks/completed.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'daily_plan' AND column_name = 'date'
    ) THEN
        UPDATE public.daily_plan SET plan_date = "date" WHERE plan_date IS NULL;
        ALTER TABLE public.daily_plan DROP CONSTRAINT IF EXISTS daily_plan_user_date_key;
        ALTER TABLE public.daily_plan DROP CONSTRAINT IF EXISTS daily_plan_user_id_date_key;
        ALTER TABLE public.daily_plan DROP COLUMN IF EXISTS "date";
        ALTER TABLE public.daily_plan DROP COLUMN IF EXISTS tasks;
        ALTER TABLE public.daily_plan DROP COLUMN IF EXISTS completed;
        ALTER TABLE public.daily_plan ADD CONSTRAINT daily_plan_user_date_key UNIQUE (user_id, plan_date);
    END IF;

    -- messages: legacy 2025 file had no user_id and no role CHECK for updates.
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'user_id'
    ) THEN
        UPDATE public.messages m
        SET user_id = s.user_id
        FROM public.sessions s
        WHERE m.session_id = s.id AND m.user_id IS NULL;

        IF NOT EXISTS (SELECT 1 FROM public.messages WHERE user_id IS NULL) THEN
            ALTER TABLE public.messages ALTER COLUMN user_id SET NOT NULL;
        END IF;
    END IF;

    -- settings: drop nothing, both minute columns are kept intentionally.
END $$;

-- ---------------------------------------------------------------------------
-- CHECK constraints (added only when missing)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_coach_tone_check' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_coach_tone_check
            CHECK (coach_tone IS NULL OR coach_tone IN ('supportive','strict','realistic','executive'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_pacing_preference_check' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_pacing_preference_check
            CHECK (pacing_preference IS NULL OR pacing_preference IN ('normal','deliberate','rapid'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_filler_strictness_check' AND conrelid = 'public.profiles'::regclass) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_filler_strictness_check
            CHECK (filler_strictness IS NULL OR filler_strictness IN ('relaxed','balanced','strict'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_mode_check' AND conrelid = 'public.sessions'::regclass) THEN
        ALTER TABLE public.sessions ADD CONSTRAINT sessions_mode_check
            CHECK (mode IN ('free_talk','technical_interview','hr_interview','gd_simulator','incident_scenario','explain_to_manager','presentation_pitch','conversation_skills','full_mock_interview','rapid_fire','redo_drill'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_technical_domain_check' AND conrelid = 'public.sessions'::regclass) THEN
        ALTER TABLE public.sessions ADD CONSTRAINT sessions_technical_domain_check
            CHECK (technical_domain IS NULL OR technical_domain IN ('fundamentals','cybersecurity_fundamentals','networking','web_security','soc_ir','offensive_basics','cloud_iam','grc'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_overall_score_check' AND conrelid = 'public.sessions'::regclass) THEN
        ALTER TABLE public.sessions ADD CONSTRAINT sessions_overall_score_check
            CHECK (overall_score IS NULL OR (overall_score >= 0 AND overall_score <= 10));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'messages_role_check' AND conrelid = 'public.messages'::regclass) THEN
        ALTER TABLE public.messages ADD CONSTRAINT messages_role_check
            CHECK (role IN ('user','assistant','system'));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'reward_wallet_status_check' AND conrelid = 'public.reward_wallet'::regclass) THEN
        ALTER TABLE public.reward_wallet ADD CONSTRAINT reward_wallet_status_check
            CHECK (status IN ('claimed','redeemed','pending'));
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON public.messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_ts ON public.messages(ts ASC);
CREATE INDEX IF NOT EXISTS idx_reward_wallet_user ON public.reward_wallet(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_plan_user_date ON public.daily_plan(user_id, plan_date);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reward_wallet ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_plan ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop every existing policy on these tables (any name) so re-runs converge.
-- Statements are materialised first, then executed, so the catalog cursor is
-- never invalidated mid-loop.
DO $$
DECLARE
    stmts text[];
    stmt text;
BEGIN
    SELECT COALESCE(
        array_agg(format('DROP POLICY IF EXISTS %I ON public.%I', policyname, tablename)),
        ARRAY[]::text[]
    )
    INTO stmts
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN ('profiles','sessions','messages','streaks','rewards','reward_wallet','daily_plan','settings');

    FOREACH stmt IN ARRAY stmts LOOP
        EXECUTE stmt;
    END LOOP;
END $$;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete their own profile"
    ON public.profiles FOR DELETE
    USING (auth.uid() = id);

CREATE POLICY "Users can view their own sessions"
    ON public.sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
    ON public.sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON public.sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON public.sessions FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own messages"
    ON public.messages FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own messages"
    ON public.messages FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own messages"
    ON public.messages FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own messages"
    ON public.messages FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own streaks"
    ON public.streaks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streaks"
    ON public.streaks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streaks"
    ON public.streaks FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own streaks"
    ON public.streaks FOR DELETE
    USING (auth.uid() = user_id);

-- Rewards is a global read-only catalog; writes happen via the service role.
CREATE POLICY "Authenticated users can view rewards catalog"
    ON public.rewards FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Users can view their own reward wallet"
    ON public.reward_wallet FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own reward wallet"
    ON public.reward_wallet FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reward wallet"
    ON public.reward_wallet FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete from their own reward wallet"
    ON public.reward_wallet FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own daily plans"
    ON public.daily_plan FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily plans"
    ON public.daily_plan FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily plans"
    ON public.daily_plan FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own daily plans"
    ON public.daily_plan FOR DELETE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own settings"
    ON public.settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.settings FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own settings"
    ON public.settings FOR DELETE
    USING (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger (shared by every table that has the column)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

DO $$
DECLARE t text;
BEGIN
    FOREACH t IN ARRAY ARRAY['profiles','streaks','daily_plan','settings','reward_wallet']
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS set_updated_at_%I ON public.%I',
            t, t
        );
        EXECUTE format(
            'CREATE TRIGGER set_updated_at_%I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at()',
            t, t
        );
    END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- Bootstrap a profile/streak/settings row for every new auth user
-- SECURITY DEFINER + pinned search_path + schema-qualified names
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Student')
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.streaks (user_id, current_streak, longest_streak, freezes_left)
    VALUES (NEW.id, 0, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.settings (user_id, store_audio, preferred_voice, session_length_minutes, preferred_session_minutes, theme)
    VALUES (NEW.id, FALSE, 'Zephyr', 15, 15, 'dark')
    ON CONFLICT (user_id) DO NOTHING;

    INSERT INTO public.reward_wallet (user_id, custom_title, status)
    VALUES (NEW.id, 'Welcome Cadet', 'claimed')
    ON CONFLICT DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Seed the global rewards catalog (idempotent)
-- ---------------------------------------------------------------------------
-- Ensure the unique key the seed's ON CONFLICT relies on exists on every
-- database shape (fresh, 2025-legacy, 2026-legacy).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'rewards_title_key' AND conrelid = 'public.rewards'::regclass
    ) THEN
        -- Remove duplicate titles left behind by a legacy catalog first.
        DELETE FROM public.rewards a
        USING public.rewards b
        WHERE a.ctid < b.ctid AND a.title = b.title;
        ALTER TABLE public.rewards ADD CONSTRAINT rewards_title_key UNIQUE (title);
    END IF;
END $$;

INSERT INTO public.rewards (title, description, streak_required, xp_value)
VALUES
    ('3-Day Momentum Starter', 'Completed speaking practice 3 days in a row', 3, 150),
    ('7-Day Fluency Warrior', 'Maintained a solid 7-day conversational streak', 7, 500),
    ('14-Day Interview Ready', 'Two weeks of consistent interview preparation', 14, 1200),
    ('30-Day Cybersecurity Communicator', 'One full month of daily articulate communication', 30, 3000)
ON CONFLICT (title) DO NOTHING;
