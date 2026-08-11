import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { notes as notesApi } from '../services/dataLayer';
import { isTruthyFlag } from '../lib/dataUtils';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import CryptoJS from 'crypto-js';

const { FiLock, FiUnlock, FiFileText, FiCalendar, FiClock, FiAlertCircle, FiLoader } = FiIcons;

const SharedNote = () => {
  const { token } = useParams();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [password, setPassword] = useState('');
  const [decryptedContent, setDecryptedContent] = useState('');

  useEffect(() => {
    fetchSharedNote();
  }, [token]);

  const fetchSharedNote = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await notesApi.getByShareToken(token);
      if (data && isTruthyFlag(data.is_shared)) {
        setNote(data);
      } else if (data) {
        setError('This note is no longer shared.');
      } else {
        setError('Note not found or link is invalid.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching the note.');
    } finally {
      setLoading(false);
    }
  };

  const handleDecrypt = () => {
    try {
      const bytes = CryptoJS.AES.decrypt(note.content, password);
      const originalText = bytes.toString(CryptoJS.enc.Utf8);
      if (originalText) {
        setDecryptedContent(originalText);
      } else {
        alert('Incorrect password');
      }
    } catch {
      alert('Decryption failed. Please check your password.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <SafeIcon icon={FiLoader} className="w-8 h-8 text-brand-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 text-center">
        <div className="max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiAlertCircle} className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="page-title mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a href="/" className="text-brand-700 font-medium hover:underline">
            Go to Homepage
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-3xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="bg-blue-600 px-8 py-6 text-white">
          <div className="flex items-center space-x-3 mb-2">
            <SafeIcon icon={FiFileText} className="w-6 h-6" />
            <span className="text-sm font-medium opacity-80">Shared Note</span>
          </div>
          <h1 className="text-3xl font-bold">{note.title}</h1>
        </div>

        <div className="p-8">
          <div className="flex items-center space-x-6 text-sm text-gray-500 mb-8 pb-8 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiCalendar} className="w-4 h-4" />
              <span>Created: {new Date(note.created_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-2">
              <SafeIcon icon={FiClock} className="w-4 h-4" />
              <span>Type: {note.note_type}</span>
            </div>
          </div>

          <div className="prose prose-blue max-w-none">
            {isTruthyFlag(note.is_encrypted) && !decryptedContent ? (
              <div className="bg-gray-50 rounded-xl p-8 border border-dashed border-gray-300 text-center">
                <div className="w-12 h-12 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <SafeIcon icon={FiLock} className="w-6 h-6 text-brand-700" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">This note is encrypted</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Please enter the password provided by the owner to view the content.
                </p>
                <div className="max-w-xs mx-auto space-y-3">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                  <button
                    onClick={handleDecrypt}
                    className="w-full py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <SafeIcon icon={FiUnlock} className="w-4 h-4" />
                    <span>Unlock Content</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                {decryptedContent || note.content}
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-100">
          <p className="text-xs text-gray-500">Shared via SaaS Management Platform</p>
        </div>
      </motion.div>
    </div>
  );
};

export default SharedNote;
