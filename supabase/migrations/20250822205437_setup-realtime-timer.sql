-- Migration: Create draft_timer_events table
-- This migration creates the timer events table with additional helpful columns

-- Step 1: Create the table without the picks foreign key constraint
CREATE TABLE public.draft_timer_events (
  id SERIAL PRIMARY KEY,
  draft_id INTEGER NOT NULL REFERENCES drafts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('start', 'pause', 'resume', 'reset', 'sync', 'expire')),
  pick_id INTEGER, -- Will add foreign key constraint separately
  seconds_remaining INTEGER NOT NULL DEFAULT 0,
  original_duration INTEGER, -- Store original timer duration for resets
  triggered_by TEXT, -- 'user', 'system', 'auto' - helps track what caused the event
  metadata JSONB DEFAULT '{}', -- Store additional event-specific data
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Add indexes for better performance
CREATE INDEX idx_draft_timer_events_draft_id ON public.draft_timer_events(draft_id);
CREATE INDEX idx_draft_timer_events_created_at ON public.draft_timer_events(created_at DESC);
CREATE INDEX idx_draft_timer_events_draft_event_time ON public.draft_timer_events(draft_id, created_at DESC);

-- Add RLS policies (adjust based on your auth setup)
ALTER TABLE public.draft_timer_events ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read timer events for drafts they have access to
-- Note: Adjust this policy based on your draft access control
CREATE POLICY "Users can read draft timer events" ON public.draft_timer_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM drafts 
      WHERE drafts.id = draft_timer_events.draft_id 
      -- Add your draft access logic here, e.g.:
      -- AND (drafts.owner_id = auth.uid() OR drafts.is_public = true)
    )
  );

-- Policy: Only authorized users can insert timer events
-- You might want to restrict this to draft owners/admins
CREATE POLICY "Authorized users can create timer events" ON public.draft_timer_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM drafts 
      WHERE drafts.id = draft_timer_events.draft_id 
      -- Add your authorization logic here, e.g.:
      -- AND drafts.owner_id = auth.uid()
    )
  );

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE 'plpgsql';

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_draft_timer_events_updated_at 
  BEFORE UPDATE ON public.draft_timer_events 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Optional: Create a view for the latest timer state per draft
CREATE VIEW public.latest_draft_timer_state AS
SELECT DISTINCT ON (draft_id) 
  draft_id,
  event_type,
  seconds_remaining,
  original_duration,
  triggered_by,
  created_at,
  pick_id
FROM public.draft_timer_events 
ORDER BY draft_id, created_at DESC;

-- Optional: Create a function to get current timer state
CREATE OR REPLACE FUNCTION get_current_timer_state(draft_id_param INTEGER)
RETURNS TABLE(
  event_type TEXT,
  seconds_remaining INTEGER,
  original_duration INTEGER,
  time_elapsed_since_event INTEGER,
  calculated_remaining INTEGER,
  is_expired BOOLEAN
) AS $$
DECLARE
  latest_event RECORD;
  time_diff INTEGER;
BEGIN
  -- Get the latest timer event
  SELECT * INTO latest_event
  FROM public.draft_timer_events 
  WHERE draft_id = draft_id_param
  ORDER BY created_at DESC 
  LIMIT 1;
  
  IF latest_event IS NULL THEN
    RETURN;
  END IF;
  
  -- Calculate time elapsed since the event
  time_diff := EXTRACT(EPOCH FROM (NOW() - latest_event.created_at));
  
  RETURN QUERY SELECT 
    latest_event.event_type,
    latest_event.seconds_remaining,
    latest_event.original_duration,
    time_diff::INTEGER,
    CASE 
      WHEN latest_event.event_type IN ('start', 'resume') THEN 
        GREATEST(0, latest_event.seconds_remaining - time_diff)
      ELSE 
        latest_event.seconds_remaining
    END::INTEGER,
    CASE 
      WHEN latest_event.event_type IN ('start', 'resume') THEN 
        (latest_event.seconds_remaining - time_diff) <= 0
      ELSE 
        latest_event.event_type = 'expire'
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions (adjust based on your role setup)
-- GRANT SELECT, INSERT ON public.draft_timer_events TO authenticated;
-- GRANT SELECT ON public.latest_draft_timer_state TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_current_timer_state(INTEGER) TO authenticated;