import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { 
  FiArrowLeft, FiEdit3, FiGithub, FiGlobe, FiDollarSign, FiUsers,
  FiTrendingUp, FiCode, FiServer, FiDatabase, FiImage, FiFileText,
  FiExternalLink, FiPlus, FiTrash2, FiSave, FiX
} = FiIcons;

const AppDetails = () => {
  const { id } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditing, setIsEditing] = useState(false);

  // Mock app data - in real app, this would be fetched based on ID
  const [appData, setAppData] = useState({
    id: 1,
    name: 'TaskFlow Pro',
    description: 'Advanced task management and productivity suite for teams and individuals',
    status: 'Active',
    techStack: ['React', 'Node.js', 'PostgreSQL', 'Redis', 'AWS'],
    repository: 'https://github.com/username/taskflow-pro',
    domain: 'taskflow.pro',
    landingPage: 'https://taskflow.pro',
    users: 1240,
    revenue: 8420,
    growth: 12.5,
    pricing: [
      { id: 1, name: 'Starter', price: 9, features: ['Up to 5 projects', 'Basic analytics', 'Email support'] },
      { id: 2, name: 'Pro', price: 29, features: ['Unlimited projects', 'Advanced analytics', 'Priority support', 'Team collaboration'] },
      { id: 3, name: 'Enterprise', price: 99, features: ['Custom integrations', 'Dedicated support', 'Advanced security', 'Custom branding'] }
    ],
    marketingMaterials: [
      { id: 1, name: 'Product Logo', type: 'image', url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=200&h=200&fit=crop' },
      { id: 2, name: 'Hero Banner', type: 'image', url: 'https://images.unsplash.com/photo-1551434678-e076c223a692?w=400&h=200&fit=crop' },
      { id: 3, name: 'Product Brochure', type: 'document', url: '#' },
      { id: 4, name: 'Feature Screenshots', type: 'image', url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&h=200&fit=crop' }
    ],
    specifications: {
      features: [
        'Real-time collaboration',
        'Advanced project analytics',
        'Customizable workflows',
        'Third-party integrations',
        'Mobile applications',
        'API access'
      ],
      integrations: ['Slack', 'GitHub', 'Google Drive', 'Zapier', 'Stripe'],
      deployment: 'AWS Cloud Infrastructure',
      database: 'PostgreSQL with Redis caching',
      security: 'SOC 2 Type II compliant'
    },
    sales: [
      { id: 1, customer: 'Acme Corp', plan: 'Enterprise', amount: 99, date: '2024-01-15', status: 'Active' },
      { id: 2, customer: 'TechStart Inc', plan: 'Pro', amount: 29, date: '2024-01-14', status: 'Active' },
      { id: 3, customer: 'Design Studio', plan: 'Pro', amount: 29, date: '2024-01-12', status: 'Active' },
      { id: 4, customer: 'Freelancer John', plan: 'Starter', amount: 9, date: '2024-01-10', status: 'Active' }
    ]
  });

  const tabs = [
    { id: 'overview', label: 'Overview', icon: FiTrendingUp },
    { id: 'tech', label: 'Tech Stack', icon: FiCode },
    { id: 'pricing', label: 'Pricing', icon: FiDollarSign },
    { id: 'marketing', label: 'Marketing', icon: FiImage },
    { id: 'sales', label: 'Sales', icon: FiUsers }
  ];

  const handleSave = () => {
    // Save logic here
    setIsEditing(false);
  };

  const TabButton = ({ tab, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
        isActive
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      }`}
    >
      <SafeIcon icon={tab.icon} className="w-4 h-4" />
      <span>{tab.label}</span>
    </button>
  );

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
                    value={appData.description}
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
                      value={appData.domain}
                      onChange={(e) => setAppData({...appData, domain: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  ) : (
                    <a href={`https://${appData.domain}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-700 flex items-center space-x-1">
                      <span>{appData.domain}</span>
                      <SafeIcon icon={FiExternalLink} className="w-3 h-3" />
                    </a>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Repository</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={appData.repository}
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
              <p className="text-2xl font-bold text-gray-900">{appData.users.toLocaleString()}</p>
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
              <p className="text-2xl font-bold text-gray-900">${appData.revenue.toLocaleString()}</p>
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
              <p className="text-2xl font-bold text-gray-900">+{appData.growth}%</p>
              <p className="text-sm text-gray-600">Growth Rate</p>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Technical Specifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Key Features</h4>
            <ul className="space-y-1">
              {appData.specifications.features.map((feature, index) => (
                <li key={index} className="text-sm text-gray-600 flex items-center space-x-2">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Integrations</h4>
            <div className="flex flex-wrap gap-2">
              {appData.specifications.integrations.map((integration, index) => (
                <span key={index} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md">
                  {integration}
                </span>
              ))}
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
          {appData.techStack.map((tech, index) => (
            <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-200 flex items-center justify-between">
              <span className="font-medium text-gray-900">{tech}</span>
              <button className="text-gray-400 hover:text-red-500 transition-colors">
                <SafeIcon icon={FiTrash2} className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <SafeIcon icon={FiServer} className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-gray-900">Infrastructure</h3>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-700">Deployment</p>
              <p className="text-gray-600">{appData.specifications.deployment}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Database</p>
              <p className="text-gray-600">{appData.specifications.database}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">Security</p>
              <p className="text-gray-600">{appData.specifications.security}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center space-x-2 mb-4">
            <SafeIcon icon={FiGithub} className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-semibold text-gray-900">Repository Info</h3>
          </div>
          <div className="space-y-3">
            <a
              href={appData.repository}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
            >
              <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
              <span>View on GitHub</span>
            </a>
            <div className="text-sm text-gray-600">
              <p>Last updated: 2 hours ago</p>
              <p>Commits this month: 47</p>
              <p>Contributors: 3</p>
            </div>
          </div>
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
          {appData.pricing.map((plan) => (
            <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
              <div className="text-center mb-4">
                <h4 className="text-lg font-semibold text-gray-900">{plan.name}</h4>
                <div className="mt-2">
                  <span className="text-3xl font-bold text-gray-900">${plan.price}</span>
                  <span className="text-gray-600">/month</span>
                </div>
              </div>
              
              <ul className="space-y-2 mb-6">
                {plan.features.map((feature, index) => (
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
          <h3 className="text-lg font-semibold text-gray-900">Marketing Materials</h3>
          <button className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-1">
            <SafeIcon icon={FiPlus} className="w-4 h-4" />
            <span>Upload Asset</span>
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {appData.marketingMaterials.map((material) => (
            <div key={material.id} className="border border-gray-200 rounded-lg overflow-hidden">
              {material.type === 'image' ? (
                <img
                  src={material.url}
                  alt={material.name}
                  className="w-full h-32 object-cover"
                />
              ) : (
                <div className="w-full h-32 bg-gray-100 flex items-center justify-center">
                  <SafeIcon icon={FiFileText} className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="p-4">
                <h4 className="font-medium text-gray-900 mb-2">{material.name}</h4>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 uppercase">{material.type}</span>
                  <div className="flex items-center space-x-2">
                    <button className="text-gray-400 hover:text-blue-500 transition-colors">
                      <SafeIcon icon={FiExternalLink} className="w-4 h-4" />
                    </button>
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

      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Landing Page</h3>
        <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Main Landing Page</h4>
            <a
              href={appData.landingPage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 text-sm flex items-center space-x-1"
            >
              <SafeIcon icon={FiGlobe} className="w-4 h-4" />
              <span>{appData.landingPage}</span>
            </a>
          </div>
          <div className="flex items-center space-x-2">
            <button className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors text-sm">
              Edit
            </button>
            <button className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-100 transition-colors text-sm">
              Preview
            </button>
          </div>
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
              {appData.sales.map((sale) => (
                <tr key={sale.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-900">{sale.customer}</td>
                  <td className="py-3 px-4 text-gray-600">{sale.plan}</td>
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">Total Revenue</h4>
          <p className="text-2xl font-bold text-green-600">${appData.revenue.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">This month</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">New Customers</h4>
          <p className="text-2xl font-bold text-blue-600">{appData.sales.length}</p>
          <p className="text-sm text-gray-600 mt-1">This month</p>
        </div>
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-2">Conversion Rate</h4>
          <p className="text-2xl font-bold text-purple-600">3.2%</p>
          <p className="text-sm text-gray-600 mt-1">Last 30 days</p>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview': return renderOverview();
      case 'tech': return renderTechStack();
      case 'pricing': return renderPricing();
      case 'marketing': return renderMarketing();
      case 'sales': return renderSales();
      default: return renderOverview();
    }
  };

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
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            appData.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
          }`}>
            {appData.status}
          </span>
          <a
            href={appData.landingPage}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-50 text-blue-600 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors flex items-center space-x-2"
          >
            <SafeIcon icon={FiGlobe} className="w-4 h-4" />
            <span>Visit Site</span>
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-2 overflow-x-auto">
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