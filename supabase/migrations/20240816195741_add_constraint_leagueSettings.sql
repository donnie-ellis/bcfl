-- Run this SQL in your database
ALTER TABLE league_settings ADD CONSTRAINT league_settings_league_key_unique UNIQUE (league_key);