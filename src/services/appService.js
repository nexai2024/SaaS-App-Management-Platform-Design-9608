import { supabase } from '../supabase/supabase';

export const createApp = async (appData, userId) => {
  try {
    // 1. Create the App
    const { data: app, error: appError } = await supabase
      .from('apps')
      .insert([appData])
      .select()
      .single();

    if (appError) throw appError;

    // 2. Create Default Marketing Materials
    const defaultMaterials = [
      {
        app_id: app.id,
        name: 'App Specifications',
        type: 'document',
        content: '# App Specifications\n\n## Overview\n[Describe the app purpose]\n\n## Core Features\n- Feature 1\n- Feature 2\n\n## User User Stories\n1. As a user, I want to...',
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
      // We don't throw here to avoid failing the whole app creation if just materials fail
    }

    return { data: app, error: null };
  } catch (error) {
    console.error('Error in createApp service:', error);
    return { data: null, error };
  }
};