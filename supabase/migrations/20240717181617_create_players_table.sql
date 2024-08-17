-- Migration 4: Create players table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    player_key VARCHAR(255) NOT NULL UNIQUE,
    player_id VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    editorial_team_abbr VARCHAR(10),
    display_position VARCHAR(50),
    position_type VARCHAR(50),
    eligible_positions VARCHAR(255)[],
    status VARCHAR(50),
    editorial_player_key VARCHAR(255),
    editorial_team_key VARCHAR(255),
    editorial_team_full_name VARCHAR(255),
    bye_weeks INTEGER[],
    uniform_number VARCHAR(10),
    image_url TEXT,
    headshot TEXT,
    headshot_size VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);