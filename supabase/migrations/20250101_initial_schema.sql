-- SpeakCoach Database Schema Migration
-- Designed for Supabase Postgres with Row Level Security (RLS)

-- 1. Enable pgcrypto for UUID generation if not already enabled
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. Profiles Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    full_name TEXT DEFAULT 'Student',
    college_year TEXT DEFAULT '3rd Year',
    target_roles TEXT[] DEFAULT ARRAY['Security Analyst', 'SOC Analyst', 'Penetration Tester', 'Cloud Security Associate'],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
    ON public.profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 3. Sessions Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    mode TEXT NOT NULL DEFAULT 'free_talk',
    started_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_sec INTEGER DEFAULT 0 NOT NULL,
    overall_score NUMERIC(4, 1),
    scores JSONB DEFAULT '{}'::jsonb,
    summary JSONB DEFAULT '{}'::jsonb,
    transcript JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON public.sessions(started_at DESC);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
    ON public.sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions"
    ON public.sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions"
    ON public.sessions FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions"
    ON public.sessions FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 4. Messages Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    text TEXT NOT NULL,
    ts TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_session_id ON public.messages(session_id);
CREATE INDEX IF NOT EXISTS idx_messages_ts ON public.messages(ts ASC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages from their own sessions"
    ON public.messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = messages.session_id
            AND sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert messages into their own sessions"
    ON public.messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.sessions
            WHERE sessions.id = messages.session_id
            AND sessions.user_id = auth.uid()
        )
    );

-- ============================================================================
-- 5. Streaks Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.streaks (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    current_streak INTEGER DEFAULT 0 NOT NULL,
    longest_streak INTEGER DEFAULT 0 NOT NULL,
    last_active_date DATE,
    freezes_left INTEGER DEFAULT 1 NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own streak"
    ON public.streaks FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own streak"
    ON public.streaks FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own streak"
    ON public.streaks FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 6. Rewards & Reward Wallet Tables
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    streak_required INTEGER NOT NULL,
    xp_value INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rewards catalog"
    ON public.rewards FOR SELECT
    TO authenticated
    USING (true);

CREATE TABLE IF NOT EXISTS public.reward_wallet (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    reward_id UUID REFERENCES public.rewards(id) ON DELETE CASCADE,
    custom_title TEXT,
    claimed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    status TEXT DEFAULT 'claimed' CHECK (status IN ('claimed', 'redeemed', 'pending'))
);

CREATE INDEX IF NOT EXISTS idx_reward_wallet_user ON public.reward_wallet(user_id);

ALTER TABLE public.reward_wallet ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reward wallet"
    ON public.reward_wallet FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert into their own reward wallet"
    ON public.reward_wallet FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reward wallet"
    ON public.reward_wallet FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 7. Daily Plan Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.daily_plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
    plan_data JSONB NOT NULL DEFAULT '{
        "warmup_done": false,
        "vocab_done": false,
        "core_drill_done": false,
        "live_conversation_done": false,
        "review_done": false
    }'::jsonb,
    is_completed BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, plan_date)
);

ALTER TABLE public.daily_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own daily plans"
    ON public.daily_plan FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own daily plans"
    ON public.daily_plan FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own daily plans"
    ON public.daily_plan FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 8. Settings Table
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.settings (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    store_audio BOOLEAN DEFAULT false NOT NULL, -- DEFAULT OFF as requested by security requirements
    preferred_session_minutes INTEGER DEFAULT 15 NOT NULL,
    preferred_voice TEXT DEFAULT 'Zephyr' NOT NULL,
    target_domains TEXT[] DEFAULT ARRAY['cybersecurity_fundamentals', 'soc_ir', 'web_security'],
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own settings"
    ON public.settings FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
    ON public.settings FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
    ON public.settings FOR UPDATE
    USING (auth.uid() = user_id);

-- ============================================================================
-- 9. Automatic Setup Trigger on New User Signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    -- Initialize profile
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        new.id,
        new.email,
        COALESCE(new.raw_user_meta_data->>'full_name', 'Cybersecurity Student')
    ) ON CONFLICT (id) DO NOTHING;

    -- Initialize streaks
    INSERT INTO public.streaks (user_id, current_streak, longest_streak, freezes_left)
    VALUES (new.id, 0, 0, 1)
    ON CONFLICT (user_id) DO NOTHING;

    -- Initialize settings (store_audio defaults to FALSE)
    INSERT INTO public.settings (user_id, store_audio, preferred_session_minutes, preferred_voice)
    VALUES (new.id, false, 15, 'Zephyr')
    ON CONFLICT (user_id) DO NOTHING;

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Seed initial base rewards catalog
INSERT INTO public.rewards (title, description, streak_required, xp_value)
VALUES
    ('3-Day Momentum Starter', 'Completed speaking practice 3 days in a row', 3, 150),
    ('7-Day Fluency Warrior', 'Maintained a solid 7-day conversational streak', 7, 500),
    ('14-Day Interview Ready', 'Two weeks of consistent interview preparation', 14, 1200),
    ('30-Day Cybersecurity Communicator', 'One full month of daily articulate communication', 30, 3000)
ON CONFLICT DO NOTHING;
