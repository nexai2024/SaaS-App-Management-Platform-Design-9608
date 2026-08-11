-- Add sharing columns used by NotesSection / SharedNote
-- NCB runtime may need equivalent columns added manually if not synced from migrations.

ALTER TABLE app_notes
  ADD COLUMN IF NOT EXISTS is_shared boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS share_token text;

CREATE UNIQUE INDEX IF NOT EXISTS app_notes_share_token_uidx
  ON app_notes (share_token)
  WHERE share_token IS NOT NULL AND share_token <> '';

-- Optional profile email for header display after signup
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email text;
