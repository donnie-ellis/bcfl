CREATE TABLE IF NOT EXISTS player_import_history (
    id SERIAL PRIMARY KEY,
    league_key TEXT NOT NULL,
    player_count INTEGER NOT NULL,
    import_date TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_import_history_league_key ON player_import_history(league_key);
CREATE INDEX idx_player_import_history_import_date ON player_import_history(import_date);