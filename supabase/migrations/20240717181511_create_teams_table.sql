-- Migration 2: Create teams table
CREATE TABLE teams (
    id SERIAL PRIMARY KEY,
    league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
    team_key VARCHAR(255) NOT NULL UNIQUE,
    team_id VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    url TEXT,
    team_logos JSONB,
    waiver_priority INTEGER,
    number_of_moves INTEGER,
    number_of_trades INTEGER,
    league_scoring_type VARCHAR(50),
    draft_position INTEGER,
    has_draft_grade BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
