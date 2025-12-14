import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabase/supabase';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const {
  FiPlus, FiEdit3, FiTrash2, FiFileText, FiImage, FiExternalLink, 
  FiMaximize2, FiX, FiSave, FiFolder, FiTag, FiList, FiCheckCircle
} = FiIcons;

const MarketingSection = ({ appId }) => {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [fullScreenItem, setFullScreenItem] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    category: 'General',
    artifact_type: 'Document',
    type: 'document',
    details: '', // string representation for edit
    url: ''
  });

  useEffect(() => {
    if (appId) fetchMaterials();
  }, [appId]);

  const fetchMaterials = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('marketing_materials')
        .select('*')
        .eq('app_id', appId)
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setMaterials(data || []);
    } catch (error) {
      console.error('Error fetching materials:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Try to parse details if it looks like JSON
      let detailsJson = formData.details;
      try {
        if (typeof formData.details === 'string' && (formData.details.startsWith('{') || formData.details.startsWith('['))) {
          detailsJson = JSON.parse(formData.details);
        }
      } catch (e) {
        // Keep as string if parsing fails
      }

      const itemData = {
        app_id: appId,
        name: formData.name,
        category: formData.category,
        artifact_type: formData.artifact_type,
        type: formData.type,
        url: formData.type === 'image' ? formData.url : null,
        details: detailsJson,
        content: typeof detailsJson === 'string' ? detailsJson : JSON.stringify(detailsJson, null, 2)
      };

      if (editingItem) {
        await supabase.from('marketing_materials').update(itemData).eq('id', editingItem.id);
      } else {
        await supabase.from('marketing_materials').insert([itemData]);
      }

      fetchMaterials();
      setShowModal(false);
      setEditingItem(null);
      resetForm();
    } catch (error) {
      console.error('Error saving material:', error);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await supabase.from('marketing_materials').delete().eq('id', id);
        setMaterials(prev => prev.filter(m => m.id !== id));
      } catch (error) {
        console.error('Error deleting material:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      category: 'General',
      artifact_type: 'Document',
      type: 'document',
      details: '',
      url: ''
    });
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'General',
      artifact_type: item.artifact_type || 'Document',
      type: item.type,
      details: typeof item.details === 'object' ? JSON.stringify(item.details, null, 2) : (item.details || item.content || ''),
      url: item.url || ''
    });
    setShowModal(true);
  };

  // Group materials by category
  const groupedMaterials = materials.reduce((acc, item) => {
    const cat = item.category || 'Uncategorized';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  const renderDetailsPreview = (details) => {
    if (!details) return <p className="text-gray-400 italic">No details provided</p>;
    
    if (typeof details === 'string') {
      return <p className="text-sm text-gray-600 line-clamp-3 whitespace-pre-wrap">{details}</p>;
    }

    if (Array.isArray(details)) {
      return (
        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
          {details.slice(0, 3).map((item, i) => (
            <li key={i} className="truncate">
              {typeof item === 'object' ? JSON.stringify(item) : item}
            </li>
          ))}
          {details.length > 3 && <li className="text-xs text-gray-400">+{details.length - 3} more</li>}
        </ul>
      );
    }

    if (typeof details === 'object') {
      return (
        <div className="space-y-2 text-sm">
          {Object.entries(details).slice(0, 3).map(([key, value]) => (
            <div key={key}>
              <span className="font-medium text-gray-700 capitalize">{key.replace(/_/g, ' ')}: </span>
              <span className="text-gray-600">
                {Array.isArray(value) 
                  ? `${value.length} items` 
                  : typeof value === 'object' 
                    ? 'Object' 
                    : String(value).substring(0, 50) + (String(value).length > 50 ? '...' : '')}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return <div className="p-12 text-center text-gray-500">Loading marketing assets...</div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Marketing & Brand Assets</h3>
          <p className="text-sm text-gray-600">Manage your copy, strategies, and creative assets</p>
        </div>
        <button 
          onClick={() => { resetForm(); setShowModal(true); }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <SafeIcon icon={FiPlus} className="w-4 h-4" />
          <span>Add Asset</span>
        </button>
      </div>

      {Object.entries(groupedMaterials).map(([category, items]) => (
        <div key={category} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center space-x-2">
            <SafeIcon icon={FiFolder} className="w-4 h-4 text-gray-500" />
            <h4 className="font-semibold text-gray-800">{category}</h4>
            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
              {items.length}
            </span>
          </div>
          <div className="divide-y divide-gray-100">
            {items.map((item) => (
              <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors group">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-6">
                    <div className="flex items-center space-x-3 mb-2">
                      <h5 className="text-base font-medium text-gray-900">
                        {item.artifact_type || item.name}
                      </h5>
                      {item.original_id && (
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                          {item.original_id}
                        </span>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 rounded-lg p-4 mb-3 border border-gray-100">
                      {renderDetailsPreview(item.details)}
                    </div>

                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <div className="flex items-center space-x-1">
                        <SafeIcon icon={item.type === 'image' ? FiImage : FiFileText} className="w-3 h-3" />
                        <span className="capitalize">{item.type}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <SafeIcon icon={FiTag} className="w-3 h-3" />
                        <span>{item.artifact_type || 'General'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => {
                        setFullScreenItem(item);
                      }}
                       className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                       title="View Full Details"
                    >
                      <SafeIcon icon={FiMaximize2} className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => openEditModal(item)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(item.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      {/* Edit/Add Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingItem ? 'Edit Asset' : 'New Asset'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <SafeIcon icon={FiX} className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <input 
                    type="text" 
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    list="categories"
                  />
                  <datalist id="categories">
                    {Object.keys(groupedMaterials).map(cat => <option key={cat} value={cat} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Artifact Type</label>
                  <input 
                    type="text" 
                    value={formData.artifact_type}
                    onChange={(e) => setFormData({...formData, artifact_type: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name / Title</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Details / Content (JSON or Text)</label>
                <textarea 
                  rows={8}
                  value={formData.details}
                  onChange={(e) => setFormData({...formData, details: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  placeholder='{"key": "value"} or plain text'
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">
                Cancel
              </button>
              <button onClick={handleSave} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
                Save Asset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Viewer */}
      <AnimatePresence>
        {fullScreenItem && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div>
                  <h3 className="font-semibold text-gray-900">{fullScreenItem.artifact_type}</h3>
                  <p className="text-sm text-gray-500">{fullScreenItem.category}</p>
                </div>
                <button onClick={() => setFullScreenItem(null)} className="p-2 hover:bg-gray-200 rounded-full">
                  <SafeIcon icon={FiX} className="w-5 h-5 text-gray-600" />
                </button>
              </div>
              <div className="p-6 overflow-y-auto">
                <pre className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm font-mono whitespace-pre-wrap text-gray-800">
                  {typeof fullScreenItem.details === 'object' 
                    ? JSON.stringify(fullScreenItem.details, null, 2) 
                    : fullScreenItem.details || fullScreenItem.content}
                </pre>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MarketingSection;