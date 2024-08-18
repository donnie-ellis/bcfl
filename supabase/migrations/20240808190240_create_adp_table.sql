CREATE TABLE IF NOT EXISTS public.player_adp (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES public.players(id),
    source_id INTEGER,
    adp NUMERIC(5,2),
    adp_formatted VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_player_adp_player_id ON public.player_adp(player_id);
CREATE INDEX idx_player_adp_source_id ON public.player_adp(source_id);