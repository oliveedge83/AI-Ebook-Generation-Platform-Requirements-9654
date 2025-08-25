import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiChevronDown, FiChevronRight, FiSettings, FiInfo, FiAlertCircle } = FiIcons;

const AdvancedOptions = ({ 
  sonarOptions, 
  setSonarOptions, 
  gptOptions, 
  setGptOptions,
  showAdvanced = false // Only show when using Perplexity workflows
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dateRangeEnabled, setDateRangeEnabled] = useState(sonarOptions.search_recency_filter === 'daterange');

  // VibeCoding: Don't render if advanced options shouldn't be shown (non-Perplexity workflows)
  if (!showAdvanced) {
    return null;
  }

  const handleSonarOptionChange = (field, value) => {
    // VibeCoding: Update sonar options and handle special cases
    const updatedOptions = { ...sonarOptions, [field]: value };
    
    // VibeCoding: Enable/disable date range inputs based on search_recency_filter
    if (field === 'search_recency_filter') {
      const isDateRange = value === 'daterange';
      setDateRangeEnabled(isDateRange);
      if (!isDateRange) {
        // Clear date fields when not using date range
        delete updatedOptions.search_after_date_filter;
        delete updatedOptions.search_before_date_filter;
        delete updatedOptions.last_updated_after_filter;
        delete updatedOptions.last_updated_before_filter;
      }
    }

    // VibeCoding: Clear domain filter when switching to academic mode
    if (field === 'search_mode' && value === 'academic') {
      delete updatedOptions.search_domain_filter;
    }

    setSonarOptions(updatedOptions);
  };

  const handleGptOptionChange = (field, value) => {
    // VibeCoding: Update GPT options with type conversion for numeric fields
    const numericFields = ['temperature', 'max_tokens_sonar', 'max_tokens_gpt'];
    const processedValue = numericFields.includes(field) ? parseFloat(value) : value;
    setGptOptions({ ...gptOptions, [field]: processedValue });
  };

  const validateDomainFilter = (domains) => {
    // VibeCoding: Validate comma-separated domain list format
    if (!domains.trim()) return true;
    const domainList = domains.split(',').map(d => d.trim());
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    return domainList.every(domain => domainRegex.test(domain));
  };

  const isDomainFilterValid = validateDomainFilter(sonarOptions.search_domain_filter || '');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6"
    >
      {/* VibeCoding: Accordion header with expand/collapse functionality */}
      <div 
        className="flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center space-x-3">
          <SafeIcon icon={FiSettings} className="text-xl text-purple-600" />
          <h2 className="text-xl font-semibold text-gray-900">Advanced Options</h2>
          <span className="text-sm text-gray-500">(Optional)</span>
        </div>
        <SafeIcon 
          icon={isExpanded ? FiChevronDown : FiChevronRight} 
          className="text-gray-500 transition-transform duration-200" 
        />
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="mt-6 space-y-8">
              
              {/* VibeCoding: Info banner explaining the advanced options */}
              <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                <div className="flex items-start space-x-3">
                  <SafeIcon icon={FiInfo} className="text-purple-600 mt-0.5" />
                  <div className="text-sm text-purple-800">
                    <p className="font-medium mb-1">Fine-tune AI Generation Parameters</p>
                    <p>
                      These advanced options allow you to customize how Perplexity Sonar searches the web and how OpenAI GPT generates content. 
                      The default values are optimized for most use cases.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* VibeCoding: Perplexity Sonar Options Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-medium text-gray-900">Perplexity Sonar Options</h3>
                    <p className="text-sm text-gray-600">Configure web search and research parameters</p>
                  </div>

                  {/* VibeCoding: Sonar Model Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sonar Model *
                    </label>
                    <select
                      value={sonarOptions.model || 'sonar'}
                      onChange={(e) => handleSonarOptionChange('model', e.target.value)}
                      className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="sonar">Sonar (Standard)</option>
                      <option value="sonar-pro">Sonar Pro (Advanced)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Sonar Pro offers enhanced accuracy and more comprehensive search results
                    </p>
                  </div>

                  {/* VibeCoding: Search Mode Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Mode *
                    </label>
                    <div className="space-y-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="search_mode"
                          value="web"
                          checked={sonarOptions.search_mode === 'web' || !sonarOptions.search_mode}
                          onChange={(e) => handleSonarOptionChange('search_mode', e.target.value)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Web Search</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="search_mode"
                          value="academic"
                          checked={sonarOptions.search_mode === 'academic'}
                          onChange={(e) => handleSonarOptionChange('search_mode', e.target.value)}
                          className="text-purple-600 focus:ring-purple-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Academic Search</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Academic mode searches scholarly sources and research papers
                    </p>
                  </div>

                  {/* VibeCoding: Search Context Size */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Context Size
                    </label>
                    <select
                      value={sonarOptions.search_context_size || 'low'}
                      onChange={(e) => handleSonarOptionChange('search_context_size', e.target.value)}
                      className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="low">Low (Fast, focused results)</option>
                      <option value="medium">Medium (Balanced depth)</option>
                      <option value="high">High (Comprehensive search)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Higher context size provides more comprehensive results but takes longer
                    </p>
                  </div>

                  {/* VibeCoding: Search Recency Filter */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Search Recency Filter
                    </label>
                    <select
                      value={sonarOptions.search_recency_filter || 'month'}
                      onChange={(e) => handleSonarOptionChange('search_recency_filter', e.target.value)}
                      className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="day">Last Day</option>
                      <option value="week">Last Week</option>
                      <option value="month">Last Month</option>
                      <option value="year">Last Year</option>
                      <option value="daterange">Custom Date Range</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      Filter search results by publication date
                    </p>
                  </div>

                  {/* VibeCoding: Date Range Inputs - Only shown when daterange is selected */}
                  <AnimatePresence>
                    {dateRangeEnabled && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="space-y-4 p-4 bg-gray-50 rounded-md"
                      >
                        <h4 className="text-sm font-medium text-gray-700">Custom Date Filters</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Search After Date
                            </label>
                            <input
                              type="date"
                              value={sonarOptions.search_after_date_filter || ''}
                              onChange={(e) => handleSonarOptionChange('search_after_date_filter', e.target.value)}
                              className="block w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Search Before Date
                            </label>
                            <input
                              type="date"
                              value={sonarOptions.search_before_date_filter || ''}
                              onChange={(e) => handleSonarOptionChange('search_before_date_filter', e.target.value)}
                              className="block w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Last Updated After
                            </label>
                            <input
                              type="date"
                              value={sonarOptions.last_updated_after_filter || ''}
                              onChange={(e) => handleSonarOptionChange('last_updated_after_filter', e.target.value)}
                              className="block w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Last Updated Before
                            </label>
                            <input
                              type="date"
                              value={sonarOptions.last_updated_before_filter || ''}
                              onChange={(e) => handleSonarOptionChange('last_updated_before_filter', e.target.value)}
                              className="block w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                            />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* VibeCoding: Domain Filter - Disabled for academic mode */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Domain Filter
                      {sonarOptions.search_mode === 'academic' && (
                        <span className="text-xs text-gray-500 ml-2">(Disabled in Academic mode)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={sonarOptions.search_domain_filter || ''}
                      onChange={(e) => handleSonarOptionChange('search_domain_filter', e.target.value)}
                      disabled={sonarOptions.search_mode === 'academic'}
                      placeholder="e.g., arxiv.org, wikipedia.org, nature.com"
                      className={`block w-full py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                        sonarOptions.search_mode === 'academic' 
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed' 
                          : isDomainFilterValid 
                            ? 'border-gray-300' 
                            : 'border-red-300'
                      }`}
                    />
                    {!isDomainFilterValid && sonarOptions.search_domain_filter && (
                      <div className="flex items-center space-x-1 mt-1">
                        <SafeIcon icon={FiAlertCircle} className="text-red-500 text-xs" />
                        <p className="text-xs text-red-600">Please enter valid domains separated by commas</p>
                      </div>
                    )}
                    <p className="text-xs text-gray-500 mt-1">
                      Comma-separated list of domains to include in search results
                    </p>
                  </div>

                  {/* VibeCoding: Location Filters */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Location Filters (Optional)</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Country</label>
                        <input
                          type="text"
                          value={sonarOptions.country || ''}
                          onChange={(e) => handleSonarOptionChange('country', e.target.value)}
                          placeholder="e.g., US, UK, CA"
                          className="block w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Region/State</label>
                        <input
                          type="text"
                          value={sonarOptions.region || ''}
                          onChange={(e) => handleSonarOptionChange('region', e.target.value)}
                          placeholder="e.g., California, London"
                          className="block w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">City</label>
                        <input
                          type="text"
                          value={sonarOptions.city || ''}
                          onChange={(e) => handleSonarOptionChange('city', e.target.value)}
                          placeholder="e.g., San Francisco, New York"
                          className="block w-full py-1 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-purple-500"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Bias search results toward specific geographic locations
                    </p>
                  </div>
                </div>

                {/* VibeCoding: OpenAI GPT Options Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-200 pb-2">
                    <h3 className="text-lg font-medium text-gray-900">OpenAI GPT Options</h3>
                    <p className="text-sm text-gray-600">Configure content generation parameters</p>
                  </div>

                  {/* VibeCoding: GPT Model Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model for Content Generation *
                    </label>
                    <select
                      value={gptOptions.model || 'gpt-4.1-mini-2025-04-14'}
                      onChange={(e) => handleGptOptionChange('model', e.target.value)}
                      className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="gpt-4.1-mini-2025-04-14">GPT-4.1 Mini (Recommended)</option>
                      <option value="gpt-4.1-2025-04-14">GPT-4.1 (High Quality)</option>
                      <option value="gpt-4o">GPT-4o (Optimized)</option>
                      <option value="gpt-4o-mini">GPT-4o Mini (Fast)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                      GPT-4.1 Mini offers the best balance of quality and speed for most content
                    </p>
                  </div>

                  {/* VibeCoding: Temperature Control */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Temperature (Creativity Level)
                    </label>
                    <div className="flex items-center space-x-4">
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.1"
                        value={gptOptions.temperature || 0.5}
                        onChange={(e) => handleGptOptionChange('temperature', e.target.value)}
                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <span className="text-sm font-mono text-gray-600 min-w-[3rem]">
                        {(gptOptions.temperature || 0.5).toFixed(1)}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                      <span>Conservative</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Lower values produce more focused content, higher values increase creativity
                    </p>
                  </div>

                  {/* VibeCoding: Max Tokens for Sonar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tokens (Sonar Research)
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="4000"
                      step="100"
                      value={gptOptions.max_tokens_sonar || 1000}
                      onChange={(e) => handleGptOptionChange('max_tokens_sonar', e.target.value)}
                      className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum tokens for Perplexity Sonar research responses (100-4000)
                    </p>
                  </div>

                  {/* VibeCoding: Max Tokens for GPT */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Max Tokens (Content Generation)
                    </label>
                    <input
                      type="number"
                      min="500"
                      max="8000"
                      step="100"
                      value={gptOptions.max_tokens_gpt || 2000}
                      onChange={(e) => handleGptOptionChange('max_tokens_gpt', e.target.value)}
                      className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Maximum tokens for GPT content generation responses (500-8000)
                    </p>
                  </div>

                  {/* VibeCoding: Performance Note */}
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <h4 className="text-sm font-medium text-blue-900 mb-1">Performance Impact</h4>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• Higher token limits increase generation time and cost</li>
                      <li>• GPT-4.1 models provide better quality but are slower than Mini variants</li>
                      <li>• Temperature above 0.7 may produce less consistent results</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* VibeCoding: Reset to Defaults Button */}
              <div className="flex justify-center pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => {
                    // VibeCoding: Reset all options to their default values
                    setSonarOptions({
                      model: 'sonar',
                      search_mode: 'web',
                      search_context_size: 'low',
                      search_recency_filter: 'month'
                    });
                    setGptOptions({
                      model: 'gpt-4.1-mini-2025-04-14',
                      temperature: 0.5,
                      max_tokens_sonar: 1000,
                      max_tokens_gpt: 2000
                    });
                    setDateRangeEnabled(false);
                  }}
                  className="text-sm text-purple-600 hover:text-purple-700 font-medium"
                >
                  Reset to Defaults
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdvancedOptions;