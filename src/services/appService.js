import { marketing, apps as appsApi } from './dataLayer';
import { nowIso } from '../lib/dataUtils';

export const createApp = async (appData) => {
  try {
    const { importSource, ...dbAppData } = appData;
    const app = await appsApi.create(dbAppData);

    if (!importSource && app?.id) {
      await marketing.bulkCreate([
        {
          app_id: app.id,
          name: 'App Specifications',
          type: 'document',
          content: '# App Specifications\n\n## Overview\n[Describe the app purpose]',
          description: 'Detailed specifications and requirements.',
          created_at: nowIso(),
        },
      ]);
    }

    return { data: app, error: null };
  } catch (error) {
    console.error('Service Error [createApp]:', error);
    return { data: null, error: error.message };
  }
};

export const importAppFromJSON = async (jsonData) => {
  try {
    const appData = {
      name: jsonData.project_name || 'Untitled Project',
      description: `Imported on ${jsonData.date_created || nowIso()}`,
      document_version: jsonData.document_version,
      status: 'Development',
      importSource: 'json',
    };

    const { data: app, error: appError } = await createApp(appData);
    if (appError) throw new Error(appError);

    if (jsonData.artifacts && Array.isArray(jsonData.artifacts) && app?.id) {
      const materials = jsonData.artifacts.map((artifact) => ({
        app_id: app.id,
        name: `${artifact.category} - ${artifact.artifact_type}`,
        category: artifact.category,
        artifact_type: artifact.artifact_type,
        original_id: artifact.id,
        type: 'document',
        details:
          typeof artifact.details === 'object'
            ? JSON.stringify(artifact.details)
            : artifact.details,
        content:
          typeof artifact.details === 'object'
            ? JSON.stringify(artifact.details, null, 2)
            : artifact.details,
        created_at: nowIso(),
      }));

      await marketing.bulkCreate(materials);
    }

    return { data: app, error: null };
  } catch (error) {
    console.error('Service Error [importAppFromJSON]:', error);
    return { data: null, error: error.message };
  }
};
