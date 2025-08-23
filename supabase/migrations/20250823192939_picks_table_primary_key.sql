-- Add the missing primary key constraint
ALTER TABLE picks ADD CONSTRAINT picks_pkey PRIMARY KEY (id);