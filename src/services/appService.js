import { dataFetch } from '../api';

const userId = localStorage.getItem('user_id');

export const createApp = async (appData) => {
  try {
    const { importSource, ...dbAppData } = appData;
    const res = await dataFetch('create/apps_1739884512?owner_id=' + userId, {
      method: 'POST',
      body: JSON.stringify({ ...dbAppData, user_id: userId, created_at: new Date().toISOString() })
    });

    if (res?.status === 'error') throw new Error(res.error);

    const app = res.data;

    if (!importSource) {
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

      await dataFetch('bulk/create/marketing_materials_1739884512?owner_id=' + userId, {
        method: 'POST',
        body: JSON.stringify({ records: defaultMaterials })
      });
    }

    return { data: app, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const importAppFromJSON = async (jsonData) => {
  try {
    const appData = {
      name: jsonData.project_name || 'Untitled Project',
      description: `Imported on ${jsonData.date_created || new Date().toISOString()}`,
      document_version: jsonData.document_version,
      status: 'Development',
      importSource: 'json'
    };

    const { data: app, error: appError } = await createApp(appData);
    if (appError) throw new Error(appError);

    if (jsonData.artifacts && Array.isArray(jsonData.artifacts)) {
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

      await dataFetch('bulk/create/marketing_materials_1739884512?owner_id=' + userId, {
        method: 'POST',
        body: JSON.stringify({ records: materials })
      });
    }

    return { data: app, error: null };
  } catch (error) {
    return { data: null, error: error.message };
  }
};