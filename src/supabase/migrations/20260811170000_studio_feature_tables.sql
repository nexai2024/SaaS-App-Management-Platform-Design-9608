/*
# Studio feature tables — applied via NCB MCP on 2026-08-12

Matches live NCB conventions: INT AUTO_INCREMENT PKs, VARCHAR user_id,
DATETIME defaults. Do NOT store these in app_notes.
*/

-- studio_tickets_1739884512 already existed as a stub; columns added via ALTER.
-- Remaining tables created with CREATE TABLE IF NOT EXISTS (see MCP history).

-- RLS (set via NCB MCP set_rls_policy):
--   studio_public_bundles_1739884512 → public_read
--   studio_waitlists_1739884512 → public_read
--   studio_waitlist_signups_1739884512 → public_write
--   studio_webhook_tokens_1739884512 → public_read
--   studio_webhook_events_1739884512 → public_write
--   all other studio_* tables → private (owner only)
