/* 
# Enhance Marketing Schema for JSON Import
1. Changes
   - Add `category` column to organize artifacts
   - Add `artifact_type` column for specific types (e.g., "Elevator Pitch")
   - Add `details` jsonb column for structured data
   - Add `original_id` to track external IDs
   - Add `version` to track document version
*/

DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_materials' AND column_name = 'category') THEN
        ALTER TABLE marketing_materials ADD COLUMN category text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_materials' AND column_name = 'artifact_type') THEN
        ALTER TABLE marketing_materials ADD COLUMN artifact_type text;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_materials' AND column_name = 'details') THEN
        ALTER TABLE marketing_materials ADD COLUMN details jsonb DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'marketing_materials' AND column_name = 'original_id') THEN
        ALTER TABLE marketing_materials ADD COLUMN original_id text;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'apps' AND column_name = 'document_version') THEN
        ALTER TABLE apps ADD COLUMN document_version text;
    END IF;
END $$;