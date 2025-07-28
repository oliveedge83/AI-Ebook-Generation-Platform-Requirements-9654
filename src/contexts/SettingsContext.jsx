import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    openaiPrimary: '',
    openaiFallback: '',
    wordpressUrl: '',
    wordpressUsername: '',
    wordpressPassword: '',
    // Webhook settings
    webhooks: {
      bookToChapter: {
        url: 'https://test1.ilearn.guru/webhook/capture/uVCwiJWxOE',
        username: 'flowmattic',
        password: 'zRMfiGDZpbiPtYNzhjTyGaiTlQrRYCVn'
      },
      chapterToTopic: {
        url: 'https://test1.ilearn.guru/webhook/capture/k64OfUZ0VI',
        username: 'flowmattic',
        password: 'jTSJRa4lFG3MEIIdR1tE0GbOoFooJ8jw'
      },
      topicToSection: {
        url: 'https://test1.ilearn.guru/webhook/capture/EM5Or1GwKY',
        username: 'flowmattic',
        password: 'YMY7oVKnuhy3C2CUbD0U0RpXUUnSrDXv'
      }
    }
  });
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('userCredentials');
      if (savedSettings) {
        const parsedSettings = JSON.parse(savedSettings);
        // Merge with default webhook settings if they don't exist
        const mergedSettings = {
          ...settings,
          ...parsedSettings,
          webhooks: {
            ...settings.webhooks,
            ...parsedSettings.webhooks
          }
        };
        setSettings(mergedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateSettings = (newSettings) => {
    try {
      const updatedSettings = { ...settings, ...newSettings };
      setSettings(updatedSettings);
      localStorage.setItem('userCredentials', JSON.stringify(updatedSettings));
      return { success: true };
    } catch (error) {
      console.error('Error saving settings:', error);
      return { success: false, error: error.message };
    }
  };

  const value = {
    settings,
    loading,
    updateSettings
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};