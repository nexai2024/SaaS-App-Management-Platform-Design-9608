import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { 
  FiUser, FiLayers, FiTarget, FiCheck, FiArrowRight, FiArrowLeft,
  FiZap, FiTrendingUp, FiUsers, FiDollarSign
} = FiIcons;

const Onboarding = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    experience: '',
    goals: [],
    apps: []
  });

  const steps = [
    {
      id: 'welcome',
      title: 'Welcome to SaaS Manager',
      subtitle: 'Let\'s get you set up to manage your apps efficiently',
      icon: FiZap
    },
    {
      id: 'profile',
      title: 'Tell us about yourself',
      subtitle: 'This helps us personalize your experience',
      icon: FiUser
    },
    {
      id: 'apps',
      title: 'Add your first app',
      subtitle: 'Start managing your SaaS applications',
      icon: FiLayers
    },
    {
      id: 'goals',
      title: 'What are your goals?',
      subtitle: 'We\'ll help you achieve them',
      icon: FiTarget
    },
    {
      id: 'complete',
      title: 'You\'re all set!',
      subtitle: 'Welcome to your new SaaS management hub',
      icon: FiCheck
    }
  ];

  const roles = [
    'Solo Developer',
    'Startup Founder',
    'Product Manager',
    'Tech Lead',
    'Freelancer',
    'Other'
  ];

  const experienceLevels = [
    'Just getting started',
    '1-2 years experience',
    '3-5 years experience',
    '5+ years experience',
    'Seasoned veteran'
  ];

  const goalOptions = [
    { id: 'revenue', label: 'Increase Revenue', icon: FiDollarSign },
    { id: 'users', label: 'Grow User Base', icon: FiUsers },
    { id: 'efficiency', label: 'Improve Efficiency', icon: FiTrendingUp },
    { id: 'collaboration', label: 'Better Team Collaboration', icon: FiUsers },
    { id: 'analytics', label: 'Better Analytics', icon: FiTrendingUp },
    { id: 'automation', label: 'Automate Workflows', icon: FiZap }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const toggleGoal = (goalId) => {
    setFormData(prev => ({
      ...prev,
      goals: prev.goals.includes(goalId)
        ? prev.goals.filter(g => g !== goalId)
        : [...prev.goals, goalId]
    }));
  };

  const renderWelcome = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-accent rounded-full flex items-center justify-center mx-auto mb-6">
        <SafeIcon icon={FiZap} className="w-10 h-10 text-white" />
      </div>
      <h2 className="text-3xl font-bold text-gray-900 mb-4">Welcome to SaaS Manager</h2>
      <p className="text-xl text-gray-600 mb-8">
        The all-in-one platform for independent app creators to manage, track, and grow their SaaS applications.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-brand-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <SafeIcon icon={FiLayers} className="w-6 h-6 text-brand-700" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Manage Apps</h3>
          <p className="text-sm text-gray-600">Track tech stacks, repositories, and deployments</p>
        </div>
        
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <SafeIcon icon={FiTrendingUp} className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
          <p className="text-sm text-gray-600">Monitor performance and user engagement</p>
        </div>
        
        <div className="text-center p-4">
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-3">
            <SafeIcon icon={FiUsers} className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Collaborate</h3>
          <p className="text-sm text-gray-600">Work seamlessly with your team</p>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="max-w-md mx-auto">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What's your name?</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData('name', e.target.value)}
            placeholder="Enter your full name"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">What's your role?</label>
          <div className="space-y-2">
            {roles.map((role) => (
              <label key={role} className="flex items-center">
                <input
                  type="radio"
                  name="role"
                  value={role}
                  checked={formData.role === role}
                  onChange={(e) => updateFormData('role', e.target.value)}
                  className="text-brand-700 border-gray-300 focus:ring-brand-500"
                />
                <span className="ml-3 text-gray-700">{role}</span>
              </label>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Experience Level</label>
          <select
            value={formData.experience}
            onChange={(e) => updateFormData('experience', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          >
            <option value="">Select your experience level</option>
            {experienceLevels.map((level) => (
              <option key={level} value={level}>{level}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );

  const renderApps = () => (
    <div className="max-w-md mx-auto">
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">App Name</label>
          <input
            type="text"
            placeholder="e.g., TaskFlow Pro"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            rows={3}
            placeholder="Brief description of your app"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Website/Domain</label>
          <input
            type="url"
            placeholder="https://yourapp.com"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Repository (optional)</label>
          <input
            type="url"
            placeholder="https://github.com/username/repo"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        
        <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
          <p className="text-sm text-brand-700">
            Don't worry! You can add more apps and details later from your dashboard.
          </p>
        </div>
      </div>
    </div>
  );

  const renderGoals = () => (
    <div className="max-w-2xl mx-auto">
      <p className="text-gray-600 mb-6 text-center">
        Select all that apply. This helps us customize your experience.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {goalOptions.map((goal) => (
          <button
            key={goal.id}
            onClick={() => toggleGoal(goal.id)}
            className={`p-4 border-2 rounded-lg transition-all text-left ${
              formData.goals.includes(goal.id)
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <SafeIcon 
                icon={goal.icon} 
                className={`w-6 h-6 ${
                  formData.goals.includes(goal.id) ? 'text-brand-700' : 'text-gray-400'
                }`} 
              />
              <span className="font-medium">{goal.label}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );

  const renderComplete = () => (
    <div className="text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
        <SafeIcon icon={FiCheck} className="w-10 h-10 text-green-600" />
      </div>
      
      <h2 className="text-3xl font-bold text-gray-900 mb-4">You're all set!</h2>
      <p className="text-xl text-gray-600 mb-8">
        Welcome to SaaS Manager, {formData.name}! Your dashboard is ready.
      </p>
      
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-brand-200 rounded-lg p-6 mb-8">
        <h3 className="font-semibold text-gray-900 mb-4">What's next?</h3>
        <div className="space-y-2 text-left">
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiCheck} className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-700">Explore your dashboard</span>
          </div>
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiCheck} className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-700">Add more apps and details</span>
          </div>
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiCheck} className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-700">Invite team members</span>
          </div>
          <div className="flex items-center space-x-2">
            <SafeIcon icon={FiCheck} className="w-4 h-4 text-green-500" />
            <span className="text-sm text-gray-700">Set up integrations</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'welcome': return renderWelcome();
      case 'profile': return renderProfile();
      case 'apps': return renderApps();
      case 'goals': return renderGoals();
      case 'complete': return renderComplete();
      default: return renderWelcome();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center p-6">
      <div className="w-full max-w-4xl">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-600">
              Step {currentStep + 1} of {steps.length}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round(((currentStep + 1) / steps.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={steps[currentStep].icon} className="w-8 h-8 text-brand-700" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
              {steps[currentStep].title}
            </h1>
            <p className="text-gray-600">
              {steps[currentStep].subtitle}
            </p>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderStepContent()}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-12">
            <button
              onClick={prevStep}
              disabled={currentStep === 0}
              className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-medium transition-colors ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
              }`}
            >
              <SafeIcon icon={FiArrowLeft} className="w-4 h-4" />
              <span>Back</span>
            </button>

            <button
              onClick={nextStep}
              className="flex items-center space-x-2 bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
            >
              <span>{currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}</span>
              <SafeIcon icon={FiArrowRight} className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;