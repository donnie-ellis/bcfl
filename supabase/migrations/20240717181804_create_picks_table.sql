-- Migration 7: Create picks table
CREATE TABLE picks (
    id SERIAL PRIMARY KEY,
    draft_id INTEGER REFERENCES drafts(id) ON DELETE CASCADE,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id),
    pick_number INTEGER NOT NULL,
    round_number INTEGER NOT NULL,
    total_pick_number INTEGER NOT NULL,
    is_keeper BOOLEAN DEFAULT FALSE,
    is_picked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (draft_id, pick_number)
);