import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEbook } from '../contexts/EbookContext';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiPlus, FiBookOpen, FiClock, FiCheck, FiEdit, FiTrash2, FiEye } = FiIcons;

const Dashboard = () => {
  const { projects, deleteProject } = useEbook();

  const getStatusColor = (status) => {
    switch (status) {
      case 'draft': return 'bg-gray-100 text-gray-800';
      case 'generating': return 'bg-yellow-100 text-yellow-800';
      case 'review': return 'bg-blue-100 text-blue-800';
      case 'publishing': return 'bg-purple-100 text-purple-800';
      case 'published': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'draft': return FiEdit;
      case 'generating': return FiClock;
      case 'review': return FiEye;
      case 'publishing': return FiClock;
      case 'published': return FiCheck;
      default: return FiEdit;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage your ebook projects</p>
        </div>
        
        <Link to="/create">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            <SafeIcon icon={FiPlus} />
            <span>New Ebook</span>
          </motion.button>
        </Link>
      </div>

      {projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12"
        >
          <SafeIcon icon={FiBookOpen} className="text-6xl text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-medium text-gray-900 mb-2">No ebooks yet</h3>
          <p className="text-gray-500 mb-6">Create your first ebook to get started</p>
          <Link to="/create">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors mx-auto"
            >
              <SafeIcon icon={FiPlus} />
              <span>Create Your First Ebook</span>
            </motion.button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project, index) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {project.title || project.niche}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {project.niche}
                  </p>
                </div>
                
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                    <SafeIcon icon={getStatusIcon(project.status)} className="mr-1" />
                    {project.status}
                  </span>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Chapters:</span> {project.maxChapters || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Created:</span> {new Date(project.createdAt).toLocaleDateString()}
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                <div className="flex space-x-2">
                  <Link to={`/project/${project.id}`}>
                    <button className="text-primary-600 hover:text-primary-700 text-sm font-medium">
                      View
                    </button>
                  </Link>
                  {project.status === 'review' && (
                    <Link to={`/review/${project.id}`}>
                      <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        Review
                      </button>
                    </Link>
                  )}
                </div>
                
                <button
                  onClick={() => deleteProject(project.id)}
                  className="text-red-600 hover:text-red-700 p-1"
                >
                  <SafeIcon icon={FiTrash2} className="text-sm" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dashboard;