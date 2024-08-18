-- Migration 6: Create draft_players table
CREATE TABLE draft_players (
    id SERIAL PRIMARY KEY,
    draft_id INTEGER REFERENCES drafts(id) ON DELETE CASCADE,
    player_id INTEGER REFERENCES players(id) ON DELETE CASCADE,
    is_picked BOOLEAN DEFAULT FALSE,
    average_pick NUMERIC(5,2),
    average_round NUMERIC(5,2),
    percent_drafted NUMERIC(5,2),
    average_cost NUMERIC(8,2),
    draft_positions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (draft_id, player_id)
);
