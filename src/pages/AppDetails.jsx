import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { apps as appsApi, pricingPlans as plansApi, sales as salesApi } from '../services/dataLayer';
import { toastError, toastSuccess } from '../components/common/Toast';
import FallbackBadge from '../components/common/FallbackBadge';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

// Import Section Components
import NotesSection from '../components/app/NotesSection';
import TasksSection from '../components/app/TasksSection';
import VersionsSection from '../components/app/VersionsSection';
import BackupsSection from '../components/app/BackupsSection';
import WorkflowsSection from '../components/app/WorkflowsSection';
import MarketingSection from '../components/app/MarketingSection';

const {
  FiArrowLeft, FiEdit3, FiGithub, FiGlobe, FiDollarSign, FiUsers, 
  FiTrendingUp, FiCode, FiImage, FiFileText, FiExternalLink, FiPlus, 
  FiTrash2, FiSave, FiX, FiLoader, FiMessageSquare, FiTarget, 
  FiPackage, FiHardDrive, FiZap, FiMaximize2, FiCheck, FiAlertTriangle
} = FiIcons;

const AppDetails = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState(null);
  const [pricingPlans, setPricingPlans] = useState([]);
  const [sales, setSales] = useState([]);
  const [error, setError] = useState(null);
  const editSnapshotRef = useRef(null);

  // Tech Stack State
  const [showAddTech, setShowAddTech] = useState(false);
  const [newTech, setNewTech] = useState('');

  // Pricing State
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [planForm, setPlanForm] = useState({ name: '', price: '', features: '' });

  // Sales State
  const [showSalesModal, setShowSalesModal] = useState(false);
  const [editingSale, setEditingSale] = useState(null);
  const [saleForm, setSaleForm] = useState({ customer_name: '', plan_name: '', amount: '', status: 'Completed', date: '' });

  useEffect(() => {
    if (id) fetchAppDetails();
  }, [id]);

  const fetchAppDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const app = await appsApi.get(id);
      if (!app) throw new Error('Application not found');

      setAppData(app);

      const [plans, salesRows] = await Promise.all([
        plansApi.list(id),
        salesApi.list(id),
      ]);

      setPricingPlans(plans);
      setSales(salesRows);
    } catch (err) {
      console.error('Error fetching app details:', err);
      setError(err.message);
      toastError(err.message);
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

  const startEditing = () => {
    editSnapshotRef.current = { ...appData };
    setIsEditing(true);
  };

  const cancelEditing = () => {
    if (editSnapshotRef.current) {
      setAppData(editSnapshotRef.current);
    }
    editSnapshotRef.current = null;
    setIsEditing(false);
  };

  const handleSaveApp = async () => {
    try {
      await appsApi.update(id, {
        name: appData.name,
        description: appData.description,
        domain: appData.domain,
        repository: appData.repository,
      });
      setIsEditing(false);
      editSnapshotRef.current = null;
      toastSuccess('App updated');
      fetchAppDetails();
    } catch (err) {
      console.error('Error updating app:', err);
    }
  };

  // --- Tech Stack Handlers ---
  const handleAddTech = async () => {
    if (!newTech.trim()) return;
    try {
      const currentStack = Array.isArray(appData.tech_stack) ? appData.tech_stack : [];
      const updatedStack = [...currentStack, newTech.trim()];
      await appsApi.update(id, { tech_stack: updatedStack });
      setAppData({ ...appData, tech_stack: updatedStack });
      setNewTech('');
      setShowAddTech(false);
      toastSuccess('Tech stack updated');
    } catch (err) {
      console.error('Error adding tech:', err);
    }
  };

  const handleRemoveTech = async (techToRemove) => {
    if (!confirm(`Remove ${techToRemove}?`)) return;
    try {
      const currentStack = Array.isArray(appData.tech_stack) ? appData.tech_stack : [];
      const updatedStack = currentStack.filter((t) => t !== techToRemove);
      await appsApi.update(id, { tech_stack: updatedStack });
      setAppData({ ...appData, tech_stack: updatedStack });
      toastSuccess('Tech removed');
    } catch (err) {
      console.error('Error removing tech:', err);
    }
  };

  // --- Pricing Handlers ---
  const handleSavePlan = async () => {
    try {
      if (!planForm.name?.trim()) {
        toastError('Plan name is required');
        return;
      }
      const featuresArray = String(planForm.features || '')
        .split('\n')
        .map((f) => f.trim())
        .filter(Boolean);
      await plansApi.save(
        id,
        {
          name: planForm.name.trim(),
          price: planForm.price === '' ? 0 : planForm.price,
          features: featuresArray,
        },
        editingPlan?.id || null
      );

      toastSuccess(editingPlan ? 'Plan updated' : 'Plan created');
      fetchAppDetails();
      setShowPricingModal(false);
      setEditingPlan(null);
      setPlanForm({ name: '', price: '', features: '' });
    } catch (err) {
      console.error('Error saving plan:', err);
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('Are you sure you want to delete this plan?')) return;
    try {
      await plansApi.remove(planId);
      setPricingPlans((prev) => prev.filter((p) => p.id !== planId));
      toastSuccess('Plan deleted');
    } catch (err) {
      console.error('Error deleting plan:', err);
    }
  };

  // --- Sales Handlers ---
  const handleSaveSale = async () => {
    try {
      if (!saleForm.customer_name?.trim()) {
        toastError('Customer name is required');
        return;
      }
      if (saleForm.amount === '' || Number.isNaN(Number(saleForm.amount))) {
        toastError('Enter a valid amount');
        return;
      }
      await salesApi.save(
        id,
        {
          customer_name: saleForm.customer_name.trim(),
          plan_name: saleForm.plan_name,
          amount: saleForm.amount,
          status: saleForm.status,
          date: saleForm.date || undefined,
          _stored_as_note: Boolean(editingSale?._stored_as_note),
        },
        editingSale?.id || null
      );

      toastSuccess(editingSale ? 'Sale updated' : 'Sale recorded');
      fetchAppDetails();
      setShowSalesModal(false);
      setEditingSale(null);
      setSaleForm({ customer_name: '', plan_name: '', amount: '', status: 'Completed', date: '' });
    } catch (err) {
      console.error('Error saving sale:', err);
    }
  };

  const handleDeleteSale = async (saleId) => {
    if (!confirm('Delete this sale record?')) return;
    try {
      const sale = sales.find((s) => String(s.id) === String(saleId));
      await salesApi.remove(saleId, { storedAsNote: Boolean(sale?._stored_as_note) });
      setSales((prev) => prev.filter((s) => s.id !== saleId));
      toastSuccess('Sale deleted');
    } catch (err) {
      console.error('Error deleting sale:', err);
    }
  };

  const TabButton = ({ tab, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
        isActive
          ? 'bg-gradient-to-br from-brand-50 to-teal-50 text-brand-800 shadow-soft ring-1 ring-brand-100'
          : 'text-ink-500 hover:text-ink-900 hover:bg-white/70'
      }`}
    >
      <SafeIcon icon={tab.icon} className="w-4 h-4" />
      <span>{tab.label}</span>
    </button>
  );

  // --- RENDER FUNCTIONS ---

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">App Information</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                {isEditing ? (
                  <input
                    type="text"
                    value={appData?.name || ''}
                    onChange={(e) => setAppData({ ...appData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                ) : (
                  <p className="text-gray-900">{appData?.name}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                {isEditing ? (
                  <textarea
                    value={appData?.description || ''}
                    onChange={(e) => setAppData({ ...appData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                ) : (
                  <p className="text-gray-600">{appData?.description}</p>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={appData?.domain || ''}
                      onChange={(e) => setAppData({ ...appData, domain: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  ) : (
                    <a href={appData?.domain ? `https://${appData.domain}` : '#'} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 flex items-center space-x-1">
                      <span>{appData?.domain || 'N/A'}</span>
                      <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={appData?.repository || ''}
                      onChange={(e) => setAppData({ ...appData, repository: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    />
                  ) : (
                    <a href={appData?.repository || '#'} target="_blank" rel="noopener noreferrer" className="text-brand-700 hover:text-brand-800 flex items-center space-x-1">
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
                  onClick={handleSaveApp}
                  className="bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-1"
                >
                  <SafeIcon icon={FiSave} className="w-4 h-4" />
                  <span>Save</span>
                </button>
                <button
                  onClick={cancelEditing}
                  className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <SafeIcon icon={FiX} className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={startEditing}
                className="bg-gray-100 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors flex items-center space-x-1"
              >
                <SafeIcon icon={FiEdit3} className="w-4 h-4" />
                <span>Edit</span>
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="panel p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiUsers} className="w-5 h-5 text-brand-700" />
            </div>
            <div>
              <p className="page-title">{(appData?.users_count || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Active Users</p>
            </div>
          </div>
        </div>
        <div className="panel p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiDollarSign} className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="page-title">${(appData?.revenue || 0).toLocaleString()}</p>
              <p className="text-sm text-gray-600">Monthly Revenue</p>
            </div>
          </div>
        </div>
        <div className="panel p-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <SafeIcon icon={FiTrendingUp} className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="page-title">+{appData?.growth_rate || 0}%</p>
              <p className="text-sm text-gray-600">Growth Rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTechStack = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Technology Stack</h3>
          {!showAddTech && (
            <button 
              onClick={() => setShowAddTech(true)}
              className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors flex items-center space-x-1"
            >
              <SafeIcon icon={FiPlus} className="w-4 h-4" />
              <span>Add Technology</span>
            </button>
          )}
        </div>
        
        {showAddTech && (
          <div className="flex items-center space-x-2 mb-4 bg-gray-50 p-4 rounded-lg">
            <input
              type="text"
              value={newTech}
              onChange={(e) => setNewTech(e.target.value)}
              placeholder="e.g. Redis, Node.js"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              onKeyPress={(e) => e.key === 'Enter' && handleAddTech()}
            />
            <button 
              onClick={handleAddTech}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700"
            >
              Add
            </button>
            <button 
              onClick={() => { setShowAddTech(false); setNewTech(''); }}
              className="text-gray-500 hover:text-gray-700 px-3 py-2"
            >
              Cancel
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {(appData?.tech_stack || []).map((tech, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between group hover:border-brand-200 transition-colors">
              <span className="font-medium text-gray-900">{tech}</span>
              <button 
                onClick={() => handleRemoveTech(tech)}
                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          ))}
          {(!appData?.tech_stack || appData.tech_stack.length === 0) && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No technologies listed yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderPricing = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Pricing Plans</h3>
          <button 
            onClick={() => {
              setEditingPlan(null);
              setPlanForm({ name: '', price: '', features: '' });
              setShowPricingModal(true);
            }}
            className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors flex items-center space-x-1"
          >
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Add Plan</span>
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {pricingPlans.map((plan) => {
            let features = [];
            try {
              features = typeof plan.features === 'string' ? JSON.parse(plan.features) : (plan.features || []);
            } catch (e) {
              features = [];
            }
            return (
              <div key={plan.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                <div className="text-center mb-4">
                  <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                  <div className="mt-2">
                    <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                    <span className="text-gray-600">/month</span>
                  </div>
                </div>
                <ul className="space-y-2 mb-6 min-h-[100px]">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm text-gray-600">
                      <SafeIcon icon={FiCheck} className="w-4 h-4 text-green-500 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="flex items-center space-x-2 border-t pt-4">
                  <button 
                    onClick={() => {
                      setEditingPlan(plan);
                      setPlanForm({ 
                        name: plan.name, 
                        price: plan.price, 
                        features: (features).join('\n') 
                      });
                      setShowPricingModal(true);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Edit Plan
                  </button>
                  <button 
                    onClick={() => handleDeletePlan(plan.id)}
                    className="text-gray-400 hover:text-red-500 p-2 transition-colors"
                  >
                    <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
          {pricingPlans.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
              No pricing plans yet. Add one to get started.
            </div>
          )}
        </div>
      </div>

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{editingPlan ? 'Edit Plan' : 'Add New Plan'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input 
                  type="text" 
                  value={planForm.name}
                  onChange={(e) => setPlanForm({...planForm, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Pro, Enterprise"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price ($)</label>
                <input 
                  type="number" 
                  value={planForm.price}
                  onChange={(e) => setPlanForm({...planForm, price: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="29.00"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Features (one per line)</label>
                <textarea 
                  rows={5}
                  value={planForm.features}
                  onChange={(e) => setPlanForm({...planForm, features: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="Unlimited Users&#10;Advanced Analytics&#10;24/7 Support"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowPricingModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSavePlan} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderSales = () => (
    <div className="space-y-6">
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sales</h3>
          <button 
            onClick={() => {
              setEditingSale(null);
              setSaleForm({ customer_name: '', plan_name: '', amount: '', status: 'Completed', date: new Date().toISOString().split('T')[0] });
              setShowSalesModal(true);
            }}
            className="bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg hover:bg-brand-100 transition-colors flex items-center space-x-1"
          >
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
                  <td className="py-3 px-4 text-gray-900 font-medium">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span>{sale.customer_name}</span>
                      {sale._stored_as_note && <FallbackBadge />}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-gray-600">{sale.plan_name}</td>
                  <td className="py-3 px-4 font-medium text-gray-900">${sale.amount}</td>
                  <td className="py-3 px-4 text-gray-600">
                    {(() => {
                      try {
                        const d = sale.date instanceof Date ? sale.date : new Date(sale.date);
                        return Number.isNaN(d.getTime()) ? String(sale.date || '—') : d.toLocaleDateString();
                      } catch {
                        return String(sale.date || '—');
                      }
                    })()}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                      sale.status === 'Completed' ? 'bg-green-100 text-green-800' :
                      sale.status === 'Refunded' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sale.status}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={() => {
                          setEditingSale(sale);
                          setSaleForm({
                            customer_name: sale.customer_name,
                            plan_name: sale.plan_name,
                            amount: sale.amount,
                            status: sale.status,
                            date: new Date(sale.date).toISOString().split('T')[0]
                          });
                          setShowSalesModal(true);
                        }}
                        className="text-brand-700 hover:text-brand-800 text-sm"
                      >
                        Edit
                      </button>
                      <button 
                        onClick={() => handleDeleteSale(sale.id)}
                        className="text-gray-400 hover:text-red-600 p-1"
                      >
                        <SafeIcon icon={FiTrash2} className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sales.length === 0 && (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-500">No sales recorded yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sales Modal */}
      {showSalesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">{editingSale ? 'Edit Sale' : 'Record Sale'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                <input 
                  type="text" 
                  value={saleForm.customer_name}
                  onChange={(e) => setSaleForm({...saleForm, customer_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                <input 
                  type="text" 
                  value={saleForm.plan_name}
                  onChange={(e) => setSaleForm({...saleForm, plan_name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Pro Plan"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount ($)</label>
                  <input 
                    type="number" 
                    value={saleForm.amount}
                    onChange={(e) => setSaleForm({...saleForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    value={saleForm.status}
                    onChange={(e) => setSaleForm({...saleForm, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                  >
                    <option value="Completed">Completed</option>
                    <option value="Pending">Pending</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input 
                  type="date" 
                  value={saleForm.date}
                  onChange={(e) => setSaleForm({...saleForm, date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowSalesModal(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSaveSale} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Sale</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'tasks': return <TasksSection appId={id} />;
      case 'notes': return <NotesSection appId={id} />;
      case 'tech': return renderTechStack();
      case 'marketing': return <MarketingSection appId={id} />;
      case 'workflows': return <WorkflowsSection appId={id} />;
      case 'versions': return <VersionsSection appId={id} />;
      case 'backups': return <BackupsSection appId={id} />;
      case 'sales': return renderSales();
      case 'pricing': return renderPricing();
      default: return renderOverview();
    }
  };

  if (loading) return (
    <div className="p-6 flex flex-col justify-center items-center h-64 space-y-4">
      <SafeIcon icon={FiLoader} className="w-8 h-8 animate-spin text-brand-700" />
      <p className="text-gray-500 animate-pulse">Loading app details...</p>
    </div>
  );
  
  if (error || !appData) return (
    <div className="p-6 flex flex-col items-center justify-center min-h-[50vh] text-center">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
        <SafeIcon icon={FiAlertTriangle} className="w-8 h-8 text-red-600" />
      </div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">App Not Found</h2>
      <p className="text-gray-600 mb-6">{error || 'The application you are looking for does not exist or you do not have permission to view it.'}</p>
      <Link to="/apps" className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
        Back to My Apps
      </Link>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="page-shell"
    >
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/apps"
            className="p-2.5 hover:bg-white/80 rounded-xl border border-transparent hover:border-ink-100 transition-colors"
          >
            <SafeIcon icon={FiArrowLeft} className="w-5 h-5 text-ink-600" />
          </Link>
          <div>
            <h1 className="page-title">{appData?.name}</h1>
            <p className="page-subtitle !mt-1">{appData?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${
            appData?.status === 'Active' ? 'badge-success' : 'badge-warning'
          }`}>
            {appData?.status}
          </span>
          {appData?.landing_page && (
            <a
              href={appData.landing_page}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-secondary"
            >
              <SafeIcon icon={FiGlobe} className="w-4 h-4" />
              <span>Visit Site</span>
            </a>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="panel p-1.5 overflow-x-auto">
        <nav className="flex gap-1 min-w-max">
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
      <div className="min-h-[50vh]">
        {renderTabContent()}
      </div>
    </motion.div>
  );
};

export default AppDetails;