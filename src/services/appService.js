import { supabase } from '../supabase/supabase';

export const createApp = async (appData, userId) => {
  try {
    // Remove importSource before inserting into the database
    // This prevents the "column does not exist" error
    const { importSource, ...dbAppData } = appData;

    // 1. Create the App
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert([dbAppData])
      .select()
      .single();

    if (appError) throw appError;

    // 2. Create Default Marketing Materials only if NOT imported from JSON
    // If importSource is present, we skip this to allow the JSON artifacts to be loaded instead
    if (!importSource) {
      const defaultMaterials = [
        {
          app_id: app.id,
          name: 'App Specifications',
          type: 'document',
          content: '# App Specifications\n\n## Overview\n[Describe the app purpose]\n\n## Core Features\n- Feature 1\n- Feature 2\n\n## User Stories\n1. As a user, I want to...',
          description: 'Detailed specifications and requirements for the application.'
        },
        {
          app_id: app.id,
          name: 'Technical Requirements',
          type: 'document',
          content: '# Technical Requirements\n\n## Tech Stack\n- Frontend: React\n- Backend: Supabase\n\n## Database Schema\n[Describe schema]\n\n## API Endpoints\n[List key endpoints]',
          description: 'Technical constraints, stack details, and architecture notes.'
        }
      ];

      const { error: materialsError } = await supabase
        .from('marketing_materials')
        .insert(defaultMaterials);

      if (materialsError) {
        console.error('Error creating default materials:', materialsError);
      }
    }

    return { data: app, error: null };
  } catch (error) {
    console.error('Error in createApp service:', error);
    return { data: null, error };
  }
};

export const importAppFromJSON = async (jsonData, userId) => {
  try {
    // 1. Prepare App Data
    const appData = {
      user_id: userId,
      name: jsonData.project_name || 'Untitled Project',
      description: `Imported project created on ${jsonData.date_created || new Date().toISOString()}`,
      document_version: jsonData.document_version,
      status: 'Development',
      tech_stack: [],
      users_count: 0,
      revenue: 0,
      importSource: 'json' // This flag tells createApp to skip default materials
    };

    // 2. Create App
    const { data: app, error: appError } = await createApp(appData, userId);
    if (appError) throw appError;

    // 3. Process Artifacts
    if (jsonData.artifacts && Array.isArray(jsonData.artifacts)) {
      const materials = jsonData.artifacts.map(artifact => {
        // Determine content for backward compatibility
        let content = '';
        if (typeof artifact.details === 'string') {
          content = artifact.details;
        } else if (artifact.details && typeof artifact.details === 'object') {
          content = JSON.stringify(artifact.details, null, 2);
        }

        return {
          app_id: app.id,
          name: `${artifact.category} - ${artifact.artifact_type}`,
          category: artifact.category,
          artifact_type: artifact.artifact_type,
          original_id: artifact.id,
          type: 'document', // Default type
          details: artifact.details, // Store raw JSON
          content: content, // Store stringified content for text fields
          description: `Imported artifact: ${artifact.artifact_type}`
        };
      });

      // Insert all materials
      const { error: artifactsError } = await supabase
        .from('marketing_materials')
        .insert(materials);

      if (artifactsError) throw artifactsError;
    }

    return { data: app, error: null };
  } catch (error) {
    console.error('Error importing app from JSON:', error);
    return { data: null, error };
  }
};