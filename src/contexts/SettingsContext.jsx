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
    // OpenAI Settings
    openaiPrimary: '',
    openaiFallback: '',
    
    // Perplexity Settings
    perplexityPrimary: '',
    perplexityFallback: '',
    
    // WordPress Settings
    wordpressUrl: '',
    wordpressUsername: '',
    wordpressPassword: '',
    
    // Webhook Settings
    webhooks: {
      bookToChapter: {
        url: '',
        username: '',
        password: ''
      },
      chapterToTopic: {
        url: '',
        username: '',
        password: ''
      },
      topicToSection: {
        url: '',
        username: '',
        password: ''
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
        setSettings(prevSettings => ({
          ...prevSettings,
          ...parsedSettings
        }));
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