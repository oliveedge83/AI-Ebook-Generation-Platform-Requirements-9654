import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiHome, FiBookOpen, FiSettings, FiPlus, FiFileText } = FiIcons;

const Sidebar = () => {
  const navItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/create', icon: FiPlus, label: 'Create Ebook' },
    { path: '/pdf-generator', icon: FiFileText, label: 'PDF Generator' },
    { path: '/settings', icon: FiSettings, label: 'Settings' }
  ];

  return (
    <motion.div
      initial={{ x: -250 }}
      animate={{ x: 0 }}
      className="w-64 bg-white shadow-lg border-r border-gray-200"
    >
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiBookOpen} className="text-2xl text-primary-600" />
          <h1 className="text-xl font-bold text-gray-900">EbookGen</h1>
        </div>
      </div>

      <nav className="mt-6">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex items-center px-6 py-3 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? 'bg-primary-50 text-primary-700 border-r-2 border-primary-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`
            }
          >
            <SafeIcon icon={item.icon} className="mr-3 text-lg" />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </motion.div>
  );
};

export default Sidebar;