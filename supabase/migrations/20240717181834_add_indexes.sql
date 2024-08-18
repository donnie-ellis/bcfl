-- Migration 8: Add indexes for performance
CREATE INDEX idx_leagues_league_key ON leagues(league_key);
CREATE INDEX idx_teams_league_id ON teams(league_id);
CREATE INDEX idx_managers_team_id ON managers(team_id);
CREATE INDEX idx_players_player_key ON players(player_key);
CREATE INDEX idx_drafts_league_id ON drafts(league_id);
CREATE INDEX idx_draft_players_draft_id ON draft_players(draft_id);
CREATE INDEX idx_draft_players_player_id ON draft_players(player_id);
CREATE INDEX idx_picks_draft_id ON picks(draft_id);
CREATE INDEX idx_picks_team_id ON picks(team_id);
CREATE INDEX idx_picks_player_id ON picks(player_id);