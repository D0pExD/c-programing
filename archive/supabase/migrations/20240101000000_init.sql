-- C ARENA SUPABASE DATABASE SCHEMA MIGRATION
-- Production Schema for BCA First Year C Programming Tournament

-- 1. Admins
CREATE TABLE IF NOT EXISTS admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'HOST',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Events
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    code VARCHAR(8) NOT NULL UNIQUE,
    state VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (state IN ('DRAFT', 'LOBBY_OPEN', 'LOBBY_LOCKED', 'RUNNING', 'PAUSED', 'FINISHED', 'ARCHIVED')),
    current_round INT NOT NULL DEFAULT 1 CHECK (current_round BETWEEN 1 AND 5),
    current_question_id TEXT,
    question_state VARCHAR(20) NOT NULL DEFAULT 'PREVIEW' CHECK (question_state IN ('PREVIEW', 'READY', 'ACTIVE', 'LOCKED', 'REVEALED', 'SCORED')),
    question_started_at TIMESTAMPTZ,
    question_deadline TIMESTAMPTZ,
    timer_paused_remaining_seconds INT,
    revision BIGINT NOT NULL DEFAULT 1,
    created_by UUID REFERENCES admins(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_code ON events(code);
CREATE INDEX IF NOT EXISTS idx_events_state ON events(state);

-- 3. Event Settings
CREATE TABLE IF NOT EXISTS event_settings (
    event_id UUID PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
    max_teams INT NOT NULL DEFAULT 10,
    team_capacity INT NOT NULL DEFAULT 6,
    allow_self_registration BOOLEAN NOT NULL DEFAULT TRUE,
    enable_speed_bonus BOOLEAN NOT NULL DEFAULT TRUE,
    hide_standings_round_4 BOOLEAN NOT NULL DEFAULT FALSE,
    wager_min_points INT NOT NULL DEFAULT 50,
    wager_max_percent INT NOT NULL DEFAULT 50,
    allow_negative_final_score BOOLEAN NOT NULL DEFAULT FALSE,
    sound_effects BOOLEAN NOT NULL DEFAULT TRUE
);

-- 4. Teams
CREATE TABLE IF NOT EXISTS teams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20) NOT NULL DEFAULT '#00F5A0',
    icon VARCHAR(30),
    captain_id UUID,
    score INT NOT NULL DEFAULT 0,
    rank INT NOT NULL DEFAULT 1,
    correct_count INT NOT NULL DEFAULT 0,
    total_response_time_ms BIGINT NOT NULL DEFAULT 0,
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_team_name UNIQUE (event_id, name)
);

CREATE INDEX IF NOT EXISTS idx_teams_event ON teams(event_id);
CREATE INDEX IF NOT EXISTS idx_teams_score ON teams(event_id, score DESC, correct_count DESC, total_response_time_ms ASC);

-- 5. Players
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    roll_number VARCHAR(50) NOT NULL,
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_player_roll UNIQUE (event_id, roll_number)
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_event_roll ON players(event_id, roll_number);

-- Update foreign key on teams for captain
ALTER TABLE teams DROP CONSTRAINT IF EXISTS fk_team_captain;
ALTER TABLE teams ADD CONSTRAINT fk_team_captain FOREIGN KEY (captain_id) REFERENCES players(id) ON DELETE SET NULL;

-- 6. Player Sessions
CREATE TABLE IF NOT EXISTS player_sessions (
    token VARCHAR(64) PRIMARY KEY,
    player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    is_captain BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON player_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_player ON player_sessions(player_id);

-- 7. Questions
CREATE TABLE IF NOT EXISTS questions (
    id TEXT NOT NULL,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    round INT NOT NULL CHECK (round BETWEEN 1 AND 5),
    type VARCHAR(30) NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    code_snippet TEXT NOT NULL,
    options_json JSONB NOT NULL DEFAULT '[]',
    correct_answer TEXT NOT NULL,
    bug_line_number INT,
    fix_bonus_option_id TEXT,
    explanation TEXT NOT NULL,
    call_stack_json JSONB DEFAULT '[]',
    difficulty VARCHAR(20) NOT NULL DEFAULT 'MEDIUM',
    time_limit_seconds INT NOT NULL DEFAULT 30,
    base_points INT NOT NULL DEFAULT 100,
    speed_bonus_max INT NOT NULL DEFAULT 50,
    tags TEXT[] DEFAULT '{}',
    order_index INT NOT NULL DEFAULT 1,
    PRIMARY KEY (event_id, id)
);

-- 8. Submissions
CREATE TABLE IF NOT EXISTS submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    captain_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    submitted_answer TEXT NOT NULL,
    secondary_answer TEXT,
    submitted_at TIMESTAMPTZ NOT NULL,
    server_received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_correct BOOLEAN NOT NULL DEFAULT FALSE,
    base_points_awarded INT NOT NULL DEFAULT 0,
    speed_bonus_awarded INT NOT NULL DEFAULT 0,
    secondary_points_awarded INT NOT NULL DEFAULT 0,
    total_points_awarded INT NOT NULL DEFAULT 0,
    time_taken_ms INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_event_question_team UNIQUE (event_id, question_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_submissions_event_question ON submissions(event_id, question_id);

-- 9. Battleship Boards & Attacks
CREATE TABLE IF NOT EXISTS battleship_boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    grid_json JSONB NOT NULL,
    total_ships INT NOT NULL DEFAULT 4,
    sunken_ships INT NOT NULL DEFAULT 0,
    bonus_collected INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_battleship_team UNIQUE (event_id, team_id)
);

CREATE TABLE IF NOT EXISTS battleship_attacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    row INT NOT NULL CHECK (row BETWEEN 0 AND 3),
    col INT NOT NULL CHECK (col BETWEEN 0 AND 3),
    cell_type VARCHAR(20) NOT NULL,
    points_awarded INT NOT NULL DEFAULT 0,
    attacked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_team_cell_attack UNIQUE (event_id, team_id, row, col)
);

CREATE TABLE IF NOT EXISTS attack_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    question_id TEXT NOT NULL,
    tokens_earned INT NOT NULL DEFAULT 1,
    tokens_used INT NOT NULL DEFAULT 0,
    CONSTRAINT uq_team_question_token UNIQUE (event_id, team_id, question_id)
);

-- 10. Final Wagers
CREATE TABLE IF NOT EXISTS final_wagers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    wager_amount INT NOT NULL CHECK (wager_amount >= 0),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    is_locked BOOLEAN NOT NULL DEFAULT FALSE,
    is_revealed BOOLEAN NOT NULL DEFAULT FALSE,
    result VARCHAR(20),
    points_effect INT,
    CONSTRAINT uq_event_final_team_wager UNIQUE (event_id, team_id)
);

-- 11. Score Ledger (Append-only audit trail of every point change)
CREATE TABLE IF NOT EXISTS score_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    team_name VARCHAR(50) NOT NULL,
    round INT NOT NULL,
    question_id TEXT,
    points_delta INT NOT NULL,
    previous_score INT NOT NULL,
    new_score INT NOT NULL,
    reason TEXT NOT NULL,
    performed_by TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ledger_event_team ON score_ledger(event_id, team_id);

-- 12. Admin Audit Logs
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    previous_state TEXT,
    new_state TEXT,
    details_json JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_event ON admin_audit_logs(event_id, timestamp DESC);

-- 13. Event Snapshots
CREATE TABLE IF NOT EXISTS event_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    revision BIGINT NOT NULL,
    snapshot_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE battleship_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE battleship_attacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE attack_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE final_wagers ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Public can read live event public state
CREATE POLICY "Public events readable" ON events FOR SELECT USING (state != 'ARCHIVED');
CREATE POLICY "Public teams readable" ON teams FOR SELECT USING (true);
CREATE POLICY "Public players non-sensitive readable" ON players FOR SELECT USING (true);
CREATE POLICY "Public score ledger readable" ON score_ledger FOR SELECT USING (true);

-- Admin full access
CREATE POLICY "Admin full events" ON events USING (auth.role() = 'service_role');
CREATE POLICY "Admin full teams" ON teams USING (auth.role() = 'service_role');
CREATE POLICY "Admin full submissions" ON submissions USING (auth.role() = 'service_role');
CREATE POLICY "Admin full questions" ON questions USING (auth.role() = 'service_role');
