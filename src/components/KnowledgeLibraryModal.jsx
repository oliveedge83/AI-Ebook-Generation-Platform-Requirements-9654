import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSettings } from '../contexts/SettingsContext';
import VectorStoreService from '../services/vectorStoreService';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiX, FiDatabase, FiUpload, FiPlus, FiLoader, FiCheck, FiFile, FiTrash2, FiInfo } = FiIcons;

const KnowledgeLibraryModal = ({ isOpen, onClose, onSave, currentLibraryId = null, level, title }) => {
  const { settings } = useSettings();
  const [vectorStores, setVectorStores] = useState([]);
  const [selectedLibraryId, setSelectedLibraryId] = useState(currentLibraryId);
  const [isLoadingLibraries, setIsLoadingLibraries] = useState(false);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isCreatingLibrary, setIsCreatingLibrary] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, fileName: '' });

  useEffect(() => {
    if (isOpen && settings.openaiPrimary) {
      loadVectorStores();
    }
  }, [isOpen, settings.openaiPrimary]);

  const loadVectorStores = async () => {
    setIsLoadingLibraries(true);
    try {
      const vectorStoreService = new VectorStoreService(settings.openaiPrimary);
      const stores = await vectorStoreService.listVectorStores();
      setVectorStores(stores);
    } catch (error) {
      console.error('Error loading vector stores:', error);
      // Don't show error toast, just log it
    } finally {
      setIsLoadingLibraries(false);
    }
  };

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const createNewLibrary = async () => {
    if (!newLibraryName.trim() || selectedFiles.length === 0) {
      return;
    }

    setIsCreatingLibrary(true);
    try {
      const vectorStoreService = new VectorStoreService(settings.openaiPrimary);
      
      // Step 1: Upload files
      setUploadProgress({ current: 0, total: selectedFiles.length, fileName: '' });
      
      const uploadedFiles = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress({ current: i + 1, total: selectedFiles.length, fileName: file.name });
        
        const uploadedFile = await vectorStoreService.uploadFile(file);
        uploadedFiles.push(uploadedFile);
      }

      // Step 2: Create vector store with uploaded files
      setUploadProgress({ current: selectedFiles.length, total: selectedFiles.length, fileName: 'Creating library...' });
      
      const fileIds = uploadedFiles.map(file => file.id);
      const vectorStore = await vectorStoreService.createVectorStore(newLibraryName.trim(), fileIds);
      
      // Add to local list and select it
      setVectorStores(prev => [vectorStore, ...prev]);
      setSelectedLibraryId(vectorStore.id);
      setShowCreateNew(false);
      setNewLibraryName('');
      setSelectedFiles([]);
      
    } catch (error) {
      console.error('Error creating library:', error);
      // Show error in UI instead of toast
    } finally {
      setIsCreatingLibrary(false);
      setUploadProgress({ current: 0, total: 0, fileName: '' });
    }
  };

  const handleSave = () => {
    onSave(selectedLibraryId);
    onClose();
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiDatabase} className="text-xl text-primary-600" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Knowledge Library</h3>
                <p className="text-sm text-gray-600">
                  {level === 'topic' ? 'Chapter Topic' : 'Topic Section'}: {title}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <SafeIcon icon={FiX} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Info Box */}
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <SafeIcon icon={FiInfo} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Enhanced Content Generation with RAG</p>
                <p>
                  Select a knowledge library to enhance content generation with relevant context from your documents.
                  Files are processed with 650-token chunks and 250-token overlaps for optimal retrieval.
                </p>
                {level === 'topic' && (
                  <p className="mt-2 text-xs">
                    <strong>Note:</strong> This library will be used for all sections under this topic, 
                    unless overridden at the section level.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Existing Libraries */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-md font-medium text-gray-900">Existing Libraries</h4>
              <button
                onClick={() => setShowCreateNew(!showCreateNew)}
                className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm font-medium"
              >
                <SafeIcon icon={FiPlus} />
                <span>Add New Library</span>
              </button>
            </div>

            {isLoadingLibraries ? (
              <div className="flex items-center justify-center py-8">
                <SafeIcon icon={FiLoader} className="animate-spin mr-2" />
                <span className="text-gray-600">Loading libraries...</span>
              </div>
            ) : vectorStores.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <SafeIcon icon={FiDatabase} className="text-3xl mx-auto mb-2 opacity-50" />
                <p>No libraries found. Create your first knowledge library below.</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                <div className="mb-2">
                  <label className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                    <input
                      type="radio"
                      name="library"
                      value=""
                      checked={selectedLibraryId === null}
                      onChange={() => setSelectedLibraryId(null)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <div>
                      <p className="font-medium text-gray-900">No Library</p>
                      <p className="text-sm text-gray-600">Use standard content generation</p>
                    </div>
                  </label>
                </div>
                {vectorStores.map((store) => (
                  <label
                    key={store.id}
                    className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name="library"
                      value={store.id}
                      checked={selectedLibraryId === store.id}
                      onChange={() => setSelectedLibraryId(store.id)}
                      className="text-primary-600 focus:ring-primary-500"
                    />
                    <SafeIcon icon={FiDatabase} className="text-primary-600" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{store.name}</p>
                      <p className="text-sm text-gray-600">
                        {store.file_counts?.total || 0} files • Created {new Date(store.created_at * 1000).toLocaleDateString()}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Create New Library Section */}
          <AnimatePresence>
            {showCreateNew && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-gray-200 pt-6"
              >
                <h4 className="text-md font-medium text-gray-900 mb-4">Create New Library</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Library Name
                    </label>
                    <input
                      type="text"
                      value={newLibraryName}
                      onChange={(e) => setNewLibraryName(e.target.value)}
                      placeholder="Enter library name..."
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Files
                    </label>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.txt,.md,.doc,.docx"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats: PDF, TXT, MD, DOC, DOCX
                    </p>
                  </div>

                  {selectedFiles.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Selected Files:</p>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <div className="flex items-center space-x-2">
                              <SafeIcon icon={FiFile} className="text-gray-500" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-600 hover:text-red-700 p-1"
                            >
                              <SafeIcon icon={FiTrash2} className="text-sm" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {isCreatingLibrary && (
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <SafeIcon icon={FiLoader} className="animate-spin text-blue-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900">Creating Library...</p>
                          {uploadProgress.total > 0 && (
                            <div className="mt-2">
                              <p className="text-xs text-blue-700">
                                {uploadProgress.fileName === 'Creating library...' 
                                  ? 'Creating library...'
                                  : `Uploading: ${uploadProgress.fileName} (${uploadProgress.current}/${uploadProgress.total})`
                                }
                              </p>
                              <div className="w-full bg-blue-200 rounded-full h-2 mt-1">
                                <div
                                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                  style={{ 
                                    width: `${(uploadProgress.current / uploadProgress.total) * 100}%` 
                                  }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={createNewLibrary}
                    disabled={!newLibraryName.trim() || selectedFiles.length === 0 || isCreatingLibrary}
                    className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingLibrary ? (
                      <>
                        <SafeIcon icon={FiLoader} className="animate-spin" />
                        <span>Creating...</span>
                      </>
                    ) : (
                      <>
                        <SafeIcon icon={FiUpload} />
                        <span>Create Library</span>
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            <SafeIcon icon={FiCheck} />
            <span>Save Selection</span>
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default KnowledgeLibraryModal;