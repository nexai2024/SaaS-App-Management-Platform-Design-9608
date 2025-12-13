import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../../common/SafeIcon';

const StatsCard = ({ title, value, change, changeType, icon }) => {
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-2">{value}</p>
          <div className="flex items-center mt-2">
            <span className={`text-sm font-medium ${
              changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {change}
            </span>
            <span className="text-sm text-gray-500 ml-1">vs last month</span>
          </div>
        </div>
        <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
          <SafeIcon icon={icon} className="w-6 h-6 text-blue-600" />
        </div>
      </div>
    </motion.div>
  );
};

export default StatsCard;