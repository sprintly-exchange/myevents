-- Add event_language column: 'sv' | 'en' | 'si' — controls the public RSVP page language
ALTER TABLE events ADD COLUMN event_language TEXT NOT NULL DEFAULT 'sv';
