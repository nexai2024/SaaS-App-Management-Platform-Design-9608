import { dataFetch } from '../api';

export const createApp = async (appData) => {
  try {
    const userId = localStorage.getItem('user_id');
    if (!userId) throw new Error('User not authenticated');

    const { importSource, ...dbAppData } = appData;
    
    // Ensure all required fields for NCB are present and formatted correctly
    const payload = {
      ...dbAppData,
      user_id: userId,
      tech_stack: typeof dbAppData.tech_stack === 'string' ? dbAppData.tech_stack : JSON.stringify(dbAppData.tech_stack || []),
      specifications: typeof dbAppData.specifications === 'string' ? dbAppData.specifications : JSON.stringify(dbAppData.specifications || {}),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const res = await dataFetch(`create/apps_1739884512?owner_id=${userId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (res?.status === 'error') throw new Error(res.error);

    const app = res.data;

    if (!importSource && app?.id) {
      const defaultMaterials = [
        {
          app_id: app.id,
          name: 'App Specifications',
          type: 'document',
          content: '# App Specifications\n\n## Overview\n[Describe the app purpose]',
          description: 'Detailed specifications and requirements.',
          user_id: userId,
          created_at: new Date().toISOString()
        }
      ];

      await dataFetch(`bulk/create/marketing_materials_1739884512?owner_id=${userId}`, {
        method: 'POST',
        body: JSON.stringify({ records: defaultMaterials })
      });
    }

    return { data: app, error: null };
  } catch (error) {
    console.error('Service Error [createApp]:', error);
    return { data: null, error: error.message };
  }
};

export const importAppFromJSON = async (jsonData) => {
  try {
    const userId = localStorage.getItem('user_id');
    if (!userId) throw new Error('User not authenticated');

    const appData = {
      name: jsonData.project_name || 'Untitled Project',
      description: `Imported on ${jsonData.date_created || new Date().toISOString()}`,
      document_version: jsonData.document_version,
      status: 'Development',
      importSource: 'json'
    };

    const { data: app, error: appError } = await createApp(appData);
    if (appError) throw new Error(appError);

    if (jsonData.artifacts && Array.isArray(jsonData.artifacts) && app?.id) {
      const materials = jsonData.artifacts.map(artifact => ({
        app_id: app.id,
        name: `${artifact.category} - ${artifact.artifact_type}`,
        category: artifact.category,
        artifact_type: artifact.artifact_type,
        original_id: artifact.id,
        type: 'document',
        details: typeof artifact.details === 'object' ? JSON.stringify(artifact.details) : artifact.details,
        content: typeof artifact.details === 'object' ? JSON.stringify(artifact.details, null, 2) : artifact.details,
        user_id: userId,
        created_at: new Date().toISOString()
      }));

      await dataFetch(`bulk/create/marketing_materials_1739884512?owner_id=${userId}`, {
        method: 'POST',
        body: JSON.stringify({ records: materials })
      });
    }

    return { data: app, error: null };
  } catch (error) {
    console.error('Service Error [importAppFromJSON]:', error);
    return { data: null, error: error.message };
  }
};