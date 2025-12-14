import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase/supabase';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

// Import Section Components
import NotesSection from '../components/app/NotesSection';
import TasksSection from '../components/app/TasksSection';
import VersionsSection from '../components/app/VersionsSection';
import BackupsSection from '../components/app/BackupsSection';
import WorkflowsSection from '../components/app/WorkflowsSection';

const { 
  FiArrowLeft, FiEdit3, FiGithub, FiGlobe, FiDollarSign, FiUsers,
  FiTrendingUp, FiCode, FiImage, FiFileText, FiExternalLink, FiPlus, 
  FiTrash2, FiSave, FiX, FiLoader, FiMessageSquare, FiTarget, 
  FiPackage, FiHardDrive, FiZap, FiMaximize2
} = FiIcons;

const AppDetails = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [marketingMaterials, setMarketingMaterials] = useState([]);
  const [sales, setSales] = useState([]);
  
  // State for Document Editor
  const [editingDocument, setEditingDocument] = useState(null);
  const [documentContent, setDocumentContent] = useState('');

  useEffect(() => {
    if (id) fetchAppDetails();
  }, [id]);

  const fetchAppDetails = async () => {
    try {
      // Fetch App
      const { data: app, error: appError } = await supabase
        .from('apps')
        .select('*')
        .eq('id', id)
        .single();
      
      if (appError) throw appError;

      // Fetch related data
      const { data: plans } = await supabase.from('pricing_plans').select('*').eq('app_id', id);
      const { data: materials } = await supabase.from('marketing_materials').select('*').eq('app_id', id);
      const { data: salesData } = await supabase.from('sales').select('*').eq('app_id', id);

      setAppData(app);
      setPricingPlans(plans || []);
      setMarketingMaterials(materials || []);
      setSales(salesData || []);
    } catch (error) {
      console.error('Error fetching app details:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiTrendingUp },
    { id: 'tasks', label: 'Tasks', icon: FiTarget },
    { id: 'notes', label: 'Notes', icon: FiMessageSquare },
    { id: 'tech', label: 'Tech Stack', icon: FiCode },
    { id: 'marketing', label: 'Marketing', icon: FiImage },
    { id: 'workflows', label: 'Workflows', icon: FiZap },
    { id: 'versions', label: 'Versions', icon: FiPackage },
    { id: 'backups', label: 'Backups', icon: FiHardDrive },
    { id: 'sales', label: 'Sales', icon: FiUsers },
    { id: 'pricing', label: 'Pricing', icon: FiDollarSign },
  ];

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('apps')
        .update({
          name: appData.name,
          description: appData.description,
          domain: appData.domain,
          repository: appData.repository
        })
        .eq('id', id);
      
      if (error) throw error;
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating app:', error);
    }
  };

  const handleSaveDocument = async () => {
    try {
      const { error } = await supabase
        .from('marketing_materials')
        .update({ content: documentContent })
        .eq('id', editingDocument.id);

      if (error) throw error;
      
      // Update local state
      setMarketingMaterials(prev => prev.map(m => 
        m.id === editingDocument.id ? { ...m, content: documentContent } : m
      ));
      
      setEditingDocument(null);
      setDocumentContent('');
    } catch (error) {
      console.error('Error saving document:', error);
    }
  };

  const TabButton = ({ tab, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <SafeIcon icon={tab.icon} className="w-4 h-4" />
      <span>{tab.label}</span>
    </button>
  );

  // Render Functions for existing tabs
  const renderOverview = () => (
    <div className="space-y-6">
      {/* App Info */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">App Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={appData.name}
                    onChange={(e) => setAppData({...appData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-900">{appData.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={appData.description || ''}
                    onChange={(e) => setAppData({...appData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                ) : (
                  <p className="text-gray-600">{appData.description}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={appData.domain || ''}
                      onChange={(e) => setAppData({...appData, domain: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <a href={`https://${appData.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                      <span>{appData.domain || 'N/A'}</span>
                      <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={appData.repository || ''}
                      onChange={(e) => setAppData({...appData, repository: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <a href={appData.repository} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                      <SafeIcon icon={FiGithub} className="w-4 h-4" />
                      <span>View Repository</span>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div className="ml-4">
            {isEditing ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSave}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                >
                  <SafeIcon icon={FiSave} className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={() => setIsEditing(false)}
                  className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <SafeIcon icon={FiX} className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
              >
                <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiUsers} className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{(appData.users_count || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Active Users</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">${(appData.revenue || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiTrendingUp} className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">+{appData.growth_rate || 0}%</p>
              <p className="text-sm text-gray-600">Growth Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTechStack = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Technology Stack</h3>
          <button className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1">
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Technology</span>
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {appData.tech_stack && appData.tech_stack.map((tech, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
              <span className="font-medium text-gray-900">{tech}</span>
              <button className="text-gray-400 hover:text-red-500 transition-colors">
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Pricing Plans</h3>
          <button className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1">
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Plan</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan) => (
            <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>
              <ul className="space-y-2 mb-6">
                {plan.features && plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <div className="flex items-center space-x-2">
                <button className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium">
                  Edit Plan
                </button>
                <button className="text-gray-400 hover:text-red-500 p-2 transition-colors">
                  <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderMarketing = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Marketing & Specifications</h3>
          <button className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1">
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Asset</span>
          </button>
        </div>
        
        {/* Document Editor Modal */}
        <AnimatePresence>
          {editingDocument && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white rounded-lg p-6 w-full max-w-4xl h-[80vh] flex flex-col mx-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">{editingDocument.name}</h3>
                  <button onClick={() => setEditingDocument(null)} className="text-gray-400 hover:text-gray-600">
                    <SafeIcon icon={FiX} className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 mb-4">
                  <textarea
                    value={documentContent}
                    onChange={(e) => setDocumentContent(e.target.value)}
                    className="w-full h-full p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                    placeholder="Enter content here (Markdown supported)..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button onClick={() => setEditingDocument(null)} className="px-4 py-2 text-gray-600 hover:text-gray-800">Cancel</button>
                  <button onClick={handleSaveDocument} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">Save Changes</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {marketingMaterials.map((material) => (
            <div key={material.id} className="border border-gray-200 rounded-lg overflow-hidden flex flex-col">
              {material.type === 'image' ? (
                <img src={material.url} alt={material.name} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 bg-gray-50 flex items-center justify-center border-b border-gray-100">
                  <SafeIcon icon={FiFileText} className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="p-4 flex-1 flex flex-col">
                <h4 className="font-medium text-gray-900 mb-1">{material.name}</h4>
                {material.description && <p className="text-xs text-gray-500 mb-3">{material.description}</p>}
                
                <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-50">
                  <span className="text-xs text-gray-500 uppercase">{material.type}</span>
                  <div className="flex items-center space-x-2">
                    {material.type === 'document' && (
                      <button 
                        onClick={() => {
                          setEditingDocument(material);
                          setDocumentContent(material.content || '');
                        }}
                        className="text-gray-400 hover:text-blue-500 transition-colors"
                        title="Edit Content"
                      >
                        <SafeIcon icon={FiMaximize2} className="w-4 h-4" />
                      </button>
                    )}
                    {material.url && (
                      <a href={material.url} target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-blue-500 transition-colors">
                        <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                      </a>
                    )}
                    <button className="text-gray-400 hover:text-red-500 transition-colors">
                      <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
          <button className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1">
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Sale</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-700">Customer</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Plan</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Amount</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Date</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{sale.customer_name}</td>
                  <td className="py-3 px-4 text-gray-600">{sale.plan_name}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">${sale.amount}</td>
                  <td className="py-3 px-4 text-gray-600">{new Date(sale.date).toLocaleDateString()}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button className="text-blue-600 hover:text-blue-700 text-sm">View</button>
                      <button className="text-gray-600 hover:text-gray-700 text-sm">Edit</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'tasks': return <TasksSection appId={id} />;
      case 'notes': return <NotesSection appId={id} />;
      case 'tech': return renderTechStack();
      case 'marketing': return renderMarketing();
      case 'workflows': return <WorkflowsSection appId={id} />;
      case 'versions': return <VersionsSection appId={id} />;
      case 'backups': return <BackupsSection appId={id} />;
      case 'sales': return renderSales();
      case 'pricing': return renderPricing();
      default: return renderOverview();
    }
  };

  if (loading) return <div className="p-6 flex justify-center"><SafeIcon icon={FiLoader} className="w-8 h-8 animate-spin text-blue-600"/></div>;
  if (!appData) return <div className="p-6">App not found</div>;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/apps"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <SafeIcon icon={FiArrowLeft} className="w-5 h-5 text-gray-600" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{appData.name}</h1>
            <p className="text-gray-600">{appData.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${appData.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
            {appData.status}
          </span>
          {appData.landing_page && (
            <a
              href={appData.landing_page}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
            >
              <SafeIcon icon={FiGlobe} className="w-4 h-4" />
              <span>Visit Site</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
          {tabs.map((tab) => (
            <TabButton
              key={tab.id}
              tab={tab}
              isActive={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
            />
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="min-h-screen">
        {renderTabContent()}
      </div>
    </motion.div>
  );
};

export default AppDetails;