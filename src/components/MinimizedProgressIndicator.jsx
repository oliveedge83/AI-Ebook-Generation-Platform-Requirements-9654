import React from 'react';
import { motion } from 'framer-motion';
import { useEbook } from '../contexts/EbookContext';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { 
  FiBookOpen, FiCpu, FiCheck, FiAlertCircle, FiX, FiMaximize2
} = FiIcons;

const MinimizedProgressIndicator = () => {
  const { 
    isPublishing, 
    publishingProgress, 
    backgroundProcessing,
    restorePublishingWindow
  } = useEbook();

  // Don't render if not publishing or not in background mode
  if (!isPublishing || !backgroundProcessing) {
    return null;
  }

  const progress = publishingProgress;
  const isGeneratingContent = progress.currentItem && progress.currentItem.startsWith('Generating content for:');
  
  // Determine icon based on current state
  const getStatusIcon = () => {
    if (progress.step === 'error') return FiAlertCircle;
    if (progress.step === 'aborted') return FiX;
    if (progress.step === 'complete') return FiCheck;
    if (isGeneratingContent) return FiCpu;
    return FiBookOpen;
  };

  // Determine color based on current state
  const getStatusColor = () => {
    if (progress.step === 'error') return 'bg-red-600';
    if (progress.step === 'aborted') return 'bg-orange-600';
    if (progress.step === 'complete') return 'bg-green-600';
    if (isGeneratingContent) return 'bg-blue-600';
    return 'bg-primary-600';
  };

  // Determine status text
  const getStatusText = () => {
    if (progress.step === 'error') return 'Error';
    if (progress.step === 'aborted') return 'Aborted';
    if (progress.step === 'complete') return 'Complete';
    return `${Math.round(progress.progress)}%`;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -50 }}
      className="fixed top-4 right-4 z-50"
    >
      <div 
        className="bg-white rounded-lg shadow-lg p-3 flex items-center space-x-3 cursor-pointer"
        onClick={restorePublishingWindow}
      >
        <div className={`h-8 w-8 ${getStatusColor()} rounded-full flex items-center justify-center text-white`}>
          <SafeIcon icon={getStatusIcon()} className="text-sm" />
        </div>
        
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-900">
            {progress.step === 'complete' ? 'Publishing Complete' : 'Publishing in Progress'}
          </p>
          <div className="flex items-center space-x-2">
            <div className="w-24 bg-gray-200 rounded-full h-1.5">
              <motion.div
                className={`h-1.5 rounded-full ${getStatusColor()}`}
                initial={{ width: '0%' }}
                animate={{ width: `${progress.progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
            <span className="text-xs text-gray-600">{getStatusText()}</span>
          </div>
        </div>
        
        <SafeIcon 
          icon={FiMaximize2} 
          className="text-gray-500 hover:text-gray-700"
          title="Maximize"
        />
      </div>
    </motion.div>
  );
};

export default MinimizedProgressIndicator;