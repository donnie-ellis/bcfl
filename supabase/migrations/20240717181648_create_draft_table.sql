-- Migration 5: Create drafts table
CREATE TABLE drafts (
    id SERIAL PRIMARY KEY,
    league_id INTEGER REFERENCES leagues(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    rounds INTEGER NOT NULL,
    total_picks INTEGER NOT NULL,
    current_pick INTEGER DEFAULT 1,
    status VARCHAR(50) DEFAULT 'pending',
    draft_order JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
