import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { dataFetch } from '../../api';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import CryptoJS from 'crypto-js';

const { 
  FiPlus, FiSearch, FiEdit3, FiTrash2, FiSave, FiX, 
  FiFileText, FiTag, FiLock, FiUnlock, FiEye, FiEyeOff, FiShare2, FiCopy, FiCheck
} = FiIcons;

const NotesSection = ({ appId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('all');
  const [decryptedNotes, setDecryptedNotes] = useState({});
  const [encryptionPassword, setEncryptionPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordAction, setPasswordAction] = useState(null);
  const [targetNoteId, setTargetNoteId] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [copying, setCopying] = useState(false);

  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    note_type: 'general',
    tags: '',
    is_pinned: 0,
    is_encrypted: 0,
    is_shared: 0,
    share_token: ''
  });
  const [tagInput, setTagInput] = useState('');

  const userId = localStorage.getItem('user_id');

  useEffect(() => {
    if (appId) fetchNotes();
  }, [appId]);

  const fetchNotes = async () => {
    setLoading(true);
    const res = await dataFetch(`read/app_notes_1739884512?app_id=${appId}&owner_id=${userId}&sort=is_pinned&order=desc`);
    if (res?.status === 'success') {
      setNotes(res.data || []);
    }
    setLoading(false);
  };

  const handleSaveNote = async () => {
    try {
      let contentToSave = newNote.content;
      if (newNote.is_encrypted && encryptionPassword && !isContentEncrypted(contentToSave)) {
        contentToSave = CryptoJS.AES.encrypt(newNote.content, encryptionPassword).toString();
      }

      const payload = {
        ...newNote,
        content: contentToSave,
        app_id: parseInt(appId),
        user_id: userId,
        updated_at: new Date().toISOString()
      };

      if (editingNote) {
        await dataFetch(`update/app_notes_1739884512/${editingNote.id}?owner_id=${userId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
      } else {
        await dataFetch(`create/app_notes_1739884512?owner_id=${userId}`, {
          method: 'POST',
          body: JSON.stringify({ ...payload, created_at: new Date().toISOString() })
        });
      }

      fetchNotes();
      resetForm();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const resetForm = () => {
    setShowAddNote(false);
    setEditingNote(null);
    setNewNote({
      title: '',
      content: '',
      note_type: 'general',
      tags: '',
      is_pinned: 0,
      is_encrypted: 0,
      is_shared: 0,
      share_token: ''
    });
    setEncryptionPassword('');
    setShowPasswordModal(false);
    setTargetNoteId(null);
  };

  const handleDeleteNote = async (noteId) => {
    if (confirm('Are you sure you want to delete this note?')) {
      await dataFetch(`delete/app_notes_1739884512/${noteId}?owner_id=${userId}`, { method: 'DELETE' });
      fetchNotes();
    }
  };

  const handleShareToggle = async (note) => {
    const isShared = note.is_shared === 1 ? 0 : 1;
    const token = isShared ? Math.random().toString(36).substring(2, 15) : '';
    
    const res = await dataFetch(`update/app_notes_1739884512/${note.id}?owner_id=${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ is_shared: isShared, share_token: token })
    });

    if (res?.status === 'success') {
      fetchNotes();
      if (isShared) {
        setNewNote({ ...note, is_shared: 1, share_token: token });
        setShowShareModal(true);
      }
    }
  };

  const copyShareLink = () => {
    const link = `${window.location.origin}/#/shared/note/${newNote.share_token}`;
    navigator.clipboard.writeText(link);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const isContentEncrypted = (str) => str?.startsWith('U2FsdGVkX1');

  const handleEncryptionAction = () => {
    if (!encryptionPassword) return alert('Please enter a password');

    if (passwordAction === 'encrypt') {
      const encrypted = CryptoJS.AES.encrypt(newNote.content, encryptionPassword).toString();
      setNewNote(prev => ({ ...prev, content: encrypted, is_encrypted: 1 }));
      setShowPasswordModal(false);
    } else if (passwordAction === 'decrypt' || passwordAction === 'edit_decrypt') {
      const note = notes.find(n => n.id === targetNoteId);
      try {
        const bytes = CryptoJS.AES.decrypt(note.content, encryptionPassword);
        const originalText = bytes.toString(CryptoJS.enc.Utf8);
        if (originalText) {
          if (passwordAction === 'edit_decrypt') {
            setEditingNote(note);
            setNewNote({ ...note, content: originalText, is_encrypted: 1 });
            setShowAddNote(true);
          } else {
            setDecryptedNotes(prev => ({ ...prev, [note.id]: originalText }));
          }
          setShowPasswordModal(false);
          setEncryptionPassword('');
        } else {
          alert('Incorrect password');
        }
      } catch (e) {
        alert('Decryption failed');
      }
    }
  };

  const initiateEdit = (note) => {
    if (note.is_encrypted === 1) {
      if (decryptedNotes[note.id]) {
        setEditingNote(note);
        setNewNote({ ...note, content: decryptedNotes[note.id], is_encrypted: 1 });
        setShowAddNote(true);
      } else {
        setTargetNoteId(note.id);
        setPasswordAction('edit_decrypt');
        setShowPasswordModal(true);
      }
    } else {
      setEditingNote(note);
      setNewNote(note);
      setShowAddNote(true);
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Notes & Documentation</h3>
          <p className="text-sm text-gray-600">Keep track of ideas, requirements, and decisions</p>
        </div>
        <button onClick={() => setShowAddNote(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center space-x-2 transition-colors">
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Add Note</span>
        </button>
      </div>

      <div className="relative">
        <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search notes..."
          className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredNotes.map((note) => (
            <motion.div
              key={note.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`bg-white rounded-lg border shadow-sm flex flex-col ${note.is_pinned === 1 ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-200'}`}
            >
              <div className="p-5 flex-1">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiFileText} className={`w-5 h-5 ${note.is_pinned === 1 ? 'text-blue-500' : 'text-gray-400'}`} />
                    <h4 className="font-medium text-gray-900 line-clamp-1">{note.title}</h4>
                  </div>
                  {note.is_shared === 1 && (
                    <span className="bg-green-100 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-medium">Shared</span>
                  )}
                </div>
                
                <div className="mb-4">
                  {note.is_encrypted === 1 ? (
                    decryptedNotes[note.id] ? (
                      <p className="text-gray-600 text-sm line-clamp-4 whitespace-pre-wrap">{decryptedNotes[note.id]}</p>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-24 bg-gray-50 rounded-md border border-dashed border-gray-200">
                        <SafeIcon icon={FiLock} className="w-6 h-6 text-gray-400 mb-2" />
                        <button onClick={() => { setTargetNoteId(note.id); setPasswordAction('decrypt'); setShowPasswordModal(true); }} className="text-xs text-blue-600 hover:underline">Decrypt to View</button>
                      </div>
                    )
                  ) : (
                    <p className="text-gray-600 text-sm line-clamp-4 whitespace-pre-wrap">{note.content}</p>
                  )}
                </div>
              </div>

              <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-lg">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">{new Date(note.updated_at || note.created_at).toLocaleDateString()}</span>
                <div className="flex items-center space-x-3">
                  <button onClick={() => handleShareToggle(note)} className={`${note.is_shared === 1 ? 'text-green-600' : 'text-gray-400'} hover:text-blue-600 transition-colors`} title="Share Note">
                    <SafeIcon icon={FiShare2} className="w-4 h-4" />
                  </button>
                  <button onClick={() => initiateEdit(note)} className="text-gray-400 hover:text-blue-600 transition-colors">
                    <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteNote(note.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Share Modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[70] p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Share Note</h3>
              <button onClick={() => setShowShareModal(false)} className="text-gray-400 hover:text-gray-600"><SafeIcon icon={FiX} className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-600 mb-4">Anyone with this link can view the note {newNote.is_encrypted === 1 ? '(password required)' : ''}.</p>
            <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg border border-gray-200 mb-6">
              <input readOnly value={`${window.location.origin}/#/shared/note/${newNote.share_token}`} className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-gray-600 truncate" />
              <button onClick={copyShareLink} className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors">
                <SafeIcon icon={copying ? FiCheck : FiCopy} className="w-4 h-4" />
              </button>
            </div>
            <button onClick={() => setShowShareModal(false)} className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Done</button>
          </motion.div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="text-lg font-semibold text-gray-900">{editingNote ? 'Edit Note' : 'New Note'}</h3>
              <button onClick={resetForm} className="text-gray-400 hover:text-gray-600"><SafeIcon icon={FiX} className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 flex-1 overflow-y-auto">
              <input type="text" value={newNote.title} onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))} placeholder="Note Title" className="w-full text-xl font-bold placeholder-gray-400 border-none focus:ring-0 p-0" />
              <div className="flex items-center space-x-4 text-sm">
                <label className="flex items-center space-x-2 cursor-pointer text-gray-600">
                  <input type="checkbox" checked={newNote.is_pinned === 1} onChange={(e) => setNewNote(prev => ({ ...prev, is_pinned: e.target.checked ? 1 : 0 }))} className="rounded border-gray-300 text-blue-600" />
                  <span>Pin to top</span>
                </label>
                <button onClick={() => { if(newNote.is_encrypted) { setNewNote(p => ({...p, is_encrypted: 0})); setEncryptionPassword(''); } else { setPasswordAction('encrypt'); setShowPasswordModal(true); } }} className={`flex items-center space-x-1 px-2 py-1 rounded transition-colors ${newNote.is_encrypted === 1 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  <SafeIcon icon={newNote.is_encrypted === 1 ? FiLock : FiUnlock} className="w-3 h-3" />
                  <span>{newNote.is_encrypted === 1 ? 'Encrypted' : 'Encrypt'}</span>
                </button>
              </div>
              <textarea value={newNote.content} onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))} placeholder="Start typing..." className="w-full h-64 resize-none border-none focus:ring-0 p-0 text-gray-700 leading-relaxed" />
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end space-x-3">
              <button onClick={resetForm} className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
              <button onClick={handleSaveNote} disabled={!newNote.title} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2 disabled:opacity-50">
                <SafeIcon icon={FiSave} className="w-4 h-4" />
                <span>Save Note</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
            <div className="text-center mb-6">
              <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                <SafeIcon icon={FiLock} className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900">{passwordAction === 'encrypt' ? 'Set Note Password' : 'Unlock Note'}</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{passwordAction === 'encrypt' ? 'Create a password to secure this note.' : 'Enter the password to view the content.'}</p>
            </div>
            <input type="password" value={encryptionPassword} onChange={(e) => setEncryptionPassword(e.target.value)} placeholder="Password" className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 mb-6" autoFocus />
            <div className="flex space-x-3">
              <button onClick={() => { setShowPasswordModal(false); setEncryptionPassword(''); }} className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={handleEncryptionAction} className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Confirm</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NotesSection;