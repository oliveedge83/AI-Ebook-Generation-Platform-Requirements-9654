import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import KnowledgeLibraryModal from './KnowledgeLibraryModal';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiEdit, FiPlus, FiTrash2, FiChevronDown, FiChevronRight, FiMessageSquare, FiInfo, FiDatabase } = FiIcons;

const OutlineEditor = ({ project, onUpdateProject }) => {
  const [expandedChapters, setExpandedChapters] = useState(new Set());
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null);
  const [showContextModal, setShowContextModal] = useState(null);
  const [showResearchBrief, setShowResearchBrief] = useState(false);
  const [showKnowledgeLibrary, setShowKnowledgeLibrary] = useState(null);
  const [knowledgeLibraries, setKnowledgeLibraries] = useState(project?.knowledgeLibraries || {});

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
          <button className="text-primary-600 hover:text-primary-700">
            <SafeIcon icon={FiEdit} />
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Title</h4>
            <p className="text-gray-700 text-lg font-semibold">{project.outline.title}</p>
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
          <button className="flex items-center space-x-2 text-primary-600 hover:text-primary-700">
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
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <SafeIcon icon={expandedChapters.has(chapterIndex) ? FiChevronDown : FiChevronRight} />
                    </button>
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
                      onClick={() => setShowContextModal(`chapter-${chapterIndex}`)}
                      className="text-blue-600 hover:text-blue-700"
                      title="Add Context"
                    >
                      <SafeIcon icon={FiMessageSquare} />
                    </button>
                    <button className="text-primary-600 hover:text-primary-700">
                      <SafeIcon icon={FiEdit} />
                    </button>
                    <button className="text-red-600 hover:text-red-700">
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
                                  className="text-gray-400 hover:text-gray-600"
                                >
                                  <SafeIcon icon={expandedTopics.has(topicKey) ? FiChevronDown : FiChevronRight} />
                                </button>
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
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => setShowContextModal(`topic-${topicKey}`)}
                                  className="text-blue-600 hover:text-blue-700"
                                  title="Add Context"
                                >
                                  <SafeIcon icon={FiMessageSquare} />
                                </button>
                                <button className="text-primary-600 hover:text-primary-700">
                                  <SafeIcon icon={FiEdit} />
                                </button>
                                <button className="text-red-600 hover:text-red-700">
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
                                      </div>
                                      <div className="flex items-center space-x-2">
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
                                          onClick={() => setShowContextModal(lessonKey)}
                                          className="text-blue-600 hover:text-blue-700"
                                          title="Add Context"
                                        >
                                          <SafeIcon icon={FiMessageSquare} />
                                        </button>
                                        <button className="text-primary-600 hover:text-primary-700">
                                          <SafeIcon icon={FiEdit} />
                                        </button>
                                        <button className="text-red-600 hover:text-red-700">
                                          <SafeIcon icon={FiTrash2} />
                                        </button>
                                      </div>
                                    </div>
                                  );
                                })}
                                <button className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm">
                                  <SafeIcon icon={FiPlus} />
                                  <span>Add Lesson</span>
                                </button>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                    <button className="flex items-center space-x-2 text-primary-600 hover:text-primary-700 text-sm">
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
                <textarea
                  className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Add any specific instructions, examples, or context for this item..."
                />
                <div className="flex justify-end space-x-3 mt-4">
                  <button
                    onClick={() => setShowContextModal(null)}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowContextModal(null)}
                    className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
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