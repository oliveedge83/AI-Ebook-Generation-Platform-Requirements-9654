import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiSearch, FiBookOpen, FiLayers, FiEdit, FiCheck } = FiIcons;

const GenerationProgress = ({ progress, isVisible }) => {
  const getStepIcon = (step) => {
    switch (step) {
      case 'research': return FiSearch;
      case 'preface': return FiBookOpen;
      case 'chapters': return FiLayers;
      case 'topics': return FiEdit;
      case 'complete': return FiCheck;
      default: return FiBookOpen;
    }
  };

  const getStepTitle = (step) => {
    switch (step) {
      case 'research': return 'Market Research';
      case 'preface': return 'Preface & Introduction';
      case 'chapters': return 'Chapter Structure';
      case 'topics': return 'Detailed Content';
      case 'finalizing': return 'Finalizing';
      case 'complete': return 'Complete';
      default: return 'Processing';
    }
  };

  const steps = [
    { key: 'research', title: 'Market Research', description: 'Analyzing target audience and market trends' },
    { key: 'preface', title: 'Preface & Introduction', description: 'Creating compelling opening content' },
    { key: 'chapters', title: 'Chapter Structure', description: 'Designing logical chapter progression' },
    { key: 'topics', title: 'Detailed Content', description: 'Generating topics and lessons for each chapter' },
    { key: 'complete', title: 'Complete', description: 'Ebook outline ready for review' }
  ];

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6"
      >
        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            <SafeIcon 
              icon={getStepIcon(progress.step)} 
              className="text-2xl text-primary-600" 
            />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            Generating Your Ebook
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {progress.message || 'Please wait while we create your ebook outline...'}
          </p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>{getStepTitle(progress.step)}</span>
            <span>{Math.round(progress.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className="bg-primary-600 h-2 rounded-full"
              initial={{ width: '0%' }}
              animate={{ width: `${progress.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Step Indicators */}
        <div className="space-y-3">
          {steps.map((step, index) => {
            const isActive = progress.step === step.key;
            const isCompleted = steps.findIndex(s => s.key === progress.step) > index;
            
            return (
              <div
                key={step.key}
                className={`flex items-start space-x-3 ${
                  isActive ? 'text-primary-600' : isCompleted ? 'text-green-600' : 'text-gray-400'
                }`}
              >
                <div className={`mt-0.5 ${isActive ? 'animate-spin' : ''}`}>
                  <SafeIcon 
                    icon={isCompleted ? FiCheck : getStepIcon(step.key)} 
                    className="text-sm"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    {step.title}
                  </p>
                  <p className="text-xs opacity-75">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            This process typically takes 2-3 minutes
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default GenerationProgress;