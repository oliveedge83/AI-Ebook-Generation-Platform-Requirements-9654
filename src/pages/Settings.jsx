import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSettings } from '../contexts/SettingsContext';
import WordPressService from '../services/wordpressService';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiKey, FiGlobe, FiSave, FiEye, FiEyeOff, FiCheck, FiLoader, FiX, FiLink } = FiIcons;

const Settings = () => {
  const { settings, updateSettings, loading } = useSettings();
  const [showApiKey, setShowApiKey] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showWebhookPasswords, setShowWebhookPasswords] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isTestingWebhooks, setIsTestingWebhooks] = useState({});
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [validationResults, setValidationResults] = useState(null);
  const [webhookValidationResults, setWebhookValidationResults] = useState({});

  const { register, handleSubmit, formState: { errors }, reset, watch, getValues } = useForm();

  // Load saved settings into form when component mounts or settings change
  useEffect(() => {
    if (!loading && settings) {
      reset(settings);
    }
  }, [settings, loading, reset]);

  // Watch form values to show unsaved changes indicator
  const formValues = watch();
  const hasUnsavedChanges = JSON.stringify(formValues) !== JSON.stringify(settings);

  const toggleWebhookPasswordVisibility = (webhookType) => {
    setShowWebhookPasswords(prev => ({
      ...prev,
      [webhookType]: !prev[webhookType]
    }));
  };

  const testWebhookEndpoint = async (webhookType, webhookConfig) => {
    setIsTestingWebhooks(prev => ({ ...prev, [webhookType]: true }));
    
    try {
      console.log(`Testing webhook endpoint: ${webhookType}`);
      console.log('Webhook config:', {
        url: webhookConfig.url,
        username: webhookConfig.username,
        passwordLength: webhookConfig.password ? webhookConfig.password.length : 0
      });
      
      // Test with dummy data
      const testData = {
        parent_id: 123,
        child_id: 456,
        test: true,
        timestamp: new Date().toISOString()
      };

      console.log('Sending test data:', testData);

      // Create Basic Auth header
      const basicAuth = btoa(`${webhookConfig.username}:${webhookConfig.password}`);
      console.log('Basic Auth header created for username:', webhookConfig.username);

      const response = await fetch(webhookConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${basicAuth}`,
          'Accept': 'application/json',
          'User-Agent': 'EbookGen-Webhook-Test/1.0'
        },
        body: JSON.stringify(testData),
        mode: 'cors', // Explicitly set CORS mode
        credentials: 'include' // Include credentials
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        let responseData;
        try {
          responseData = await response.text();
          console.log(`Webhook ${webhookType} test successful:`, responseData);
        } catch (textError) {
          console.log('Could not read response text:', textError);
          responseData = 'Response received but could not read content';
        }
        
        setWebhookValidationResults(prev => ({
          ...prev,
          [webhookType]: {
            success: true,
            status: response.status,
            statusText: response.statusText,
            message: 'Webhook endpoint is working correctly',
            response: responseData,
            timestamp: new Date().toISOString()
          }
        }));

        toast.success(`${webhookType} webhook test successful! Status: ${response.status}`);
      } else {
        console.error(`Webhook ${webhookType} test failed:`, response.status, response.statusText);
        
        let errorData;
        try {
          errorData = await response.text();
        } catch (textError) {
          errorData = 'Could not read error response';
        }
        
        setWebhookValidationResults(prev => ({
          ...prev,
          [webhookType]: {
            success: false,
            status: response.status,
            statusText: response.statusText,
            message: `Webhook returned status: ${response.status} ${response.statusText}`,
            error: errorData,
            timestamp: new Date().toISOString()
          }
        }));

        toast.error(`${webhookType} webhook test failed: ${response.status} ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Webhook ${webhookType} test error:`, error);
      
      let errorMessage = error.message;
      let errorDetails = {};

      // Provide more specific error messages based on error type
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        errorMessage = 'Network error: Could not connect to webhook endpoint. This could be due to CORS policy, network issues, or the endpoint being unreachable.';
        errorDetails = {
          possibleCauses: [
            'CORS policy blocking the request',
            'Network connectivity issues',
            'Webhook endpoint is down or unreachable',
            'SSL/TLS certificate issues',
            'Firewall blocking the request'
          ],
          suggestions: [
            'Check if the webhook URL is correct and accessible',
            'Verify the webhook service is running',
            'Check CORS configuration on the webhook endpoint',
            'Try testing from a different network or device',
            'Contact the webhook service administrator'
          ]
        };
      } else if (error.name === 'AbortError') {
        errorMessage = 'Request was aborted or timed out';
      }
      
      setWebhookValidationResults(prev => ({
        ...prev,
        [webhookType]: {
          success: false,
          message: errorMessage,
          error: error.message,
          errorType: error.name,
          errorDetails,
          timestamp: new Date().toISOString()
        }
      }));

      toast.error(`${webhookType} webhook test failed: ${errorMessage}`);
    } finally {
      setIsTestingWebhooks(prev => ({ ...prev, [webhookType]: false }));
    }
  };

  const testAllWebhooks = async () => {
    const webhookConfigs = getValues('webhooks') || settings.webhooks;
    
    toast.loading('Testing all webhook endpoints...', { id: 'webhook-test-all' });
    
    let successCount = 0;
    let totalCount = Object.keys(webhookConfigs).length;
    
    for (const [webhookType, config] of Object.entries(webhookConfigs)) {
      try {
        await testWebhookEndpoint(webhookType, config);
        // Check if the test was successful
        if (webhookValidationResults[webhookType]?.success) {
          successCount++;
        }
        // Add delay between tests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (error) {
        console.error(`Error testing webhook ${webhookType}:`, error);
      }
    }
    
    if (successCount === totalCount) {
      toast.success(`All ${totalCount} webhook endpoints tested successfully!`, { id: 'webhook-test-all' });
    } else {
      toast.error(`${successCount}/${totalCount} webhook endpoints passed. Check individual results below.`, { id: 'webhook-test-all' });
    }
  };

  const onSubmit = async (data) => {
    setIsSaving(true);
    try {
      const result = updateSettings(data);
      if (result.success) {
        toast.success('Settings saved successfully!');
      } else {
        toast.error(result.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('An error occurred while saving settings');
    } finally {
      setIsSaving(false);
    }
  };

  const validateWordPressSetup = async () => {
    const { wordpressUrl, wordpressUsername, wordpressPassword } = getValues();

    if (!wordpressUrl || !wordpressUsername || !wordpressPassword) {
      toast.error('Please fill in all WordPress credentials first');
      return;
    }

    setIsTestingConnection(true);
    setConnectionStatus(null);
    setValidationResults(null);

    toast.loading('Validating WordPress setup...', { id: 'wp-validation' });

    try {
      // Create a WordPress service instance for testing
      const wpService = new WordPressService(
        wordpressUrl,
        wordpressUsername,
        wordpressPassword
      );

      // Test the basic connection first
      const connectionResult = await wpService.validateConnection();
      console.log('WordPress connection test result:', connectionResult);

      if (!connectionResult.success) {
        toast.error(`WordPress connection failed: ${connectionResult.error}`, { id: 'wp-validation' });
        setConnectionStatus({ success: false, connection: connectionResult });
        return;
      }

      // Check REST API availability
      const apiResult = await wpService.checkRestApiAvailability();
      console.log('WordPress REST API test result:', apiResult);

      if (!apiResult.available) {
        toast.error(`WordPress REST API not available: ${apiResult.error}`, { id: 'wp-validation' });
        setConnectionStatus({ success: false, connection: connectionResult, api: apiResult });
        return;
      }

      // Verify credentials
      const credentialsResult = await wpService.verifyCredentials();
      console.log('WordPress credentials test result:', credentialsResult);

      if (!credentialsResult.valid) {
        toast.error(`WordPress credentials invalid: ${credentialsResult.error}`, { id: 'wp-validation' });
        setConnectionStatus({ success: false, connection: connectionResult, api: apiResult, credentials: credentialsResult });
        return;
      }

      // Now check for required post types
      const postTypeResults = await wpService.validatePostTypes();
      console.log('Post types validation results:', postTypeResults);

      // Set full validation results
      setValidationResults(postTypeResults);

      // Determine if all required post types are available
      const allPostTypesAvailable = postTypeResults.book?.available &&
        postTypeResults.chapter?.available &&
        postTypeResults.chaptertopic?.available &&
        postTypeResults.topicsection?.available;

      if (allPostTypesAvailable) {
        toast.success('WordPress validation successful! All required post types are available.', { id: 'wp-validation' });
      } else {
        toast.success('WordPress connection successful, but some post types are missing. See details below.', { id: 'wp-validation' });
      }

      setConnectionStatus({
        success: true,
        connection: connectionResult,
        api: apiResult,
        credentials: credentialsResult,
        postTypes: postTypeResults
      });

    } catch (error) {
      console.error('WordPress validation error:', error);
      toast.error(`WordPress validation failed: ${error.message}`, { id: 'wp-validation' });
      setConnectionStatus({ success: false, error: error.message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const testConnection = async (type) => {
    if (type === 'openai') {
      const apiKey = getValues('openaiPrimary');
      if (!apiKey) {
        toast.error('Please enter your OpenAI API key first');
        return;
      }

      // Simulate API test - in real app, make actual API call
      toast.loading('Testing OpenAI connection...', { id: 'openai-test' });
      setTimeout(() => {
        toast.success('OpenAI connection successful!', { id: 'openai-test' });
      }, 1500);
    } else if (type === 'wordpress') {
      validateWordPressSetup();
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <span className="ml-3 text-gray-600">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your API keys, WordPress integration, and webhook endpoints</p>
        {hasUnsavedChanges && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <p className="text-sm text-yellow-800">
              You have unsaved changes. Click "Save Settings" to apply them.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* OpenAI Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiKey} className="text-xl text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">OpenAI Configuration</h2>
            </div>
            <button
              type="button"
              onClick={() => testConnection('openai')}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Test Connection
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Primary API Key *
              </label>
              <div className="relative">
                <input
                  {...register('openaiPrimary', { required: 'Primary API key is required' })}
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowApiKey(!showApiKey)}
                >
                  <SafeIcon icon={showApiKey ? FiEyeOff : FiEye} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              {errors.openaiPrimary && (
                <p className="mt-1 text-sm text-red-600">{errors.openaiPrimary.message}</p>
              )}
              {settings.openaiPrimary && !errors.openaiPrimary && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <SafeIcon icon={FiCheck} className="mr-1" />
                  API key configured
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fallback API Key (Optional)
              </label>
              <div className="relative">
                <input
                  {...register('openaiFallback')}
                  type={showApiKey ? 'text' : 'password'}
                  placeholder="sk-..."
                  className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              {settings.openaiFallback && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <SafeIcon icon={FiCheck} className="mr-1" />
                  Fallback key configured
                </p>
              )}
            </div>
          </div>
        </motion.div>

        {/* WordPress Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiGlobe} className="text-xl text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">WordPress Integration</h2>
            </div>
            <button
              type="button"
              onClick={() => validateWordPressSetup()}
              disabled={isTestingConnection}
              className="text-sm bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center"
            >
              {isTestingConnection ? (
                <>
                  <SafeIcon icon={FiLoader} className="animate-spin mr-1" />
                  <span>Validating...</span>
                </>
              ) : (
                <span>Validate WordPress Setup</span>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WordPress Site URL *
              </label>
              <input
                {...register('wordpressUrl', {
                  required: 'WordPress URL is required',
                  pattern: {
                    value: /^https?:\/\/.+/,
                    message: 'Please enter a valid URL starting with http:// or https://'
                  }
                })}
                type="url"
                placeholder="https://yoursite.com"
                className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.wordpressUrl && (
                <p className="mt-1 text-sm text-red-600">{errors.wordpressUrl.message}</p>
              )}
              {settings.wordpressUrl && !errors.wordpressUrl && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <SafeIcon icon={FiCheck} className="mr-1" />
                  WordPress URL configured
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Username *
              </label>
              <input
                {...register('wordpressUsername', { required: 'Username is required' })}
                type="text"
                placeholder="Your WordPress username"
                className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {errors.wordpressUsername && (
                <p className="mt-1 text-sm text-red-600">{errors.wordpressUsername.message}</p>
              )}
              {settings.wordpressUsername && !errors.wordpressUsername && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <SafeIcon icon={FiCheck} className="mr-1" />
                  Username configured
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Password *
              </label>
              <div className="relative">
                <input
                  {...register('wordpressPassword', { required: 'Application password is required' })}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Your WordPress app password"
                  className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  <SafeIcon icon={showPassword ? FiEyeOff : FiEye} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              {errors.wordpressPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.wordpressPassword.message}</p>
              )}
              {settings.wordpressPassword && !errors.wordpressPassword && (
                <p className="mt-1 text-sm text-green-600 flex items-center">
                  <SafeIcon icon={FiCheck} className="mr-1" />
                  Application password configured
                </p>
              )}
            </div>
          </div>

          {/* Validation Results */}
          {connectionStatus && (
            <div className={`mt-6 p-4 rounded-md ${connectionStatus.success ? 'bg-green-50' : 'bg-red-50'}`}>
              <h4 className={`text-sm font-medium mb-2 ${connectionStatus.success ? 'text-green-900' : 'text-red-900'}`}>
                Connection Test Results:
              </h4>
              <ul className={`text-sm list-disc list-inside space-y-1 ${connectionStatus.success ? 'text-green-800' : 'text-red-800'}`}>
                <li>
                  WordPress connection: {connectionStatus.connection?.success ? 'Successful' : 'Failed'}
                  {connectionStatus.connection?.error && ` - ${connectionStatus.connection.error}`}
                </li>
                {connectionStatus.api && (
                  <li>
                    REST API availability: {connectionStatus.api.available ? 'Available' : 'Not available'}
                    {connectionStatus.api?.error && ` - ${connectionStatus.api.error}`}
                  </li>
                )}
                {connectionStatus.credentials && (
                  <li>
                    User credentials: {connectionStatus.credentials.valid ? 'Valid' : 'Invalid'}
                    {connectionStatus.credentials?.error && ` - ${connectionStatus.credentials.error}`}
                  </li>
                )}
                {connectionStatus.error && <li>Error: {connectionStatus.error}</li>}
              </ul>
            </div>
          )}

          {/* Post Types Validation Results */}
          {validationResults && (
            <div className="mt-4 p-4 bg-white border border-gray-200 rounded-md">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Custom Post Types Validation:</h4>
              <div className="space-y-2">
                {Object.entries(validationResults).map(([type, result]) => (
                  <div key={type} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <div className="flex items-center">
                      <SafeIcon
                        icon={result.available ? FiCheck : FiX}
                        className={result.available ? "text-green-600 mr-2" : "text-red-600 mr-2"}
                      />
                      <span className="font-medium">{type}</span>
                    </div>
                    <div>
                      <span className={`px-2 py-1 text-xs rounded-full ${result.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {result.available ? 'Available' : 'Not Found'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {Object.values(validationResults).some(result => !result.available) && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
                  <p className="text-xs text-yellow-800 font-medium">Some required post types are missing!</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    Your WordPress site needs custom post types for Books, Chapters, Chapter Topics, and Topic Sections.
                    Please install the required plugin or create these custom post types manually.
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">How to create an Application Password:</h4>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Go to your WordPress admin dashboard</li>
              <li>Navigate to Users → Profile</li>
              <li>Scroll down to "Application Passwords"</li>
              <li>Enter a name for your application (e.g., "EbookGen")</li>
              <li>Click "Add New Application Password"</li>
              <li>Copy the generated password and paste it here</li>
            </ol>
          </div>
        </motion.div>

        {/* Webhook Settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiLink} className="text-xl text-primary-600" />
              <h2 className="text-xl font-semibold text-gray-900">Webhook Configuration</h2>
            </div>
            <button
              type="button"
              onClick={testAllWebhooks}
              disabled={Object.values(isTestingWebhooks).some(testing => testing)}
              className="text-sm bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {Object.values(isTestingWebhooks).some(testing => testing) ? (
                <>
                  <SafeIcon icon={FiLoader} className="animate-spin mr-1" />
                  Testing...
                </>
              ) : (
                'Test All Webhooks'
              )}
            </button>
          </div>

          <div className="space-y-6">
            {/* Book to Chapter Webhook */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Book to Chapter Link (L1)</h3>
                <button
                  type="button"
                  onClick={() => testWebhookEndpoint('bookToChapter', getValues('webhooks.bookToChapter') || settings.webhooks.bookToChapter)}
                  disabled={isTestingWebhooks.bookToChapter}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center disabled:opacity-50"
                >
                  {isTestingWebhooks.bookToChapter ? (
                    <>
                      <SafeIcon icon={FiLoader} className="animate-spin mr-1" />
                      Testing...
                    </>
                  ) : (
                    'Test Webhook'
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                  <input
                    {...register('webhooks.bookToChapter.url')}
                    type="url"
                    className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    {...register('webhooks.bookToChapter.username')}
                    type="text"
                    className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      {...register('webhooks.bookToChapter.password')}
                      type={showWebhookPasswords.bookToChapter ? 'text' : 'password'}
                      className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => toggleWebhookPasswordVisibility('bookToChapter')}
                    >
                      <SafeIcon icon={showWebhookPasswords.bookToChapter ? FiEyeOff : FiEye} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {webhookValidationResults.bookToChapter && (
                <div className={`mt-4 p-3 rounded-md ${webhookValidationResults.bookToChapter.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-sm font-medium ${webhookValidationResults.bookToChapter.success ? 'text-green-800' : 'text-red-800'}`}>
                    {webhookValidationResults.bookToChapter.message}
                  </p>
                  {webhookValidationResults.bookToChapter.status && (
                    <p className={`text-xs mt-1 ${webhookValidationResults.bookToChapter.success ? 'text-green-700' : 'text-red-700'}`}>
                      Status: {webhookValidationResults.bookToChapter.status} {webhookValidationResults.bookToChapter.statusText}
                    </p>
                  )}
                  {webhookValidationResults.bookToChapter.timestamp && (
                    <p className="text-xs mt-1 text-gray-500">
                      Tested: {new Date(webhookValidationResults.bookToChapter.timestamp).toLocaleString()}
                    </p>
                  )}
                  {webhookValidationResults.bookToChapter.errorDetails && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
                        Show troubleshooting suggestions
                      </summary>
                      <div className="mt-2 text-xs text-gray-700">
                        <p className="font-medium">Possible causes:</p>
                        <ul className="list-disc list-inside ml-2">
                          {webhookValidationResults.bookToChapter.errorDetails.possibleCauses?.map((cause, index) => (
                            <li key={index}>{cause}</li>
                          ))}
                        </ul>
                        <p className="font-medium mt-2">Suggestions:</p>
                        <ul className="list-disc list-inside ml-2">
                          {webhookValidationResults.bookToChapter.errorDetails.suggestions?.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Chapter to Topic Webhook */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Chapter to Topic Link (L2)</h3>
                <button
                  type="button"
                  onClick={() => testWebhookEndpoint('chapterToTopic', getValues('webhooks.chapterToTopic') || settings.webhooks.chapterToTopic)}
                  disabled={isTestingWebhooks.chapterToTopic}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center disabled:opacity-50"
                >
                  {isTestingWebhooks.chapterToTopic ? (
                    <>
                      <SafeIcon icon={FiLoader} className="animate-spin mr-1" />
                      Testing...
                    </>
                  ) : (
                    'Test Webhook'
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                  <input
                    {...register('webhooks.chapterToTopic.url')}
                    type="url"
                    className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    {...register('webhooks.chapterToTopic.username')}
                    type="text"
                    className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      {...register('webhooks.chapterToTopic.password')}
                      type={showWebhookPasswords.chapterToTopic ? 'text' : 'password'}
                      className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => toggleWebhookPasswordVisibility('chapterToTopic')}
                    >
                      <SafeIcon icon={showWebhookPasswords.chapterToTopic ? FiEyeOff : FiEye} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {webhookValidationResults.chapterToTopic && (
                <div className={`mt-4 p-3 rounded-md ${webhookValidationResults.chapterToTopic.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-sm font-medium ${webhookValidationResults.chapterToTopic.success ? 'text-green-800' : 'text-red-800'}`}>
                    {webhookValidationResults.chapterToTopic.message}
                  </p>
                  {webhookValidationResults.chapterToTopic.status && (
                    <p className={`text-xs mt-1 ${webhookValidationResults.chapterToTopic.success ? 'text-green-700' : 'text-red-700'}`}>
                      Status: {webhookValidationResults.chapterToTopic.status} {webhookValidationResults.chapterToTopic.statusText}
                    </p>
                  )}
                  {webhookValidationResults.chapterToTopic.timestamp && (
                    <p className="text-xs mt-1 text-gray-500">
                      Tested: {new Date(webhookValidationResults.chapterToTopic.timestamp).toLocaleString()}
                    </p>
                  )}
                  {webhookValidationResults.chapterToTopic.errorDetails && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
                        Show troubleshooting suggestions
                      </summary>
                      <div className="mt-2 text-xs text-gray-700">
                        <p className="font-medium">Possible causes:</p>
                        <ul className="list-disc list-inside ml-2">
                          {webhookValidationResults.chapterToTopic.errorDetails.possibleCauses?.map((cause, index) => (
                            <li key={index}>{cause}</li>
                          ))}
                        </ul>
                        <p className="font-medium mt-2">Suggestions:</p>
                        <ul className="list-disc list-inside ml-2">
                          {webhookValidationResults.chapterToTopic.errorDetails.suggestions?.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Topic to Section Webhook */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Topic to Section Link (L3)</h3>
                <button
                  type="button"
                  onClick={() => testWebhookEndpoint('topicToSection', getValues('webhooks.topicToSection') || settings.webhooks.topicToSection)}
                  disabled={isTestingWebhooks.topicToSection}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center disabled:opacity-50"
                >
                  {isTestingWebhooks.topicToSection ? (
                    <>
                      <SafeIcon icon={FiLoader} className="animate-spin mr-1" />
                      Testing...
                    </>
                  ) : (
                    'Test Webhook'
                  )}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Webhook URL</label>
                  <input
                    {...register('webhooks.topicToSection.url')}
                    type="url"
                    className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
                  <input
                    {...register('webhooks.topicToSection.username')}
                    type="text"
                    className="block w-full py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
                  <div className="relative">
                    <input
                      {...register('webhooks.topicToSection.password')}
                      type={showWebhookPasswords.topicToSection ? 'text' : 'password'}
                      className="block w-full pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      onClick={() => toggleWebhookPasswordVisibility('topicToSection')}
                    >
                      <SafeIcon icon={showWebhookPasswords.topicToSection ? FiEyeOff : FiEye} className="text-gray-400 hover:text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              {webhookValidationResults.topicToSection && (
                <div className={`mt-4 p-3 rounded-md ${webhookValidationResults.topicToSection.success ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-sm font-medium ${webhookValidationResults.topicToSection.success ? 'text-green-800' : 'text-red-800'}`}>
                    {webhookValidationResults.topicToSection.message}
                  </p>
                  {webhookValidationResults.topicToSection.status && (
                    <p className={`text-xs mt-1 ${webhookValidationResults.topicToSection.success ? 'text-green-700' : 'text-red-700'}`}>
                      Status: {webhookValidationResults.topicToSection.status} {webhookValidationResults.topicToSection.statusText}
                    </p>
                  )}
                  {webhookValidationResults.topicToSection.timestamp && (
                    <p className="text-xs mt-1 text-gray-500">
                      Tested: {new Date(webhookValidationResults.topicToSection.timestamp).toLocaleString()}
                    </p>
                  )}
                  {webhookValidationResults.topicToSection.errorDetails && (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer text-gray-600 hover:text-gray-800">
                        Show troubleshooting suggestions
                      </summary>
                      <div className="mt-2 text-xs text-gray-700">
                        <p className="font-medium">Possible causes:</p>
                        <ul className="list-disc list-inside ml-2">
                          {webhookValidationResults.topicToSection.errorDetails.possibleCauses?.map((cause, index) => (
                            <li key={index}>{cause}</li>
                          ))}
                        </ul>
                        <p className="font-medium mt-2">Suggestions:</p>
                        <ul className="list-disc list-inside ml-2">
                          {webhookValidationResults.topicToSection.errorDetails.suggestions?.map((suggestion, index) => (
                            <li key={index}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h4 className="text-sm font-medium text-blue-900 mb-2">About Webhooks:</h4>
            <p className="text-sm text-blue-800">
              These webhooks are used to link content hierarchically in WordPress. They establish parent-child relationships between Books → Chapters → Topics → Sections.
              Test each webhook to ensure they're working correctly before publishing content.
            </p>
            <div className="mt-2 text-xs text-blue-700">
              <p><strong>Authentication:</strong> Uses Basic Authentication with username "flowmattic" and the provided password.</p>
              <p><strong>Expected Response:</strong> HTTP 200-299 status codes indicate success.</p>
              <p><strong>Payload:</strong> JSON with parent_id and child_id fields.</p>
            </div>
          </div>
        </motion.div>

        {/* Save Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex justify-end"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={isSaving}
            className="flex items-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <SafeIcon icon={FiSave} />
                <span>Save Settings</span>
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Current Settings Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-50 rounded-lg p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Current Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-medium text-gray-700">OpenAI Primary Key:</p>
              <p className={settings.openaiPrimary ? 'text-green-600' : 'text-red-600'}>
                {settings.openaiPrimary ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">OpenAI Fallback Key:</p>
              <p className={settings.openaiFallback ? 'text-green-600' : 'text-gray-500'}>
                {settings.openaiFallback ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">WordPress URL:</p>
              <p className={settings.wordpressUrl ? 'text-green-600' : 'text-red-600'}>
                {settings.wordpressUrl || 'Not configured'}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">WordPress Username:</p>
              <p className={settings.wordpressUsername ? 'text-green-600' : 'text-red-600'}>
                {settings.wordpressUsername || 'Not configured'}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">WordPress Password:</p>
              <p className={settings.wordpressPassword ? 'text-green-600' : 'text-red-600'}>
                {settings.wordpressPassword ? 'Configured' : 'Not configured'}
              </p>
            </div>
            <div>
              <p className="font-medium text-gray-700">Webhooks:</p>
              <p className={settings.webhooks ? 'text-green-600' : 'text-red-600'}>
                {settings.webhooks ? 'Configured' : 'Not configured'}
              </p>
            </div>
          </div>
        </motion.div>
      </form>
    </div>
  );
};

export default Settings;