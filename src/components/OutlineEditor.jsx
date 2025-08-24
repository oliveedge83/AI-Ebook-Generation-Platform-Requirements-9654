import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KnowledgeLibraryModal from './KnowledgeLibraryModal';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiEdit, FiPlus, FiTrash2, FiChevronDown, FiChevronRight, FiMessageSquare, FiInfo, FiDatabase, FiSave, FiX } = FiIcons;

const OutlineEditor = ({ project, onUpdateProject }) => {
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [showContextModal, setShowContextModal] = useState(null);
  const [showResearchBrief, setShowResearchBrief] = useState(false);
  const [showKnowledgeLibrary, setShowKnowledgeLibrary] = useState(null);
  const [knowledgeLibraries, setKnowledgeLibraries] = useState(project?.knowledgeLibraries || {});
  
  // Context management
  const [contextValues, setContextValues] = useState({});
  const [tempContextValue, setTempContextValue] = useState('');
  
  // Edit state management
  const [editValues, setEditValues] = useState({});
  const [tempEditValue, setTempEditValue] = useState('');
  const [editType, setEditType] = useState('');

  const toggleChapter = (chapterIndex) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterIndex)) {
      newExpanded.delete(chapterIndex);
    } else {
      newExpanded.add(chapterIndex);
    }
    setExpandedChapters(newExpanded);
  };

  const toggleTopic = (topicKey) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicKey)) {
      newExpanded.delete(topicKey);
    } else {
      newExpanded.add(topicKey);
    }
    setExpandedTopics(newExpanded);
  };

  const handleKnowledgeLibraryUpdate = (key, libraryId) => {
    const updatedLibraries = { ...knowledgeLibraries };
    if (libraryId) {
      updatedLibraries[key] = libraryId;
    } else {
      delete updatedLibraries[key];
    }
    
    setKnowledgeLibraries(updatedLibraries);
    
    // Update the project with new knowledge libraries
    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        knowledgeLibraries: updatedLibraries
      });
    }
  };

  const handleContextModalOpen = (itemKey) => {
    console.log('Opening context modal for:', itemKey);
    setShowContextModal(itemKey);
    // Load existing context if available
    const existingContext = getContextForItem(itemKey);
    setTempContextValue(existingContext || '');
  };

  const handleContextSave = () => {
    if (!showContextModal) return;

    console.log('Saving context for:', showContextModal, 'Value:', tempContextValue);
    
    // Update context values
    const newContextValues = { ...contextValues };
    if (tempContextValue.trim()) {
      newContextValues[showContextModal] = tempContextValue.trim();
    } else {
      delete newContextValues[showContextModal];
    }
    
    setContextValues(newContextValues);
    
    // Update the project outline with the new context
    const updatedOutline = updateOutlineWithContext(project.outline, showContextModal, tempContextValue.trim());
    
    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        outline: updatedOutline,
        contextValues: newContextValues
      });
    }

    // Close modal and clear temp value
    setShowContextModal(null);
    setTempContextValue('');
  };

  const updateOutlineWithContext = (outline, itemKey, contextValue) => {
    console.log('Updating outline with context:', itemKey, contextValue);
    
    const updatedOutline = { ...outline };
    
    if (itemKey.startsWith('chapter-')) {
      const chapterIndex = parseInt(itemKey.split('-')[1]);
      if (updatedOutline.chapters[chapterIndex]) {
        updatedOutline.chapters[chapterIndex] = {
          ...updatedOutline.chapters[chapterIndex],
          userAddedContext: contextValue
        };
      }
    } else if (itemKey.startsWith('topic-')) {
      const [, chapterIndex, topicIndex] = itemKey.split('-').map(Number);
      if (updatedOutline.chapters[chapterIndex]?.topics?.[topicIndex]) {
        updatedOutline.chapters[chapterIndex].topics[topicIndex] = {
          ...updatedOutline.chapters[chapterIndex].topics[topicIndex],
          userAddedContext: contextValue
        };
      }
    } else if (itemKey.startsWith('lesson-')) {
      const [, chapterIndex, topicIndex, lessonIndex] = itemKey.split('-').map(Number);
      if (updatedOutline.chapters[chapterIndex]?.topics?.[topicIndex]?.lessons?.[lessonIndex]) {
        updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex] = {
          ...updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex],
          userAddedContext: contextValue
        };
      }
    }
    
    return updatedOutline;
  };

  const getContextForItem = (itemKey) => {
    // First check local context values
    if (contextValues[itemKey]) {
      return contextValues[itemKey];
    }
    
    // Then check project outline
    if (itemKey.startsWith('chapter-')) {
      const chapterIndex = parseInt(itemKey.split('-')[1]);
      return project.outline?.chapters?.[chapterIndex]?.userAddedContext || '';
    } else if (itemKey.startsWith('topic-')) {
      const [, chapterIndex, topicIndex] = itemKey.split('-').map(Number);
      return project.outline?.chapters?.[chapterIndex]?.topics?.[topicIndex]?.userAddedContext || '';
    } else if (itemKey.startsWith('lesson-')) {
      const [, chapterIndex, topicIndex, lessonIndex] = itemKey.split('-').map(Number);
      return project.outline?.chapters?.[chapterIndex]?.topics?.[topicIndex]?.lessons?.[lessonIndex]?.userAddedContext || '';
    }
    
    return '';
  };

  // ✅ IMPLEMENTED: Add Chapter functionality
  const handleAddChapter = () => {
    const newChapterNumber = project.outline.chapters.length + 1;
    const newChapter = {
      courseNumber: newChapterNumber,
      courseTitle: `New Chapter ${newChapterNumber}`,
      courseDescription: `Description for chapter ${newChapterNumber}`,
      topics: []
    };

    const updatedOutline = {
      ...project.outline,
      chapters: [...project.outline.chapters, newChapter]
    };

    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        outline: updatedOutline
      });
    }

    console.log('Chapter added successfully');
  };

  // ✅ IMPLEMENTED: Edit item functionality
  const handleEditItem = (itemType, itemKey) => {
    console.log('Edit item clicked:', itemType, itemKey);
    
    let currentValue = '';
    let fieldType = 'title';

    if (itemKey === 'introduction') {
      currentValue = project.outline.title || '';
      fieldType = 'title';
    } else if (itemKey.startsWith('chapter-')) {
      const chapterIndex = parseInt(itemKey.split('-')[1]);
      const chapter = project.outline.chapters[chapterIndex];
      currentValue = chapter?.courseTitle || '';
      fieldType = 'title';
    } else if (itemKey.startsWith('topic-')) {
      const [, chapterIndex, topicIndex] = itemKey.split('-').map(Number);
      const topic = project.outline.chapters[chapterIndex]?.topics?.[topicIndex];
      currentValue = topic?.topicTitle || '';
      fieldType = 'title';
    } else if (itemKey.startsWith('lesson-')) {
      const [, chapterIndex, topicIndex, lessonIndex] = itemKey.split('-').map(Number);
      const lesson = project.outline.chapters[chapterIndex]?.topics?.[topicIndex]?.lessons?.[lessonIndex];
      currentValue = lesson?.lessonTitle || '';
      fieldType = 'title';
    }

    setEditingItem(itemKey);
    setTempEditValue(currentValue);
    setEditType(fieldType);
  };

  const handleEditSave = () => {
    if (!editingItem || !tempEditValue.trim()) return;

    let updatedOutline = { ...project.outline };

    if (editingItem === 'introduction') {
      updatedOutline.title = tempEditValue.trim();
    } else if (editingItem.startsWith('chapter-')) {
      const chapterIndex = parseInt(editingItem.split('-')[1]);
      if (updatedOutline.chapters[chapterIndex]) {
        updatedOutline.chapters[chapterIndex] = {
          ...updatedOutline.chapters[chapterIndex],
          courseTitle: tempEditValue.trim()
        };
      }
    } else if (editingItem.startsWith('topic-')) {
      const [, chapterIndex, topicIndex] = editingItem.split('-').map(Number);
      if (updatedOutline.chapters[chapterIndex]?.topics?.[topicIndex]) {
        updatedOutline.chapters[chapterIndex].topics[topicIndex] = {
          ...updatedOutline.chapters[chapterIndex].topics[topicIndex],
          topicTitle: tempEditValue.trim()
        };
      }
    } else if (editingItem.startsWith('lesson-')) {
      const [, chapterIndex, topicIndex, lessonIndex] = editingItem.split('-').map(Number);
      if (updatedOutline.chapters[chapterIndex]?.topics?.[topicIndex]?.lessons?.[lessonIndex]) {
        updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex] = {
          ...updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons[lessonIndex],
          lessonTitle: tempEditValue.trim()
        };
      }
    }

    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        outline: updatedOutline
      });
    }

    // Close edit mode
    setEditingItem(null);
    setTempEditValue('');
    setEditType('');
  };

  // ✅ IMPLEMENTED: Delete item functionality
  const handleDeleteItem = (itemType, itemKey) => {
    console.log('Delete item clicked:', itemType, itemKey);
    
    if (!confirm(`Are you sure you want to delete this ${itemType}? This action cannot be undone.`)) {
      return;
    }

    let updatedOutline = { ...project.outline };

    if (itemKey.startsWith('chapter-')) {
      const chapterIndex = parseInt(itemKey.split('-')[1]);
      updatedOutline.chapters = updatedOutline.chapters.filter((_, index) => index !== chapterIndex);
      
      // Renumber remaining chapters
      updatedOutline.chapters = updatedOutline.chapters.map((chapter, index) => ({
        ...chapter,
        courseNumber: index + 1
      }));
    } else if (itemKey.startsWith('topic-')) {
      const [, chapterIndex, topicIndex] = itemKey.split('-').map(Number);
      if (updatedOutline.chapters[chapterIndex]?.topics) {
        updatedOutline.chapters[chapterIndex].topics = updatedOutline.chapters[chapterIndex].topics.filter((_, index) => index !== topicIndex);
      }
    } else if (itemKey.startsWith('lesson-')) {
      const [, chapterIndex, topicIndex, lessonIndex] = itemKey.split('-').map(Number);
      if (updatedOutline.chapters[chapterIndex]?.topics?.[topicIndex]?.lessons) {
        updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons = updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons.filter((_, index) => index !== lessonIndex);
      }
    }

    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        outline: updatedOutline
      });
    }

    console.log(`${itemType} deleted successfully`);
  };

  // ✅ IMPLEMENTED: Add Topic functionality
  const handleAddTopic = (chapterIndex) => {
    const chapter = project.outline.chapters[chapterIndex];
    const topicNumber = (chapter.topics?.length || 0) + 1;
    
    const newTopic = {
      topicTitle: `New Topic ${topicNumber}`,
      topicLearningObjectiveDescription: `Learning objective for topic ${topicNumber}`,
      lessons: []
    };

    let updatedOutline = { ...project.outline };
    if (!updatedOutline.chapters[chapterIndex].topics) {
      updatedOutline.chapters[chapterIndex].topics = [];
    }
    updatedOutline.chapters[chapterIndex].topics.push(newTopic);

    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        outline: updatedOutline
      });
    }

    console.log('Topic added successfully to chapter:', chapterIndex);
  };

  // ✅ IMPLEMENTED: Add Lesson functionality
  const handleAddLesson = (chapterIndex, topicIndex) => {
    const topic = project.outline.chapters[chapterIndex]?.topics?.[topicIndex];
    const lessonNumber = (topic?.lessons?.length || 0) + 1;
    
    const newLesson = {
      lessonTitle: `New Lesson ${lessonNumber}`,
      lessonDescription: `Description for lesson ${lessonNumber}`
    };

    let updatedOutline = { ...project.outline };
    if (!updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons) {
      updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons = [];
    }
    updatedOutline.chapters[chapterIndex].topics[topicIndex].lessons.push(newLesson);

    if (onUpdateProject) {
      onUpdateProject({
        ...project,
        outline: updatedOutline
      });
    }

    console.log('Lesson added successfully to chapter:', chapterIndex, 'topic:', topicIndex);
  };

  const getLibraryStatus = (key) => {
    return knowledgeLibraries[key] ? 'configured' : 'not-configured';
  };

  const getInheritedLibrary = (chapterIndex, topicIndex) => {
    const topicKey = `topic-${chapterIndex}-${topicIndex}`;
    const chapterKey = `chapter-${chapterIndex}`;
    
    // Check if topic has its own library
    if (knowledgeLibraries[topicKey]) {
      return { source: 'topic', libraryId: knowledgeLibraries[topicKey] };
    }
    
    // Check if chapter has a library
    if (knowledgeLibraries[chapterKey]) {
      return { source: 'chapter', libraryId: knowledgeLibraries[chapterKey] };
    }
    
    return null;
  };

  if (!project?.outline) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-600">No outline available for this project.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Research Brief */}
      {project.outline.researchBrief && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <SafeIcon icon={FiInfo} className="text-xl text-blue-600" />
              <h3 className="text-lg font-semibold text-blue-900">AI Market Research Brief</h3>
            </div>
            <button
              onClick={() => setShowResearchBrief(!showResearchBrief)}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              {showResearchBrief ? 'Hide' : 'Show'} Research
            </button>
          </div>
          
          <AnimatePresence>
            {showResearchBrief && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="prose max-w-none text-sm text-blue-800 bg-white p-4 rounded border">
                  <p className="whitespace-pre-wrap">{project.outline.researchBrief}</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Book Introduction */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Book Introduction</h3>
          <button 
            onClick={() => handleEditItem('book', 'introduction')}
            className="text-primary-600 hover:text-primary-700 p-2 rounded-md hover:bg-primary-50"
            title="Edit Title"
          >
            <SafeIcon icon={FiEdit} />
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Title</h4>
            {editingItem === 'introduction' ? (
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={tempEditValue}
                  onChange={(e) => setTempEditValue(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Enter book title..."
                />
                <button
                  onClick={handleEditSave}
                  className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                >
                  <SafeIcon icon={FiSave} />
                </button>
                <button
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                >
                  <SafeIcon icon={FiX} />
                </button>
              </div>
            ) : (
              <p className="text-gray-700 text-lg font-semibold">{project.outline.title}</p>
            )}
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Preface</h4>
            <div 
              className="prose max-w-none text-sm text-gray-700 bg-gray-50 p-4 rounded border" 
              dangerouslySetInnerHTML={{ __html: project.outline.preface }} 
            />
          </div>
          
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Introduction</h4>
            <div 
              className="prose max-w-none text-sm text-gray-700 bg-gray-50 p-4 rounded border" 
              dangerouslySetInnerHTML={{ __html: project.outline.introduction }} 
            />
          </div>
        </div>
      </motion.div>

      {/* Chapters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Chapters ({project.outline.chapters.length})
          </h3>
          <button 
            onClick={handleAddChapter}
            className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 px-3 py-2 rounded-md hover:bg-primary-50"
          >
            <SafeIcon icon={FiPlus} />
            <span>Add Chapter</span>
          </button>
        </div>

        <div className="space-y-4">
          {project.outline.chapters.map((chapter, chapterIndex) => (
            <motion.div
              key={chapterIndex}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: chapterIndex * 0.1 }}
              className="border border-gray-200 rounded-lg"
            >
              {/* Chapter Header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => toggleChapter(chapterIndex)}
                      className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                    >
                      <SafeIcon icon={expandedChapters.has(chapterIndex) ? FiChevronDown : FiChevronRight} />
                    </button>
                    <div className="flex-1">
                      {editingItem === `chapter-${chapterIndex}` ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={tempEditValue}
                            onChange={(e) => setTempEditValue(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                            placeholder="Enter chapter title..."
                          />
                          <button
                            onClick={handleEditSave}
                            className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                          >
                            <SafeIcon icon={FiSave} />
                          </button>
                          <button
                            onClick={() => setEditingItem(null)}
                            className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                          >
                            <SafeIcon icon={FiX} />
                          </button>
                        </div>
                      ) : (
                        <div>
                          <h4 className="font-medium text-gray-900">
                            Chapter {chapter.courseNumber}: {chapter.courseTitle}
                          </h4>
                          <p className="text-sm text-gray-600">{chapter.courseDescription}</p>
                          {chapter.topics && (
                            <p className="text-xs text-gray-500 mt-1">
                              {chapter.topics.length} topics, {chapter.topics.reduce((acc, topic) => acc + (topic.lessons?.length || 0), 0)} lessons
                            </p>
                          )}
                          {getContextForItem(`chapter-${chapterIndex}`) && (
                            <p className="text-xs text-green-600 mt-1">
                              📝 Custom context added
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowKnowledgeLibrary({
                        key: `chapter-${chapterIndex}`,
                        level: 'topic',
                        title: `Chapter ${chapter.courseNumber}: ${chapter.courseTitle}`
                      })}
                      className={`p-2 rounded-md transition-colors ${
                        getLibraryStatus(`chapter-${chapterIndex}`) === 'configured'
                          ? 'text-green-600 bg-green-50 hover:bg-green-100'
                          : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                      }`}
                      title={`${getLibraryStatus(`chapter-${chapterIndex}`) === 'configured' ? 'Knowledge library configured' : 'Add knowledge library'}`}
                    >
                      <SafeIcon icon={FiDatabase} />
                    </button>
                    
                    <button
                      onClick={() => handleContextModalOpen(`chapter-${chapterIndex}`)}
                      className="text-blue-600 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50"
                      title="Add Context"
                    >
                      <SafeIcon icon={FiMessageSquare} />
                    </button>
                    
                    <button 
                      onClick={() => handleEditItem('chapter', `chapter-${chapterIndex}`)}
                      className="text-primary-600 hover:text-primary-700 p-2 rounded-md hover:bg-primary-50"
                      title="Edit Chapter"
                    >
                      <SafeIcon icon={FiEdit} />
                    </button>
                    
                    <button 
                      onClick={() => handleDeleteItem('chapter', `chapter-${chapterIndex}`)}
                      className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                      title="Delete Chapter"
                    >
                      <SafeIcon icon={FiTrash2} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Chapter Topics */}
              <AnimatePresence>
                {expandedChapters.has(chapterIndex) && chapter.topics && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="p-4 space-y-3"
                  >
                    {chapter.topics.map((topic, topicIndex) => {
                      const topicKey = `${chapterIndex}-${topicIndex}`;
                      const inheritedLibrary = getInheritedLibrary(chapterIndex, topicIndex);
                      
                      return (
                        <div key={topicIndex} className="border border-gray-100 rounded">
                          {/* Topic Header */}
                          <div className="p-3 bg-gray-25">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => toggleTopic(topicKey)}
                                  className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                                >
                                  <SafeIcon icon={expandedTopics.has(topicKey) ? FiChevronDown : FiChevronRight} />
                                </button>
                                <div className="flex-1">
                                  {editingItem === `topic-${topicKey}` ? (
                                    <div className="flex items-center space-x-2">
                                      <input
                                        type="text"
                                        value={tempEditValue}
                                        onChange={(e) => setTempEditValue(e.target.value)}
                                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                        placeholder="Enter topic title..."
                                      />
                                      <button
                                        onClick={handleEditSave}
                                        className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                                      >
                                        <SafeIcon icon={FiSave} />
                                      </button>
                                      <button
                                        onClick={() => setEditingItem(null)}
                                        className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                      >
                                        <SafeIcon icon={FiX} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div>
                                      <h5 className="font-medium text-gray-900">{topic.topicTitle}</h5>
                                      <p className="text-sm text-gray-600">{topic.topicLearningObjectiveDescription}</p>
                                      {topic.lessons && (
                                        <p className="text-xs text-gray-500 mt-1">
                                          {topic.lessons.length} lessons
                                        </p>
                                      )}
                                      {inheritedLibrary && (
                                        <p className="text-xs text-blue-600 mt-1">
                                          📚 Using {inheritedLibrary.source} library
                                        </p>
                                      )}
                                      {getContextForItem(`topic-${topicKey}`) && (
                                        <p className="text-xs text-green-600 mt-1">
                                          📝 Custom context added
                                        </p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => handleContextModalOpen(`topic-${topicKey}`)}
                                  className="text-blue-600 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50"
                                  title="Add Context"
                                >
                                  <SafeIcon icon={FiMessageSquare} />
                                </button>
                                
                                <button 
                                  onClick={() => handleEditItem('topic', `topic-${topicKey}`)}
                                  className="text-primary-600 hover:text-primary-700 p-2 rounded-md hover:bg-primary-50"
                                  title="Edit Topic"
                                >
                                  <SafeIcon icon={FiEdit} />
                                </button>
                                
                                <button 
                                  onClick={() => handleDeleteItem('topic', `topic-${topicKey}`)}
                                  className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                                  title="Delete Topic"
                                >
                                  <SafeIcon icon={FiTrash2} />
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Topic Lessons */}
                          <AnimatePresence>
                            {expandedTopics.has(topicKey) && topic.lessons && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="p-3 space-y-2"
                              >
                                {topic.lessons.map((lesson, lessonIndex) => {
                                  const lessonKey = `lesson-${topicKey}-${lessonIndex}`;
                                  const sectionLibraryStatus = getLibraryStatus(lessonKey);
                                  
                                  return (
                                    <div key={lessonIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                      <div className="flex-1">
                                        {editingItem === lessonKey ? (
                                          <div className="flex items-center space-x-2">
                                            <input
                                              type="text"
                                              value={tempEditValue}
                                              onChange={(e) => setTempEditValue(e.target.value)}
                                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                                              placeholder="Enter lesson title..."
                                            />
                                            <button
                                              onClick={handleEditSave}
                                              className="px-3 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                                            >
                                              <SafeIcon icon={FiSave} />
                                            </button>
                                            <button
                                              onClick={() => setEditingItem(null)}
                                              className="px-3 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
                                            >
                                              <SafeIcon icon={FiX} />
                                            </button>
                                          </div>
                                        ) : (
                                          <div>
                                            <h6 className="font-medium text-gray-900">{lesson.lessonTitle}</h6>
                                            <p className="text-sm text-gray-600">{lesson.lessonDescription}</p>
                                            {inheritedLibrary && sectionLibraryStatus !== 'configured' && (
                                              <p className="text-xs text-blue-600 mt-1">
                                                📚 Will inherit {inheritedLibrary.source} library
                                              </p>
                                            )}
                                            {sectionLibraryStatus === 'configured' && (
                                              <p className="text-xs text-green-600 mt-1">
                                                📚 Custom library configured (overrides inherited)
                                              </p>
                                            )}
                                            {getContextForItem(lessonKey) && (
                                              <p className="text-xs text-green-600 mt-1">
                                                📝 Custom context added
                                              </p>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className="flex items-center space-x-2 ml-2">
                                        <button
                                          onClick={() => setShowKnowledgeLibrary({
                                            key: lessonKey,
                                            level: 'section',
                                            title: lesson.lessonTitle
                                          })}
                                          className={`p-2 rounded-md transition-colors ${
                                            sectionLibraryStatus === 'configured'
                                              ? 'text-green-600 bg-green-50 hover:bg-green-100'
                                              : 'text-gray-500 hover:text-primary-600 hover:bg-primary-50'
                                          }`}
                                          title={`${sectionLibraryStatus === 'configured' ? 'Knowledge library configured' : 'Add knowledge library'}`}
                                        >
                                          <SafeIcon icon={FiDatabase} />
                                        </button>
                                        
                                        <button
                                          onClick={() => handleContextModalOpen(lessonKey)}
                                          className="text-blue-600 hover:text-blue-700 p-2 rounded-md hover:bg-blue-50"
                                          title="Add Context"
                                        >
                                          <SafeIcon icon={FiMessageSquare} />
                                        </button>
                                        
                                        <button 
                                          onClick={() => handleEditItem('lesson', lessonKey)}
                                          className="text-primary-600 hover:text-primary-700 p-2 rounded-md hover:bg-primary-50"
                                          title="Edit Lesson"
                                        >
                                          <SafeIcon icon={FiEdit} />
                                        </button>
                                        
                                        <button 
                                          onClick={() => handleDeleteItem('lesson', lessonKey)}
                                          className="text-red-600 hover:text-red-700 p-2 rounded-md hover:bg-red-50"
                                          title="Delete Lesson"
                                        >
                                          <SafeIcon icon={FiTrash2} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                
                                <button 
                                  onClick={() => handleAddLesson(chapterIndex, topicIndex)}
                                  className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm px-3 py-2 rounded-md hover:bg-primary-50"
                                >
                                  <SafeIcon icon={FiPlus} />
                                  <span>Add Lesson</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    
                    <button 
                      onClick={() => handleAddTopic(chapterIndex)}
                      className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm px-3 py-2 rounded-md hover:bg-primary-50"
                    >
                      <SafeIcon icon={FiPlus} />
                      <span>Add Topic</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Knowledge Library Modal */}
      <AnimatePresence>
        {showKnowledgeLibrary && (
          <KnowledgeLibraryModal
            isOpen={!!showKnowledgeLibrary}
            onClose={() => setShowKnowledgeLibrary(null)}
            onSave={(libraryId) => handleKnowledgeLibraryUpdate(showKnowledgeLibrary.key, libraryId)}
            currentLibraryId={knowledgeLibraries[showKnowledgeLibrary.key]}
            level={showKnowledgeLibrary.level}
            title={showKnowledgeLibrary.title}
          />
        )}
      </AnimatePresence>

      {/* Context Modal */}
      <AnimatePresence>
        {showContextModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowContextModal(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Additional Context</h3>
                <div className="mb-4">
                  <label htmlFor="context-textarea" className="block text-sm font-medium text-gray-700 mb-2">
                    Context Instructions
                  </label>
                  <textarea
                    id="context-textarea"
                    value={tempContextValue}
                    onChange={(e) => setTempContextValue(e.target.value)}
                    className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Add any specific instructions, examples, or context for this item..."
                  />
                  <p className="text-xs text-gray-500 mt-2">
                    This context will be included when generating content for this item. 
                    Examples: "Talk about Warm Springs and Fremont school district", "Include case studies from tech startups", etc.
                  </p>
                </div>
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowContextModal(null);
                      setTempContextValue('');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleContextSave}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 font-medium"
                  >
                    Save Context
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default OutlineEditor;