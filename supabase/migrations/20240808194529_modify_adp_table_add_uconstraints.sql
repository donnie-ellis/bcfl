-- Add a unique constraint to player_adp table
ALTER TABLE public.player_adp
ADD CONSTRAINT player_adp_player_id_draft_id_source_id_key 
UNIQUE (player_id, draft_id, source_id);