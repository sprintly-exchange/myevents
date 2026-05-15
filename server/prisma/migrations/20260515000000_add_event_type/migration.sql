-- Add event_type column: 'invite_only' (default) or 'public'
ALTER TABLE events ADD COLUMN event_type TEXT NOT NULL DEFAULT 'invite_only';
