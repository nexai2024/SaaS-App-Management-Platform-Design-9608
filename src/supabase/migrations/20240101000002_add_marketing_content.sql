/*
# Add Content to Marketing Materials
1. Changes
   - Add `content` column to `marketing_materials` table for storing text-based documents
   - Add `description` column for extra metadata
*/

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_materials' AND column_name = 'content') THEN
        ALTER TABLE marketing_materials ADD COLUMN content text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_materials' AND column_name = 'description') THEN
        ALTER TABLE marketing_materials ADD COLUMN description text;
    END IF;
END $$;