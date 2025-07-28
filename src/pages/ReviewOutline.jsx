import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useEbook } from '../contexts/EbookContext';
import OutlineEditor from '../components/OutlineEditor';
import PublishingProgress from '../components/PublishingProgress';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiCheck, FiEdit, FiPlus, FiTrash2, FiArrowLeft } = FiIcons;

const ReviewOutline = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { getProject, updateProject, publishToWordPress, isPublishing, publishingProgress, backgroundProcessing } = useEbook();
  const [project, setProject] = useState(null);

  useEffect(() => {
    const projectData = getProject(projectId);
    if (projectData) {
      setProject(projectData);
    } else {
      navigate('/dashboard');
    }
  }, [projectId, getProject, navigate]);

  const handleProjectUpdate = (updatedProject) => {
    setProject(updatedProject);
    updateProject(updatedProject.id, updatedProject);
  };

  const handleApproveAndProceed = async () => {
    try {
      const result = await publishToWordPress(project);
      if (result.success) {
        toast.success('Ebook published to WordPress successfully!');
        // Navigate after a short delay to allow the success message to be visible
        setTimeout(() => {
          navigate('/dashboard');
        }, 2000);
      }
    } catch (error) {
      // Don't show toast if in background mode as the progress component will show the error
      if (!backgroundProcessing) {
        toast.error(`Publishing failed: ${error.message}`);
      }
      console.error('Publishing error:', error);
    }
  };

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
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <SafeIcon icon={FiArrowLeft} className="text-xl" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Review Ebook Outline</h1>
            <p className="text-gray-600 mt-1">{project.niche}</p>
          </div>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleApproveAndProceed}
          disabled={isPublishing || project.status === 'published'}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg transition-colors ${
            project.status === 'published'
              ? 'bg-green-100 text-green-800 cursor-not-allowed'
              : 'bg-green-600 text-white hover:bg-green-700'
          } disabled:opacity-50`}
        >
          {isPublishing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Publishing...</span>
            </>
          ) : project.status === 'published' ? (
            <>
              <SafeIcon icon={FiCheck} />
              <span>Published</span>
            </>
          ) : (
            <>
              <SafeIcon icon={FiCheck} />
              <span>Approve & Publish</span>
            </>
          )}
        </motion.button>
      </div>

      <OutlineEditor project={project} onUpdateProject={handleProjectUpdate} />

      {/* Publishing Progress Modal - Only show if not in background mode */}
      <AnimatePresence>
        {isPublishing && !backgroundProcessing && (
          <PublishingProgress
            progress={publishingProgress}
            isVisible={isPublishing && !backgroundProcessing}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default ReviewOutline;