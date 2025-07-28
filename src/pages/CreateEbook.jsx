import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useEbook } from '../contexts/EbookContext';
import { useSettings } from '../contexts/SettingsContext';
import GenerationProgress from '../components/GenerationProgress';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiBookOpen, FiTarget, FiArrowRight, FiAlertCircle, FiSettings } = FiIcons;

const CreateEbook = () => {
  const navigate = useNavigate();
  const { createProject, generateOutline, isGenerating, generationProgress } = useEbook();
  const { settings } = useSettings();
  const { register, handleSubmit, formState: { errors } } = useForm();

  // Check if required settings are configured
  const isConfigured = settings.openaiPrimary && settings.wordpressUrl && settings.wordpressUsername && settings.wordpressPassword;

  const onSubmit = async (data) => {
    if (!isConfigured) {
      toast.error('Please configure your API keys and WordPress settings first');
      navigate('/settings');
      return;
    }

    try {
      // Create the project
      const project = createProject(data);
      
      // Generate outline using AI
      const outline = await generateOutline(data);
      
      // Update project with generated outline
      const updatedProject = {
        ...project,
        outline,
        status: 'review',
        title: outline.title
      };
      
      // Update the project in context
      project.outline = outline;
      project.status = 'review';
      project.title = outline.title;
      
      toast.success('AI-powered ebook outline generated successfully!');
      navigate(`/review/${project.id}`);
    } catch (error) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate ebook outline');
    }
  };

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Ebook</h1>
          <p className="text-gray-600 mt-1">Provide the details and our AI will generate a comprehensive outline</p>
        </div>

        {/* Configuration Warning */}
        {!isConfigured && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg"
          >
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiAlertCircle} className="text-yellow-600" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-yellow-800">Configuration Required</h3>
                <p className="text-sm text-yellow-700 mt-1">
                  Please configure your OpenAI API keys and WordPress settings before creating an ebook.
                </p>
              </div>
              <button
                onClick={() => navigate('/settings')}
                className="flex items-center space-x-2 bg-yellow-600 text-white px-3 py-1 rounded text-sm hover:bg-yellow-700 transition-colors"
              >
                <SafeIcon icon={FiSettings} />
                <span>Settings</span>
              </button>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <SafeIcon icon={FiBookOpen} className="text-xl text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Basic Information</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ebook Niche *
                </label>
                <input
                  {...register('niche', { required: 'Ebook niche is required' })}
                  type="text"
                  placeholder="e.g., Digital Marketing, Personal Finance, Web Development"
                  className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {errors.niche && (
                  <p className="mt-1 text-sm text-red-600">{errors.niche.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Number of Chapters *
                </label>
                <select
                  {...register('maxChapters', { required: 'Please select maximum chapters' })}
                  className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="">Select maximum chapters</option>
                  <option value="2">2 chapters (for testing)</option>
                  {[5, 8, 10, 12, 15].map(num => (
                    <option key={num} value={num}>{num} chapters</option>
                  ))}
                </select>
                {errors.maxChapters && (
                  <p className="mt-1 text-sm text-red-600">{errors.maxChapters.message}</p>
                )}
              </div>
            </div>
          </motion.div>

          {/* Content Requirements */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <SafeIcon icon={FiTarget} className="text-xl text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Content Requirements</h2>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Must-Have Aspects *
                </label>
                <textarea
                  {...register('mustHaveAspects', { required: 'Must-have aspects are required' })}
                  rows={4}
                  placeholder="Describe the essential content, themes, and topics that must be included..."
                  className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                {errors.mustHaveAspects && (
                  <p className="mt-1 text-sm text-red-600">{errors.mustHaveAspects.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Other Design Considerations
                </label>
                <textarea
                  {...register('otherConsiderations')}
                  rows={4}
                  placeholder="Any additional structural considerations, tone preferences, target audience details..."
                  className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>
          </motion.div>

          {/* AI Generation Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-blue-900 mb-3">AI-Powered Generation Process</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• <strong>Market Research:</strong> AI analyzes your niche to identify key audience needs and trends</p>
              <p>• <strong>Content Structure:</strong> Creates a logical, scaffolded learning progression</p>
              <p>• <strong>Chapter Outline:</strong> Generates detailed chapters with topics and lessons</p>
              <p>• <strong>Professional Quality:</strong> Uses bestselling author expertise and content strategy</p>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-md">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Generation typically takes 2-3 minutes as our AI conducts thorough research and creates comprehensive content.
              </p>
            </div>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex justify-end"
          >
            <motion.button
              whileHover={{ scale: isConfigured ? 1.02 : 1 }}
              whileTap={{ scale: isConfigured ? 0.98 : 1 }}
              type="submit"
              disabled={isGenerating || !isConfigured}
              className="flex items-center space-x-2 bg-primary-600 text-white px-8 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Generating with AI...</span>
                </>
              ) : (
                <>
                  <span>Generate AI-Powered Outline</span>
                  <SafeIcon icon={FiArrowRight} />
                </>
              )}
            </motion.button>
          </motion.div>
        </form>
      </div>

      {/* Generation Progress Modal */}
      <AnimatePresence>
        <GenerationProgress progress={generationProgress} isVisible={isGenerating} />
      </AnimatePresence>
    </>
  );
};

export default CreateEbook;