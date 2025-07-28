import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useEbook } from '../contexts/EbookContext';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiBookOpen, FiCalendar, FiTag, FiLayers, FiArrowLeft } = FiIcons;

const ProjectDetails = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject } = useEbook();
  const [project, setProject] = useState(null);

  useEffect(() => {
    const projectData = getProject(projectId);
    if (projectData) {
      setProject(projectData);
    } else {
      navigate('/dashboard');
    }
  }, [projectId, getProject, navigate]);

  if (!project) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading project...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center space-x-4 mb-8">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <SafeIcon icon={FiArrowLeft} className="text-xl" />
        </button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Project Details</h1>
          <p className="text-gray-600 mt-1">{project.niche}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Project Overview */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center space-x-3 mb-6">
            <SafeIcon icon={FiBookOpen} className="text-xl text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Project Overview</h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Must-Have Aspects</h3>
              <p className="text-gray-900">{project.mustHaveAspects}</p>
            </div>

            {project.otherConsiderations && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Other Considerations</h3>
                <p className="text-gray-900">{project.otherConsiderations}</p>
              </div>
            )}

            {project.outline && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-4">Generated Outline</h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-900">{project.outline.title}</h4>
                  </div>
                  
                  <div className="space-y-2">
                    {project.outline.chapters.map((chapter, index) => (
                      <div key={index} className="border-l-2 border-primary-200 pl-4">
                        <h5 className="font-medium text-gray-900">
                          Chapter {chapter.courseNumber}: {chapter.courseTitle}
                        </h5>
                        <p className="text-sm text-gray-600">{chapter.courseDescription}</p>
                        
                        {chapter.topics && (
                          <div className="mt-2 space-y-1">
                            {chapter.topics.map((topic, topicIndex) => (
                              <div key={topicIndex} className="ml-4">
                                <p className="text-sm font-medium text-gray-700">{topic.topicTitle}</p>
                                {topic.lessons && (
                                  <ul className="ml-4 text-xs text-gray-600">
                                    {topic.lessons.map((lesson, lessonIndex) => (
                                      <li key={lessonIndex}>• {lesson.lessonTitle}</li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Project Metadata */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-6"
        >
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Project Info</h3>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <SafeIcon icon={FiTag} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Niche</p>
                  <p className="text-gray-900">{project.niche}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <SafeIcon icon={FiLayers} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Max Chapters</p>
                  <p className="text-gray-900">{project.maxChapters}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <SafeIcon icon={FiCalendar} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Created</p>
                  <p className="text-gray-900">{new Date(project.createdAt).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <SafeIcon icon={FiCalendar} className="text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Last Updated</p>
                  <p className="text-gray-900">{new Date(project.updatedAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Status</h3>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              project.status === 'published' ? 'bg-green-100 text-green-800' :
              project.status === 'review' ? 'bg-blue-100 text-blue-800' :
              project.status === 'generating' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {project.status}
            </span>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ProjectDetails;