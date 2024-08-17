-- ./supabase/migrations/YYYYMMDDHHMMSS_create_league_settings_table.sql

-- Create the leagueSettings table
CREATE TABLE public.league_settings (
    id SERIAL PRIMARY KEY,
    league_key VARCHAR(255) NOT NULL REFERENCES public.leagues(league_key) ON DELETE CASCADE,
    draft_type VARCHAR(50),
    is_auction_draft BOOLEAN,
    scoring_type VARCHAR(50),
    persistent_url TEXT,
    uses_playoff BOOLEAN,
    has_playoff_consolation_games BOOLEAN,
    playoff_start_week INTEGER,
    uses_playoff_reseeding BOOLEAN,
    uses_lock_eliminated_teams BOOLEAN,
    num_playoff_teams INTEGER,
    num_playoff_consolation_teams INTEGER,
    waiver_type VARCHAR(50),
    waiver_rule VARCHAR(50),
    uses_faab BOOLEAN,
    draft_time TIMESTAMP,
    draft_pick_time INTEGER,
    post_draft_players VARCHAR(50),
    max_teams INTEGER,
    waiver_time INTEGER,
    trade_end_date DATE,
    trade_ratify_type VARCHAR(50),
    trade_reject_time INTEGER,
    player_pool VARCHAR(50),
    cant_cut_list VARCHAR(50),
    roster_positions JSONB,
    stat_categories JSONB,
    uses_fractional_points BOOLEAN,
    uses_negative_points BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on the league_key for faster lookups
CREATE INDEX idx_league_settings_league_key ON public.league_settings(league_key);

-- Create a trigger to update the updated_at column
CREATE TRIGGER update_league_settings_modtime
BEFORE UPDATE ON public.league_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();

-- Grant permissions to access the table
GRANT ALL ON TABLE public.league_settings TO anon, authenticated, service_role;
GRANT USAGE, SELECT ON SEQUENCE public.league_settings_id_seq TO anon, authenticated, service_role;

-- Add a comment to the table
COMMENT ON TABLE public.league_settings IS 'Stores league settings for fantasy football leagues';