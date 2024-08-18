-- Migration 3: Create managers table
CREATE TABLE managers (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    manager_id VARCHAR(255) NOT NULL,
    nickname VARCHAR(255),
    guid VARCHAR(255),
    is_commissioner BOOLEAN,
    email VARCHAR(255),
    image_url TEXT,
    felo_score VARCHAR(50),
    felo_tier VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
