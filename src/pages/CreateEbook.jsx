import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useEbook } from '../contexts/EbookContext';
import { useSettings } from '../contexts/SettingsContext';
import GenerationProgress from '../components/GenerationProgress';
import AdvancedOptions from '../components/AdvancedOptions';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiBookOpen, FiTarget, FiArrowRight, FiAlertCircle, FiSettings, FiSearch, FiCpu, FiLink } = FiIcons;

const CreateEbook = () => {
  const navigate = useNavigate();
  const { createProject, generateOutline, isGenerating, generationProgress, updateProject } = useEbook();
  const { settings } = useSettings();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      researchLLM: 'openai',
      contentGenerationLLM: 'openai',
      includeWebReferences: 'no'
    }
  });

  // VibeCoding: State for Advanced Options
  const [sonarOptions, setSonarOptions] = useState({
    model: 'sonar',
    search_mode: 'web',
    search_context_size: 'low',
    search_recency_filter: 'month'
  });

  const [gptOptions, setGptOptions] = useState({
    model: 'gpt-4.1-mini-2025-04-14',
    temperature: 0.5,
    max_tokens_sonar: 1000,
    max_tokens_gpt: 2000
  });

  // Watch form values to check configuration status
  const researchLLM = watch('researchLLM');
  const contentGenerationLLM = watch('contentGenerationLLM');
  const includeWebReferences = watch('includeWebReferences');

  // Check configuration based on selected methods
  const isResearchConfigured = (researchLLM === 'openai' && settings.openaiPrimary) || 
                               (researchLLM === 'perplexity' && settings.perplexityPrimary);
  
  const isContentGenerationConfigured = (contentGenerationLLM === 'openai' && settings.openaiPrimary) || 
                                       (contentGenerationLLM === 'perplexity' && settings.perplexityPrimary);
  
  const isWordPressConfigured = settings.wordpressUrl && settings.wordpressUsername && settings.wordpressPassword;
  
  const isWebReferencesConfigured = includeWebReferences === 'no' || settings.perplexityPrimary;
  
  const isFullyConfigured = isResearchConfigured && isContentGenerationConfigured && isWordPressConfigured && isWebReferencesConfigured;

  // VibeCoding: Check if advanced options should be shown (when using Perplexity workflows)
  const showAdvancedOptions = researchLLM === 'perplexity' || contentGenerationLLM === 'perplexity' || includeWebReferences === 'yes';

  const onSubmit = async (data) => {
    if (!isFullyConfigured) {
      toast.error('Please configure the required API keys and WordPress settings first');
      navigate('/settings');
      return;
    }

    try {
      console.log('🚀 Starting ebook creation process...');
      console.log('📋 Project data:', {
        niche: data.niche,
        maxChapters: data.maxChapters,
        researchMethod: data.researchLLM,
        contentMethod: data.contentGenerationLLM,
        includeWebReferences: data.includeWebReferences,
        // VibeCoding: Log advanced options
        sonarOptions: showAdvancedOptions ? sonarOptions : 'default',
        gptOptions: showAdvancedOptions ? gptOptions : 'default'
      });

      // VibeCoding: Include advanced options in project data
      const projectData = {
        ...data,
        sonarOptions: showAdvancedOptions ? sonarOptions : {},
        gptOptions: showAdvancedOptions ? gptOptions : {}
      };

      // Create the project with form data and advanced options
      const project = createProject(projectData);
      console.log('✅ Project created with ID:', project.id);

      // VibeCoding: Pass advanced options to generateOutline
      console.log('🔍 Starting outline generation with advanced options...');
      const outline = await generateOutline({
        ...data,
        sonarOptions: showAdvancedOptions ? sonarOptions : {},
        gptOptions: showAdvancedOptions ? gptOptions : {}
      });
      
      console.log('✅ Outline generated successfully');
      console.log('📊 Outline structure:', {
        title: outline.title,
        chaptersCount: outline.chapters?.length || 0,
        hasResearchBrief: !!outline.researchBrief,
        researchMethod: outline.researchMethod,
        contentMethod: outline.contentGenerationMethod,
        webReferences: data.includeWebReferences,
        usedAdvancedOptions: showAdvancedOptions
      });

      // Update the project with the generated outline and advanced options
      updateProject(project.id, {
        outline,
        status: 'review',
        title: outline.title,
        includeWebReferences: data.includeWebReferences,
        // VibeCoding: Store advanced options in project
        sonarOptions: showAdvancedOptions ? sonarOptions : {},
        gptOptions: showAdvancedOptions ? gptOptions : {}
      });

      console.log('✅ Project updated with outline and advanced options');
      toast.success(`AI-powered ebook outline generated successfully using ${data.researchLLM === 'perplexity' ? 'Perplexity Sonar Research' : 'OpenAI'}${showAdvancedOptions ? ' with custom parameters' : ''}!`);
      navigate(`/review/${project.id}`);
    } catch (error) {
      console.error('❌ Generation error:', error);
      toast.error(error.message || 'Failed to generate ebook outline');
    }
  };

  const getConfigurationStatus = (method, type) => {
    if (type === 'research') {
      if (method === 'openai') {
        return settings.openaiPrimary ? 'configured' : 'missing';
      } else if (method === 'perplexity') {
        return settings.perplexityPrimary ? 'configured' : 'missing';
      }
    } else if (type === 'content') {
      if (method === 'openai') {
        return settings.openaiPrimary ? 'configured' : 'missing';
      } else if (method === 'perplexity') {
        return settings.perplexityPrimary ? 'configured' : 'missing';
      }
    }
    return 'missing';
  };

  return (
    <>
      <div className="p-6 max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Ebook</h1>
          <p className="text-gray-600 mt-1">Provide the details and our AI will generate a comprehensive outline</p>
        </div>

        {/* Configuration Warning */}
        {!isFullyConfigured && (
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
                  Please configure the required API keys and WordPress settings based on your selected methods.
                </p>
                <div className="mt-2 text-xs text-yellow-700">
                  <p>• Research Method: {researchLLM === 'openai' ? 'OpenAI' : 'Perplexity Sonar Research'} - {isResearchConfigured ? '✅ Configured' : '❌ Not Configured'}</p>
                  <p>• Content Generation: {contentGenerationLLM === 'openai' ? 'OpenAI Only' : 'Perplexity + OpenAI'} - {isContentGenerationConfigured ? '✅ Configured' : '❌ Not Configured'}</p>
                  <p>• WordPress: {isWordPressConfigured ? '✅ Configured' : '❌ Not Configured'}</p>
                  <p>• Web References: {includeWebReferences === 'no' ? '✅ Disabled (No API Required)' : isWebReferencesConfigured ? '✅ Perplexity Configured' : '❌ Perplexity API Required'}</p>
                </div>
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
          {/* AI Method Selection */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
          >
            <div className="flex items-center space-x-3 mb-6">
              <SafeIcon icon={FiCpu} className="text-xl text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">AI Method Selection</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Research LLM Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Research Method *
                </label>
                <select
                  {...register('researchLLM', { required: 'Please select a research method' })}
                  className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="openai">OpenAI (Standard Research)</option>
                  <option value="perplexity">Perplexity Sonar (Web + Real-time)</option>
                </select>
                {errors.researchLLM && (
                  <p className="mt-1 text-sm text-red-600">{errors.researchLLM.message}</p>
                )}
                <div className="mt-2 text-xs text-gray-600">
                  {researchLLM === 'perplexity' ? (
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiSearch} className="text-green-600" />
                      <span>Uses real-time web research with current trends (last 1-3 months)</span>
                    </div>
                  ) : (
                    <span>Uses OpenAI's knowledge base for research</span>
                  )}
                </div>
                <div className="mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${getConfigurationStatus(researchLLM, 'research') === 'configured' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {getConfigurationStatus(researchLLM, 'research') === 'configured' ? '✅ API Key Configured' : '❌ API Key Required'}
                  </span>
                </div>
              </div>

              {/* Content Generation LLM Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content Generation Method *
                </label>
                <select
                  {...register('contentGenerationLLM', { required: 'Please select a content generation method' })}
                  className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="openai">OpenAI Only</option>
                  <option value="perplexity">Perplexity + OpenAI (Web Context + Generation)</option>
                </select>
                {errors.contentGenerationLLM && (
                  <p className="mt-1 text-sm text-red-600">{errors.contentGenerationLLM.message}</p>
                )}
                <div className="mt-2 text-xs text-gray-600">
                  {contentGenerationLLM === 'perplexity' ? (
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiSearch} className="text-blue-600" />
                      <span>Perplexity provides fresh web context, OpenAI generates final content</span>
                    </div>
                  ) : (
                    <span>Uses OpenAI for direct content generation</span>
                  )}
                </div>
                <div className="mt-1">
                  <span className={`text-xs px-2 py-1 rounded-full ${getConfigurationStatus(contentGenerationLLM, 'content') === 'configured' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {getConfigurationStatus(contentGenerationLLM, 'content') === 'configured' ? '✅ API Key Configured' : '❌ API Key Required'}
                  </span>
                </div>
              </div>
            </div>

            {/* Web References Selection */}
            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Include Web References in Content *
              </label>
              <select
                {...register('includeWebReferences', { required: 'Please select web references option' })}
                className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="no">Do Not Add References (Default)</option>
                <option value="yes">Add Sonar Web Search References</option>
              </select>
              {errors.includeWebReferences && (
                <p className="mt-1 text-sm text-red-600">{errors.includeWebReferences.message}</p>
              )}
              <div className="mt-2 text-xs text-gray-600">
                {includeWebReferences === 'yes' ? (
                  <div className="flex items-center space-x-2">
                    <SafeIcon icon={FiLink} className="text-blue-600" />
                    <span>Adds 2-3 relevant web sources with brief snippets (first 20 words) to each chapter topic</span>
                  </div>
                ) : (
                  <span>Content will be generated without web reference citations</span>
                )}
              </div>
              <div className="mt-1">
                <span className={`text-xs px-2 py-1 rounded-full ${includeWebReferences === 'no' ? 'bg-gray-100 text-gray-800' : isWebReferencesConfigured ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {includeWebReferences === 'no' ? '✅ No API Required' : isWebReferencesConfigured ? '✅ Perplexity API Configured' : '❌ Perplexity API Required'}
                </span>
              </div>
            </div>

            {/* Method Explanation */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
              <h4 className="text-sm font-medium text-blue-900 mb-2">How These Methods Work Together:</h4>
              <div className="text-sm text-blue-800 space-y-1">
                <p><strong>Research Phase:</strong> {researchLLM === 'perplexity' ? 'Perplexity conducts real-time web research with current trends and data' : 'OpenAI uses its knowledge base for research'}</p>
                <p><strong>Content Generation:</strong> {contentGenerationLLM === 'perplexity' ? 'Perplexity gathers fresh web context, then OpenAI generates the final content using that context' : 'OpenAI handles all content generation directly'}</p>
                <p><strong>Web References:</strong> {includeWebReferences === 'yes' ? 'Perplexity Sonar searches for relevant sources and adds 2-3 citations with brief snippets to each chapter topic' : 'No web references will be added to the content'}</p>
                <p><strong>Knowledge Libraries:</strong> RAG (file search) works with all methods when libraries are attached</p>
              </div>
            </div>
          </motion.div>

          {/* VibeCoding: Advanced Options Component - Only show when using Perplexity workflows */}
          <AdvancedOptions
            sonarOptions={sonarOptions}
            setSonarOptions={setSonarOptions}
            gptOptions={gptOptions}
            setGptOptions={setGptOptions}
            showAdvanced={showAdvancedOptions}
          />

          {/* Basic Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
            transition={{ delay: 0.2 }}
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
            transition={{ delay: 0.25 }}
            className="bg-blue-50 border border-blue-200 rounded-lg p-6"
          >
            <h3 className="text-lg font-semibold text-blue-900 mb-3">AI-Powered Generation Process</h3>
            <div className="space-y-2 text-sm text-blue-800">
              <p>• <strong>Market Research:</strong> {researchLLM === 'perplexity' ? 'Real-time web research with current trends and data (last 1-3 months)' : 'AI analyzes your niche using knowledge base'}</p>
              <p>• <strong>Content Structure:</strong> Creates a logical, scaffolded learning progression</p>
              <p>• <strong>Chapter Outline:</strong> Generates detailed chapters with topics and lessons</p>
              <p>• <strong>Content Generation:</strong> {contentGenerationLLM === 'perplexity' ? 'Fresh web context + AI-powered content creation' : 'Direct AI content generation'}</p>
              <p>• <strong>Web References:</strong> {includeWebReferences === 'yes' ? 'Adds relevant Sonar web search citations with brief snippets to each chapter topic' : 'No web references added'}</p>
              <p>• <strong>Professional Quality:</strong> Uses bestselling author expertise and content strategy</p>
              {/* VibeCoding: Show advanced options info when enabled */}
              {showAdvancedOptions && (
                <p>• <strong>Advanced Options:</strong> Using custom parameters for enhanced control over AI generation</p>
              )}
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-md">
              <p className="text-xs text-blue-700">
                <strong>Note:</strong> Generation typically takes 2-4 minutes. {researchLLM === 'perplexity' || contentGenerationLLM === 'perplexity' || includeWebReferences === 'yes' ? 'Web research methods may take slightly longer for comprehensive results.' : 'Standard AI generation for faster results.'}
                {showAdvancedOptions && ' Advanced options provide fine-tuned control over the generation process.'}
              </p>
            </div>
          </motion.div>

          {/* Submit */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex justify-end"
          >
            <motion.button
              whileHover={{ scale: isFullyConfigured ? 1.02 : 1 }}
              whileTap={{ scale: isFullyConfigured ? 0.98 : 1 }}
              type="submit"
              disabled={isGenerating || !isFullyConfigured}
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