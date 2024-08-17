-- Add constraint for uniqueness within each round
ALTER TABLE ONLY "public"."picks"
    ADD CONSTRAINT "picks_draft_id_pick_number_round_number_key" UNIQUE (draft_id, pick_number, round_number);

-- Add constraint to prevent duplicate player_id within the same draft
ALTER TABLE ONLY "public"."picks"
    ADD CONSTRAINT "picks_draft_id_player_id_key" UNIQUE (draft_id, player_id);

ALTER TABLE ONLY "public"."picks"
    DROP CONSTRAINT "picks_pkey";