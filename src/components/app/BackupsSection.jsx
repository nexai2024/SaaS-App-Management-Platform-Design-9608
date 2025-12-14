import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabase';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { 
  FiDownload, FiUpload, FiTrash2, FiCalendar, FiHardDrive, FiShield, 
  FiClock, FiRefreshCw, FiAlertTriangle, FiCheck, FiX, FiSave, FiDatabase,
  FiFile, FiArchive, FiZap, FiSettings, FiCopy, FiCamera
} = FiIcons;

const BackupsSection = ({ appId }) => {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateBackup, setShowCreateBackup] = useState(false);
  const [newBackup, setNewBackup] = useState({
    backup_name: '',
    backup_type: 'manual',
    is_encrypted: false,
    expiry_date: ''
  });
  const [restoringBackup, setRestoringBackup] = useState(null);

  useEffect(() => {
    if (appId) fetchBackups();
  }, [appId]);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_backups')
        .select('*')
        .eq('app_id', appId)
        .order('backup_date', { ascending: false });
      
      if (error) throw error;
      setBackups(data || []);
    } catch (error) {
      console.error('Error fetching backups:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    try {
      const backupData = {
        ...newBackup,
        app_id: appId,
        user_id: (await supabase.auth.getUser()).data.user.id,
        backup_name: newBackup.backup_name || `Backup ${new Date().toLocaleString()}`,
        backup_size: Math.floor(Math.random() * 1000000000), // Mock size
        storage_location: `https://storage.example.com/backups/${appId}/${Date.now()}`,
        expiry_date: newBackup.expiry_date ? new Date(newBackup.expiry_date).toISOString() : null
      };

      const { data, error } = await supabase
        .from('app_backups')
        .insert([backupData])
        .select();
      
      if (error) throw error;
      fetchBackups();
      setShowCreateBackup(false);
      setNewBackup({
        backup_name: '',
        backup_type: 'manual',
        is_encrypted: false,
        expiry_date: ''
      });
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  };

  const handleRestoreBackup = async (backupId) => {
    if (!confirm('Are you sure you want to restore from this backup? This will overwrite current data.')) {
      return;
    }

    try {
      setRestoringBackup(backupId);
      // Mock restore process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      await supabase
        .from('app_backups')
        .update({ status: 'restoring' })
        .eq('id', backupId);

      // Simulate restore completion
      setTimeout(async () => {
        await supabase
          .from('app_backups')
          .update({ status: 'active' })
          .eq('id', backupId);
        setRestoringBackup(null);
      }, 3000);

      fetchBackups();
    } catch (error) {
      console.error('Error restoring backup:', error);
      setRestoringBackup(null);
    }
  };

  const handleDeleteBackup = async (backupId) => {
    if (confirm('Are you sure you want to delete this backup? This action cannot be undone.')) {
      try {
        await supabase.from('app_backups').delete().eq('id', backupId);
        fetchBackups();
      } catch (error) {
        console.error('Error deleting backup:', error);
      }
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getBackupTypeIcon = (type) => {
    switch (type) {
      case 'manual': return FiDatabase;
      case 'automatic': return FiZap;
      case 'snapshot': return FiCamera;
      case 'migration': return FiUpload;
      default: return FiHardDrive;
    }
  };

  const getBackupTypeColor = (type) => {
    switch (type) {
      case 'manual': return 'bg-blue-100 text-blue-800';
      case 'automatic': return 'bg-green-100 text-green-800';
      case 'snapshot': return 'bg-purple-100 text-purple-800';
      case 'migration': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'restoring': return 'bg-blue-100 text-blue-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'deleted': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isExpired = (backup) => {
    return backup.expiry_date && new Date(backup.expiry_date) < new Date();
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
          <h3 className="text-lg font-semibold text-gray-900">Backups</h3>
          <p className="text-sm text-gray-600">Manage app backups and restore points</p>
        </div>
        <button
          onClick={() => setShowCreateBackup(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiUpload} className="w-4 h-4" />
          <span>Create Backup</span>
        </button>
      </div>

      {/* Backups List */}
      <div className="space-y-4">
        {backups.map((backup) => (
          <motion.div
            key={backup.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white p-4 rounded-lg border ${isExpired(backup) ? 'border-red-200 bg-red-50' : 'border-gray-200'} shadow-sm`}
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-3">
                  <SafeIcon icon={getBackupTypeIcon(backup.backup_type)} className="w-5 h-5 text-gray-600" />
                  <div>
                    <h4 className="font-medium text-gray-900">{backup.backup_name}</h4>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getBackupTypeColor(backup.backup_type)}`}>
                        {backup.backup_type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(backup.status)}`}>
                        {backup.status}
                      </span>
                      {backup.is_encrypted && (
                        <span className="flex items-center space-x-1 text-green-600 text-xs">
                          <SafeIcon icon={FiShield} className="w-3 h-3" />
                          <span>Encrypted</span>
                        </span>
                      )}
                      {isExpired(backup) && (
                        <span className="text-red-600 text-xs font-medium">Expired</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiHardDrive} className="w-4 h-4" />
                    <span>{formatFileSize(backup.backup_size || 0)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                    <span>{new Date(backup.backup_date).toLocaleDateString()}</span>
                  </div>
                  {backup.expiry_date && (
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiClock} className="w-4 h-4" />
                      <span>Expires {new Date(backup.expiry_date).toLocaleDateString()}</span>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    <SafeIcon icon={FiFile} className="w-4 h-4" />
                    <span>{backup.compression_type || 'gzip'}</span>
                  </div>
                </div>

                {backup.restore_point && (
                  <div className="mt-3">
                    <span className="text-sm text-gray-600">Restore Point: </span>
                    <span className="text-sm font-medium text-gray-900">{backup.restore_point}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleRestoreBackup(backup.id)}
                  disabled={restoringBackup === backup.id || isExpired(backup)}
                  className="text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed text-sm flex items-center space-x-1"
                >
                  {restoringBackup === backup.id ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600"></div>
                      <span>Restoring...</span>
                    </>
                  ) : (
                    <>
                      <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
                      <span>Restore</span>
                    </>
                  )}
                </button>
                <button className="text-gray-400 hover:text-gray-600">
                  <SafeIcon icon={FiDownload} className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteBackup(backup.id)}
                  className="text-gray-400 hover:text-red-600"
                >
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {backups.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiHardDrive} className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No backups yet</h3>
          <p className="text-gray-600 mb-4">Create backups to protect your app data</p>
          <button
            onClick={() => setShowCreateBackup(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create First Backup
          </button>
        </div>
      )}

      {/* Create Backup Modal */}
      {showCreateBackup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-md mx-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create Backup</h3>
              <button
                onClick={() => setShowCreateBackup(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backup Name</label>
                <input
                  type="text"
                  value={newBackup.backup_name}
                  onChange={(e) => setNewBackup(prev => ({ ...prev, backup_name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Optional backup name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Backup Type</label>
                <select
                  value={newBackup.backup_type}
                  onChange={(e) => setNewBackup(prev => ({ ...prev, backup_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="manual">Manual Backup</option>
                  <option value="automatic">Automatic Backup</option>
                  <option value="snapshot">Snapshot</option>
                  <option value="migration">Migration Backup</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                <input
                  type="date"
                  value={newBackup.expiry_date}
                  onChange={(e) => setNewBackup(prev => ({ ...prev, expiry_date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for no expiry</p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="encrypt-backup"
                  checked={newBackup.is_encrypted}
                  onChange={(e) => setNewBackup(prev => ({ ...prev, is_encrypted: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="encrypt-backup" className="ml-2 text-sm text-gray-700">
                  Encrypt this backup
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowCreateBackup(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBackup}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4 inline mr-2" />
                Create Backup
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default BackupsSection;