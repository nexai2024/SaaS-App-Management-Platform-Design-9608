import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabase';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { 
  FiPlus, FiGitBranch, FiGithub, FiExternalLink, FiCalendar, FiTag, 
  FiDownload, FiUpload, FiCheck, FiX, FiSave, FiCode, FiPackage, 
  FiRocket, FiArchive, FiCopy, FiEdit3, FiTrash2, FiActivity 
} = FiIcons;

const VersionsSection = ({ appId }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [editingVersion, setEditingVersion] = useState(null);
  const [newVersion, setNewVersion] = useState({
    version_number: '',
    version_type: 'patch',
    release_notes: '',
    changelog: '',
    commit_hash: '',
    branch: '',
    build_url: '',
    status: 'development'
  });

  useEffect(() => {
    if (appId) fetchVersions();
  }, [appId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_versions')
        .select('*')
        .eq('app_id', appId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setVersions(data || []);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    try {
      const versionData = {
        ...newVersion,
        app_id: appId,
        user_id: (await supabase.auth.getUser()).data.user.id,
        release_date: newVersion.status === 'production' ? new Date().toISOString() : null
      };

      const { data, error } = await supabase
        .from('app_versions')
        .insert([versionData])
        .select();
      
      if (error) throw error;
      fetchVersions();
      setShowCreateVersion(false);
      setNewVersion({
        version_number: '',
        version_type: 'patch',
        release_notes: '',
        changelog: '',
        commit_hash: '',
        branch: '',
        build_url: '',
        status: 'development'
      });
    } catch (error) {
      console.error('Error creating version:', error);
    }
  };

  const handleSetCurrentVersion = async (versionId) => {
    try {
      // First, unset all current versions
      await supabase
        .from('app_versions')
        .update({ is_current: false })
        .eq('app_id', appId);

      // Then set the new current version
      await supabase
        .from('app_versions')
        .update({ is_current: true })
        .eq('id', versionId);

      fetchVersions();
    } catch (error) {
      console.error('Error setting current version:', error);
    }
  };

  const getVersionTypeIcon = (type) => {
    switch (type) {
      case 'major': return FiRocket;
      case 'minor': return FiPackage;
      case 'patch': return FiArchive;
      case 'hotfix': return FiActivity;
      default: return FiTag;
    }
  };

  const getVersionTypeColor = (type) => {
    switch (type) {
      case 'major': return 'bg-red-100 text-red-800 border-red-200';
      case 'minor': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'patch': return 'bg-green-100 text-green-800 border-green-200';
      case 'hotfix': return 'bg-orange-100 text-orange-800 border-orange-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'production': return 'bg-green-100 text-green-800';
      case 'staging': return 'bg-blue-100 text-blue-800';
      case 'testing': return 'bg-yellow-100 text-yellow-800';
      case 'development': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const generateVersionNumber = (type, currentVersions) => {
    const latestVersion = currentVersions[0];
    if (!latestVersion) {
      return '1.0.0';
    }

    const parts = latestVersion.version_number.split('.').map(Number);
    switch (type) {
      case 'major': return `${parts[0] + 1}.0.0`;
      case 'minor': return `${parts[0]}.${parts[1] + 1}.0`;
      case 'patch': return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
      case 'hotfix': return `${parts[0]}.${parts[1]}.${parts[2]}-hotfix`;
      default: return latestVersion.version_number;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Versions & Releases</h3>
          <p className="text-sm text-gray-600">Track app versions, releases, and deployment history</p>
        </div>
        <button
          onClick={() => {
            setNewVersion(prev => ({ ...prev, version_number: generateVersionNumber(prev.version_type, versions) }));
            setShowCreateVersion(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Create Version</span>
        </button>
      </div>

      {/* Versions List */}
      <div className="space-y-4">
        {versions.map((version) => (
          <motion.div
            key={version.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white p-4 rounded-lg border ${version.is_current ? 'border-green-200 bg-green-50' : 'border-gray-200'} shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={getVersionTypeIcon(version.version_type)} className="w-4 h-4 text-gray-600" />
                    <span className="font-medium text-gray-900">v{version.version_number}</span>
                    {version.is_current && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getVersionTypeColor(version.version_type)}`}>
                    {version.version_type}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(version.status)}`}>
                    {version.status}
                  </span>
                </div>

                {version.release_notes && (
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1">Release Notes</h4>
                    <p className="text-sm text-gray-600">{version.release_notes}</p>
                  </div>
                )}

                {version.changelog && (
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1">Changelog</h4>
                    <pre className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-2 rounded">{version.changelog}</pre>
                  </div>
                )}

                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  {version.commit_hash && (
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiGitBranch} className="w-4 h-4" />
                      <span>{version.commit_hash.substring(0, 7)}</span>
                    </div>
                  )}
                  {version.branch && (
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiGithub} className="w-4 h-4" />
                      <span>{version.branch}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                    <span>{new Date(version.created_at).toLocaleDateString()}</span>
                  </div>
                  {version.release_date && (
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiRocket} className="w-4 h-4" />
                      <span>Released {new Date(version.release_date).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>

                {version.build_url && (
                  <div className="mt-3">
                    <a
                      href={version.build_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-700 text-sm"
                    >
                      <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                      <span>View Build</span>
                    </a>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                {!version.is_current && (
                  <button
                    onClick={() => handleSetCurrentVersion(version.id)}
                    className="text-blue-600 hover:text-blue-700 text-sm"
                  >
                    Set as Current
                  </button>
                )}
                <button className="text-gray-400 hover:text-gray-600">
                  <SafeIcon icon={FiCopy} className="w-4 h-4" />
                </button>
                <button className="text-gray-400 hover:text-gray-600">
                  <SafeIcon icon={FiDownload} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {versions.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiPackage} className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No versions yet</h3>
          <p className="text-gray-600 mb-4">Start tracking your app versions and releases</p>
          <button
            onClick={() => {
              setNewVersion(prev => ({ ...prev, version_number: generateVersionNumber(prev.version_type, versions) }));
              setShowCreateVersion(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Version
          </button>
        </div>
      )}

      {/* Create Version Modal */}
      {showCreateVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Version</h3>
              <button
                onClick={() => setShowCreateVersion(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version Type</label>
                  <select
                    value={newVersion.version_type}
                    onChange={(e) => {
                      const type = e.target.value;
                      setNewVersion(prev => ({ 
                        ...prev, 
                        version_type: type,
                        version_number: generateVersionNumber(type, versions)
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="major">Major (Breaking changes)</option>
                    <option value="minor">Minor (New features)</option>
                    <option value="patch">Patch (Bug fixes)</option>
                    <option value="hotfix">Hotfix (Urgent fixes)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version Number</label>
                  <input
                    type="text"
                    value={newVersion.version_number}
                    onChange={(e) => setNewVersion(prev => ({ ...prev, version_number: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newVersion.status}
                  onChange={(e) => setNewVersion(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="development">Development</option>
                  <option value="testing">Testing</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                  <option value="archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Release Notes</label>
                <textarea
                  value={newVersion.release_notes}
                  onChange={(e) => setNewVersion(prev => ({ ...prev, release_notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="What's new in this version..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Changelog</label>
                <textarea
                  value={newVersion.changelog}
                  onChange={(e) => setNewVersion(prev => ({ ...prev, changelog: e.target.value }))}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Detailed changelog..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Commit Hash</label>
                  <input
                    type="text"
                    value={newVersion.commit_hash}
                    onChange={(e) => setNewVersion(prev => ({ ...prev, commit_hash: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="abc123"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                  <input
                    type="text"
                    value={newVersion.branch}
                    onChange={(e) => setNewVersion(prev => ({ ...prev, branch: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="main"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Build URL</label>
                <input
                  type="url"
                  value={newVersion.build_url}
                  onChange={(e) => setNewVersion(prev => ({ ...prev, build_url: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="https://example.com/build/123"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateVersion(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={!newVersion.version_number}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4 inline mr-2" />
                Create Version
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default VersionsSection;