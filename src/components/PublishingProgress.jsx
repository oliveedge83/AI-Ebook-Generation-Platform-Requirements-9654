import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useEbook } from '../contexts/EbookContext';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { 
  FiBookOpen, FiLayers, FiEdit, FiCheck, FiList, FiAlertCircle, 
  FiCpu, FiRotateCw, FiInfo, FiX, FiMinimize2, FiMaximize2, FiStopCircle 
} = FiIcons;

const PublishingProgress = ({ progress, isVisible }) => {
  // Get context functions for controlling the publishing process
  const { abortPublishing, minimizePublishingWindow, backgroundProcessing } = useEbook();
  
  // Move useState to the top level to avoid conditional hook calls
  const [showDebug, setShowDebug] = useState(false);

  const getStepIcon = (step) => {
    switch (step) {
      case 'preparing': return FiBookOpen;
      case 'book': return FiBookOpen;
      case 'chapters': return FiLayers;
      case 'topics': return FiList;
      case 'lessons': return FiEdit;
      case 'complete': return FiCheck;
      case 'error': return FiAlertCircle;
      case 'aborted': return FiX;
      case 'aborting': return FiStopCircle;
      default: return FiBookOpen;
    }
  };

  const getStepTitle = (step) => {
    switch (step) {
      case 'preparing': return 'Preparing';
      case 'book': return 'Creating Book';
      case 'chapters': return 'Creating Chapters';
      case 'topics': return 'Creating Topics';
      case 'lessons': return 'Creating Lessons';
      case 'complete': return 'Complete';
      case 'error': return 'Error';
      case 'aborted': return 'Aborted';
      case 'aborting': return 'Stopping...';
      default: return 'Processing';
    }
  };

  const steps = [
    { key: 'book', title: 'Creating Book', description: 'Creating the main book in WordPress' },
    { key: 'chapters', title: 'Creating Chapters', description: 'Creating chapters and linking them to the book' },
    { key: 'topics', title: 'Creating Topics', description: 'Creating topics with AI-generated introductions' },
    { key: 'lessons', title: 'Creating Lessons', description: 'Creating detailed lesson content with AI' },
    { key: 'complete', title: 'Complete', description: 'Publishing completed successfully' }
  ];

  if (!isVisible) return null;

  const isGeneratingContent = progress.currentItem && progress.currentItem.startsWith('Generating content for:');
  const isApiError = progress.step === 'error' && progress.message && (
    progress.message.includes('API') ||
    progress.message.includes('Failed to create') ||
    progress.message.includes('No route') ||
    progress.message.includes('No valid')
  );
  
  const isProcessComplete = progress.step === 'complete';
  const isProcessError = progress.step === 'error';
  const isProcessAborted = progress.step === 'aborted';
  const isProcessAborting = progress.step === 'aborting';

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
        className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 max-h-[90vh] overflow-y-auto relative"
      >
        {/* Close and Minimize Buttons */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button 
            onClick={minimizePublishingWindow} 
            className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            title="Minimize"
          >
            <SafeIcon icon={FiMinimize2} className="text-sm" />
          </button>
          <button 
            onClick={() => minimizePublishingWindow()} 
            className="p-1 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            title="Close"
          >
            <SafeIcon icon={FiX} className="text-sm" />
          </button>
        </div>

        <div className="text-center mb-6">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center mb-4">
            {isGeneratingContent ? (
              <SafeIcon icon={FiCpu} className="text-2xl text-blue-600 animate-pulse" />
            ) : isProcessAborting ? (
              <SafeIcon icon={FiStopCircle} className="text-2xl text-orange-600 animate-pulse" />
            ) : (
              <SafeIcon 
                icon={
                  progress.step === 'error' 
                    ? FiAlertCircle 
                    : progress.step === 'aborted'
                      ? FiX
                      : getStepIcon(progress.step)
                }
                className={`text-2xl ${
                  progress.step === 'error' 
                    ? 'text-red-600' 
                    : progress.step === 'aborted'
                      ? 'text-orange-600'
                      : isProcessAborting
                        ? 'text-orange-600'
                        : 'text-primary-600'
                }`}
              />
            )}
          </div>
          <h3 className="text-lg font-semibold text-gray-900">
            {progress.step === 'error' 
              ? 'Publishing Error' 
              : progress.step === 'aborted'
                ? 'Publishing Aborted'
                : isProcessAborting
                  ? 'Stopping Process...'
                  : isGeneratingContent 
                    ? 'AI Content Generation' 
                    : 'Publishing to WordPress'}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {progress.message || 'Please wait while we publish your ebook...'}
          </p>
        </div>

        {/* Current Item */}
        {progress.currentItem && !isProcessAborting && (
          <div className="mb-4 text-center">
            <p className="text-sm font-medium text-primary-600">
              {progress.currentItem}
            </p>
            {isGeneratingContent && (
              <p className="text-xs text-gray-500 mt-1">
                Using AI to generate high-quality content. This may take a moment...
              </p>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm font-medium text-gray-700 mb-2">
            <span>{getStepTitle(progress.step)}</span>
            <span>{progress.processedItems} of {progress.totalItems} items ({Math.round(progress.progress)}%)</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <motion.div
              className={`h-2 rounded-full ${
                isGeneratingContent 
                  ? 'bg-blue-600' 
                  : progress.step === 'error' 
                    ? 'bg-red-600' 
                    : progress.step === 'aborted'
                      ? 'bg-orange-600'
                      : isProcessAborting
                        ? 'bg-orange-600'
                        : 'bg-primary-600'
              }`}
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
            const isCompleted = 
              (step.key === 'book' && ['chapters', 'topics', 'lessons', 'complete'].includes(progress.step)) ||
              (step.key === 'chapters' && ['topics', 'lessons', 'complete'].includes(progress.step)) ||
              (step.key === 'topics' && ['lessons', 'complete'].includes(progress.step)) ||
              (step.key === 'lessons' && ['complete'].includes(progress.step)) ||
              (step.key === 'complete' && progress.step === 'complete');
            
            const isAnimating = isActive && progress.step !== 'error' && progress.step !== 'aborted' && progress.step !== 'complete' && !isProcessAborting;

            return (
              <div
                key={step.key}
                className={`flex items-start space-x-3 ${
                  isActive
                    ? (isGeneratingContent && (step.key === 'topics' || step.key === 'lessons')
                      ? 'text-blue-600'
                      : 'text-primary-600')
                    : isCompleted
                      ? 'text-green-600'
                      : progress.step === 'error' && index >= steps.findIndex(s => s.key === progress.step)
                        ? 'text-red-400'
                        : progress.step === 'aborted' || isProcessAborting
                          ? 'text-orange-400'
                          : 'text-gray-400'
                }`}
              >
                <div className={`mt-0.5 ${isAnimating ? (isGeneratingContent ? 'animate-pulse' : 'animate-spin') : ''}`}>
                  <SafeIcon
                    icon={
                      isCompleted
                        ? FiCheck
                        : isGeneratingContent && (step.key === 'topics' || step.key === 'lessons') && isActive
                          ? FiCpu
                          : getStepIcon(step.key)
                    }
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

        {/* AI Generation Note */}
        {(progress.step === 'topics' || progress.step === 'lessons') && !isProcessAborting && (
          <div className="mt-5 p-3 bg-blue-50 border border-blue-100 rounded-md">
            <p className="text-xs text-blue-700">
              <strong>Note:</strong> Using GPT-4.1-mini to generate high-quality content for your ebook. This process may take a few minutes per item.
            </p>
          </div>
        )}

        {/* API Error Note */}
        {isApiError && (
          <div className="mt-5 p-3 bg-red-50 border border-red-100 rounded-md">
            <p className="text-xs text-red-700">
              <strong>WordPress API Error:</strong> There was a problem with the WordPress API connection. This may be due to incorrect credentials, missing custom post types, or the REST API being disabled.
            </p>
            <p className="text-xs text-red-700 mt-2">
              <strong>Suggestions:</strong>
            </p>
            <ul className="text-xs text-red-700 mt-1 list-disc pl-4">
              <li>Verify your WordPress credentials</li>
              <li>Ensure the WordPress REST API is enabled</li>
              <li>Check that the URL is correct: {progress.wordpressUrl || 'your WordPress site'}</li>
              <li>Ensure your user has sufficient permissions</li>
              <li>Try using an application password instead of your account password</li>
            </ul>
          </div>
        )}
        
        {/* Abort Process Button - Only show if still processing */}
        {!isProcessComplete && !isProcessError && !isProcessAborted && (
          <div className="mt-6">
            <button
              onClick={() => {
                console.log('🛑 STOP GENERATING button clicked');
                abortPublishing();
              }}
              disabled={isProcessAborting}
              className={`w-full py-2 px-4 rounded-md transition-colors flex items-center justify-center space-x-2 ${
                isProcessAborting 
                  ? 'bg-gray-400 text-white cursor-not-allowed' 
                  : 'bg-red-600 text-white hover:bg-red-700'
              }`}
            >
              {isProcessAborting ? (
                <>
                  <SafeIcon icon={FiStopCircle} className="animate-pulse" />
                  <span>STOPPING...</span>
                </>
              ) : (
                <>
                  <SafeIcon icon={FiStopCircle} />
                  <span>STOP GENERATING</span>
                </>
              )}
            </button>
          </div>
        )}
        
        {/* Debug Information Toggle */}
        <div className="mt-5 border-t border-gray-100 pt-3">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="flex items-center space-x-2 text-xs text-gray-500 hover:text-gray-700"
          >
            <SafeIcon icon={FiInfo} />
            <span>{showDebug ? 'Hide' : 'Show'} technical details</span>
          </button>
          {showDebug && progress.debug && (
            <div className="mt-3 p-3 bg-gray-50 rounded-md text-xs overflow-auto max-h-40">
              <pre className="whitespace-pre-wrap break-words text-gray-700">
                {JSON.stringify(progress.debug, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PublishingProgress;