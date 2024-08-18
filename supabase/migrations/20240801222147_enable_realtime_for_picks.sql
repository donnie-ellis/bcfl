-- Enable realtime for picks table
ALTER PUBLICATION supabase_realtime ADD TABLE picks;

-- If you want to enable realtime for other tables as well, you can add them here
-- ALTER PUBLICATION supabase_realtime ADD TABLE players;
-- ALTER PUBLICATION supabase_realtime ADD TABLE drafts;