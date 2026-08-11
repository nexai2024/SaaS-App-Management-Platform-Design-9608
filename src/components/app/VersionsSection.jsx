import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { versions as versionsApi } from '../../services/dataLayer';
import { isTruthyFlag } from '../../lib/dataUtils';
import { githubRepoStore } from '../../services/portfolioStore';
import { toastSuccess, toastError } from '../common/Toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const {
  FiPlus,
  FiGitBranch,
  FiGithub,
  FiCalendar,
  FiTag,
  FiCheck,
  FiX,
  FiSave,
  FiPackage,
  FiRocket,
  FiArchive,
  FiCopy,
  FiActivity,
  FiRefreshCw,
} = FiIcons;

function parseGithubRepo(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const cleaned = raw
    .replace(/^https?:\/\/(www\.)?github\.com\//i, '')
    .replace(/\.git$/i, '')
    .replace(/\/$/, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2) return null;
  return `${parts[0]}/${parts[1]}`;
}

const VersionsSection = ({ appId }) => {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateVersion, setShowCreateVersion] = useState(false);
  const [repo, setRepo] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [previewCommits, setPreviewCommits] = useState([]);
  const [newVersion, setNewVersion] = useState({
    version_number: '',
    version_type: 'patch',
    release_notes: '',
    changelog: '',
    commit_hash: '',
    branch: '',
    build_url: '',
    status: 'development',
  });

  useEffect(() => {
    if (appId) {
      setRepo(githubRepoStore.get(appId));
      fetchVersions();
    }
  }, [appId]);

  const fetchVersions = async () => {
    try {
      setLoading(true);
      const data = await versionsApi.list(appId);
      setVersions(data);
    } catch (error) {
      console.error('Error fetching versions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    try {
      await versionsApi.create(appId, newVersion);
      toastSuccess('Version created');
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
        status: 'development',
      });
    } catch (error) {
      console.error('Error creating version:', error);
    }
  };

  const handleSetCurrentVersion = async (versionId) => {
    try {
      await versionsApi.setCurrent(appId, versionId, versions);
      toastSuccess('Current version updated');
      fetchVersions();
    } catch (error) {
      console.error('Error setting current version:', error);
    }
  };

  const saveRepo = () => {
    const parsed = parseGithubRepo(repo);
    if (!parsed) {
      toastError('Use owner/repo or a GitHub URL');
      return;
    }
    githubRepoStore.set(appId, parsed);
    setRepo(parsed);
    toastSuccess('Repo linked');
  };

  const syncFromGithub = async ({ importAsVersions = false } = {}) => {
    const parsed = parseGithubRepo(repo) || githubRepoStore.get(appId);
    if (!parsed) {
      toastError('Link a public GitHub repo first');
      return;
    }
    githubRepoStore.set(appId, parsed);
    setRepo(parsed);

    try {
      setSyncing(true);
      const res = await fetch(
        `https://api.github.com/repos/${parsed}/commits?per_page=8`,
        { headers: { Accept: 'application/vnd.github+json' } }
      );
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? 'Repo not found or private'
            : `GitHub API error (${res.status})`
        );
      }
      const commits = await res.json();
      setPreviewCommits(commits);

      if (importAsVersions && Array.isArray(commits)) {
        const existingHashes = new Set(
          versions.map((v) => String(v.commit_hash || '').toLowerCase()).filter(Boolean)
        );
        let imported = 0;
        for (const commit of commits.slice(0, 5)) {
          const sha = commit.sha;
          if (!sha || existingHashes.has(sha.toLowerCase())) continue;
          const message = commit.commit?.message || 'Commit';
          const short = message.split('\n')[0].slice(0, 100);
          const date = commit.commit?.author?.date;
          await versionsApi.create(appId, {
            version_number: `gh-${sha.slice(0, 7)}`,
            version_type: 'patch',
            release_notes: short,
            changelog: message,
            commit_hash: sha,
            branch: 'main',
            build_url: commit.html_url,
            status: 'development',
            release_date: date || null,
          });
          existingHashes.add(sha.toLowerCase());
          imported += 1;
        }
        toastSuccess(imported ? `Imported ${imported} commits as versions` : 'No new commits to import');
        fetchVersions();
      } else {
        toastSuccess(`Fetched ${commits.length} recent commits`);
      }
    } catch (e) {
      console.error(e);
      toastError(e.message || 'GitHub sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const getVersionTypeIcon = (type) => {
    switch (type) {
      case 'major':
        return FiRocket;
      case 'minor':
        return FiPackage;
      case 'patch':
        return FiArchive;
      case 'hotfix':
        return FiActivity;
      default:
        return FiTag;
    }
  };
  const getVersionTypeColor = (type) => {
    switch (type) {
      case 'major':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'minor':
        return 'bg-brand-100 text-brand-800 border-brand-200';
      case 'patch':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'hotfix':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };
  const getStatusColor = (status) => {
    switch (status) {
      case 'production':
        return 'bg-green-100 text-green-800';
      case 'staging':
        return 'bg-brand-100 text-brand-800';
      case 'testing':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Versions & Releases</h3>
          <p className="text-sm text-gray-600">Track releases and sync public GitHub activity</p>
        </div>
        <button
          onClick={() => setShowCreateVersion(true)}
          className="btn-primary flex items-center space-x-2"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Create Version</span>
        </button>
      </div>

      <div className="panel p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-900">
          <SafeIcon icon={FiGithub} className="w-4 h-4" />
          GitHub / deploy sync
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={repo}
            onChange={(e) => setRepo(e.target.value)}
            placeholder="owner/repo or https://github.com/owner/repo"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
          <button
            type="button"
            onClick={saveRepo}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50"
          >
            Save
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={() => syncFromGithub({ importAsVersions: false })}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 inline-flex items-center gap-1 disabled:opacity-60"
          >
            <SafeIcon icon={FiRefreshCw} className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Preview
          </button>
          <button
            type="button"
            disabled={syncing}
            onClick={() => syncFromGithub({ importAsVersions: true })}
            className="px-3 py-2 bg-slate-800 text-white rounded-lg text-sm hover:bg-slate-900 disabled:opacity-60"
          >
            Import commits
          </button>
        </div>
        {previewCommits.length > 0 && (
          <div className="border-t border-gray-100 pt-3 space-y-2">
            {previewCommits.slice(0, 5).map((c) => (
              <div key={c.sha} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="text-gray-900 font-medium">
                    {(c.commit?.message || '').split('\n')[0]}
                  </p>
                  <p className="text-xs text-gray-500">
                    {c.sha?.slice(0, 7)} ·{' '}
                    {c.commit?.author?.date
                      ? new Date(c.commit.author.date).toLocaleString()
                      : ''}
                  </p>
                </div>
                <a
                  href={c.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand-700 text-xs shrink-0"
                >
                  View
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {versions.map((version) => (
          <motion.div
            key={version.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white p-4 rounded-lg border ${
              isTruthyFlag(version.is_current)
                ? 'border-green-200 bg-green-50'
                : 'border-gray-200'
            } shadow-sm`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3 flex-wrap">
                  <div className="flex items-center space-x-2">
                    <SafeIcon
                      icon={getVersionTypeIcon(version.version_type)}
                      className="w-4 h-4 text-gray-600"
                    />
                    <span className="font-medium text-gray-900">v{version.version_number}</span>
                    {isTruthyFlag(version.is_current) && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                        Current
                      </span>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium border ${getVersionTypeColor(
                      version.version_type
                    )}`}
                  >
                    {version.version_type}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      version.status
                    )}`}
                  >
                    {version.status}
                  </span>
                </div>
                {version.release_notes && (
                  <div className="mb-3">
                    <h4 className="font-medium text-gray-900 mb-1 text-sm">Release Notes</h4>
                    <p className="text-sm text-gray-600">{version.release_notes}</p>
                  </div>
                )}
                <div className="flex items-center space-x-6 text-xs text-gray-500">
                  {version.commit_hash && (
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiGitBranch} className="w-4 h-4" />
                      <span>{String(version.commit_hash).substring(0, 7)}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                    <span>
                      {version.created_at
                        ? new Date(version.created_at).toLocaleDateString()
                        : '—'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                {!isTruthyFlag(version.is_current) && (
                  <button
                    onClick={() => handleSetCurrentVersion(version.id)}
                    className="text-brand-700 hover:text-brand-800 text-sm"
                  >
                    Set as Current
                  </button>
                )}
                <button className="text-gray-400 hover:text-gray-600">
                  <SafeIcon icon={FiCopy} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {showCreateVersion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
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
                    onChange={(e) =>
                      setNewVersion((prev) => ({ ...prev, version_type: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                    <option value="patch">Patch</option>
                    <option value="hotfix">Hotfix</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version Number</label>
                  <input
                    type="text"
                    value={newVersion.version_number}
                    onChange={(e) =>
                      setNewVersion((prev) => ({ ...prev, version_number: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                    placeholder="1.0.0"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={newVersion.status}
                  onChange={(e) => setNewVersion((prev) => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                >
                  <option value="development">Development</option>
                  <option value="staging">Staging</option>
                  <option value="production">Production</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Release Notes</label>
                <textarea
                  value={newVersion.release_notes}
                  onChange={(e) =>
                    setNewVersion((prev) => ({ ...prev, release_notes: e.target.value }))
                  }
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex items-center justify-end space-x-3 mt-6">
              <button onClick={() => setShowCreateVersion(false)} className="px-4 py-2 text-gray-600">
                Cancel
              </button>
              <button
                onClick={handleCreateVersion}
                disabled={!newVersion.version_number}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg"
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
