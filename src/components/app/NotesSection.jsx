import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { supabase } from '../../supabase/supabase';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { 
  FiPlus, FiSearch, FiEdit3, FiTrash2, FiPin, FiTag, FiCalendar, 
  FiMessageSquare, FiBug, FiLightbulb, FiStar, FiFilter, FiX, FiSave,
  FiClock, FiPaperclip, FiArchive
} = FiIcons;

const NotesSection = ({ appId }) => {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddNote, setShowAddNote] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    note_type: 'general',
    tags: [],
    is_pinned: false
  });
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    if (appId) fetchNotes();
  }, [appId]);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('app_notes')
        .select('*')
        .eq('app_id', appId)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveNote = async () => {
    try {
      const noteData = {
        ...newNote,
        app_id: appId,
        user_id: (await supabase.auth.getUser()).data.user.id
      };

      let result;
      if (editingNote) {
        result = await supabase
          .from('app_notes')
          .update(noteData)
          .eq('id', editingNote.id)
          .select();
      } else {
        result = await supabase
          .from('app_notes')
          .insert([noteData])
          .select();
      }

      if (result.error) throw result.error;
      
      fetchNotes();
      setShowAddNote(false);
      setEditingNote(null);
      setNewNote({
        title: '',
        content: '',
        note_type: 'general',
        tags: [],
        is_pinned: false
      });
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (confirm('Are you sure you want to delete this note?')) {
      try {
        await supabase.from('app_notes').delete().eq('id', noteId);
        fetchNotes();
      } catch (error) {
        console.error('Error deleting note:', error);
      }
    }
  };

  const handleTogglePin = async (note) => {
    try {
      await supabase
        .from('app_notes')
        .update({ is_pinned: !note.is_pinned })
        .eq('id', note.id);
      fetchNotes();
    } catch (error) {
      console.error('Error toggling pin:', error);
    }
  };

  const addTag = (tag) => {
    if (tag && !newNote.tags.includes(tag)) {
      setNewNote(prev => ({ ...prev, tags: [...prev.tags, tag] }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove) => {
    setNewNote(prev => ({ ...prev, tags: prev.tags.filter(tag => tag !== tagToRemove) }));
  };

  const getNoteTypeIcon = (type) => {
    switch (type) {
      case 'bug': return FiBug;
      case 'feature': return FiStar;
      case 'idea': return FiLightbulb;
      default: return FiMessageSquare;
    }
  };

  const getNoteTypeColor = (type) => {
    switch (type) {
      case 'bug': return 'bg-red-100 text-red-800 border-red-200';
      case 'feature': return 'bg-green-100 text-green-800 border-green-200';
      case 'idea': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-blue-100 text-blue-800 border-blue-200';
    }
  };

  const filteredNotes = notes.filter(note => {
    const matchesSearch = note.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         note.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterType === 'all' || note.note_type === filterType;
    return matchesSearch && matchesFilter;
  });

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
          <h3 className="text-lg font-semibold text-gray-900">Notes & Documentation</h3>
          <p className="text-sm text-gray-600">Keep track of important information and ideas</p>
        </div>
        <button
          onClick={() => setShowAddNote(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Add Note</span>
        </button>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="relative flex-1">
          <SafeIcon icon={FiSearch} className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes..."
            className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center space-x-2">
          <SafeIcon icon={FiFilter} className="w-4 h-4 text-gray-400" />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Types</option>
            <option value="general">General</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="idea">Idea</option>
          </select>
        </div>
      </div>

      {/* Notes List */}
      <div className="space-y-4">
        {filteredNotes.map((note) => (
          <motion.div
            key={note.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`bg-white p-4 rounded-lg border ${note.is_pinned ? 'border-yellow-200 bg-yellow-50' : 'border-gray-200'} shadow-sm`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start space-x-3">
                <button 
                  onClick={() => handleTogglePin(note)}
                  className={`mt-1 ${note.is_pinned ? 'text-yellow-600' : 'text-gray-400'} hover:text-yellow-600 transition-colors`}
                >
                  <SafeIcon icon={FiPin} className="w-4 h-4" />
                </button>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="font-medium text-gray-900">{note.title}</h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getNoteTypeColor(note.note_type)}`}>
                      {note.note_type}
                    </span>
                  </div>
                  <p className="text-gray-600 text-sm mb-3">{note.content}</p>
                  
                  {/* Tags */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {note.tags.map((tag, index) => (
                        <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md flex items-center space-x-1">
                          <SafeIcon icon={FiTag} className="w-3 h-3" />
                          <span>{tag}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center space-x-4 text-xs text-gray-500">
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiCalendar} className="w-3 h-3" />
                      <span>{new Date(note.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <SafeIcon icon={FiClock} className="w-3 h-3" />
                      <span>Updated {new Date(note.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => {
                    setEditingNote(note);
                    setNewNote({
                      title: note.title,
                      content: note.content,
                      note_type: note.note_type,
                      tags: note.tags || [],
                      is_pinned: note.is_pinned
                    });
                    setShowAddNote(true);
                  }}
                  className="text-gray-400 hover:text-blue-600 transition-colors"
                >
                  <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => handleDeleteNote(note.id)}
                  className="text-gray-400 hover:text-red-600 transition-colors"
                >
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {filteredNotes.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <SafeIcon icon={FiMessageSquare} className="w-6 h-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No notes found</h3>
          <p className="text-gray-600 mb-4">Start documenting important information about your app</p>
          <button
            onClick={() => setShowAddNote(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Your First Note
          </button>
        </div>
      )}

      {/* Add/Edit Note Modal */}
      {showAddNote && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingNote ? 'Edit Note' : 'Add New Note'}
              </h3>
              <button
                onClick={() => {
                  setShowAddNote(false);
                  setEditingNote(null);
                  setNewNote({
                    title: '',
                    content: '',
                    note_type: 'general',
                    tags: [],
                    is_pinned: false
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input
                  type="text"
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Note title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newNote.note_type}
                  onChange={(e) => setNewNote(prev => ({ ...prev, note_type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="general">General</option>
                  <option value="bug">Bug Report</option>
                  <option value="feature">Feature Request</option>
                  <option value="idea">Idea</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                <textarea
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Write your note content here..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
                <div className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTag(tagInput);
                      }
                    }}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Add tags..."
                  />
                  <button
                    onClick={() => addTag(tagInput)}
                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {newNote.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {newNote.tags.map((tag, index) => (
                      <span key={index} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-sm flex items-center space-x-1">
                        <span>{tag}</span>
                        <button
                          onClick={() => removeTag(tag)}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <SafeIcon icon={FiX} className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="pin-note"
                  checked={newNote.is_pinned}
                  onChange={(e) => setNewNote(prev => ({ ...prev, is_pinned: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="pin-note" className="ml-2 text-sm text-gray-700">
                  Pin this note
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddNote(false);
                  setEditingNote(null);
                  setNewNote({
                    title: '',
                    content: '',
                    note_type: 'general',
                    tags: [],
                    is_pinned: false
                  });
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveNote}
                disabled={!newNote.title || !newNote.content}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <SafeIcon icon={FiSave} className="w-4 h-4 inline mr-2" />
                {editingNote ? 'Update Note' : 'Save Note'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default NotesSection;