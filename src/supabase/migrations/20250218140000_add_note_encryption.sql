/* 
# Add Encryption Support for Notes
1. Changes
   - Add `is_encrypted` boolean column to `app_notes` table
   - Default to false for existing notes
*/

DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'app_notes' 
        AND column_name = 'is_encrypted'
    ) THEN 
        ALTER TABLE app_notes ADD COLUMN is_encrypted boolean DEFAULT false;
    END IF;
END $$;