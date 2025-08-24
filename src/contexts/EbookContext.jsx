import React, { createContext, useContext, useState } from 'react';
import { useSettings } from './SettingsContext';
import OpenAIService from '../services/openaiService';
import WordPressService from '../services/wordpressService';
import WebhookService from '../services/webhookService';

const EbookContext = createContext();

export const useEbook = () => {
  const context = useContext(EbookContext);
  if (!context) {
    throw new Error('useEbook must be used within an EbookProvider');
  }
  return context;
};

export const EbookProvider = ({ children }) => {
  const { settings } = useSettings();
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({
    step: '',
    progress: 0,
    message: ''
  });
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishingProgress, setPublishingProgress] = useState({
    step: '',
    progress: 0,
    message: '',
    currentItem: '',
    totalItems: 0,
    processedItems: 0,
    wordpressUrl: '',
    debug: {}
  });
  const [backgroundProcessing, setBackgroundProcessing] = useState(false);
  const [shouldAbortProcessing, setShouldAbortProcessing] = useState(false);
  const [abortController, setAbortController] = useState(null);

  const createProject = (projectData) => {
    const newProject = {
      id: Date.now().toString(),
      ...projectData,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      knowledgeLibraries: {} // Initialize empty knowledge libraries
    };

    setProjects(prev => [newProject, ...prev]);
    return newProject;
  };

  const updateProject = (projectId, updates) => {
    setProjects(prev =>
      prev.map(project =>
        project.id === projectId
          ? { ...project, ...updates, updatedAt: new Date().toISOString() }
          : project
      )
    );
  };

  const getProject = (projectId) => {
    return projects.find(project => project.id === projectId);
  };

  const deleteProject = (projectId) => {
    setProjects(prev => prev.filter(project => project.id !== projectId));
  };

  const generateOutline = async (projectData) => {
    // Check if OpenAI credentials are configured
    if (!settings.openaiPrimary) {
      throw new Error('OpenAI API key is not configured. Please check your settings.');
    }

    setIsGenerating(true);
    try {
      // Initialize OpenAI service with primary key
      let openaiService = new OpenAIService(settings.openaiPrimary);

      // Step 1: Market Research using gpt-4o-mini
      setGenerationProgress({
        step: 'research',
        progress: 10,
        message: 'Conducting market and audience research...'
      });

      let researchBrief;
      try {
        researchBrief = await openaiService.generateMarketResearch(
          projectData.niche,
          projectData.mustHaveAspects,
          projectData.otherConsiderations
        );
      } catch (error) {
        // Try fallback API key if available
        if (settings.openaiFallback && error.message.includes('rate_limit_exceeded')) {
          console.log('Primary API key rate limited, trying fallback...');
          openaiService = new OpenAIService(settings.openaiFallback);
          researchBrief = await openaiService.generateMarketResearch(
            projectData.niche,
            projectData.mustHaveAspects,
            projectData.otherConsiderations
          );
        } else {
          throw error;
        }
      }

      // Step 2: Generate Preface and Introduction
      setGenerationProgress({
        step: 'preface',
        progress: 30,
        message: 'Creating preface and introduction...'
      });

      const prefaceAndIntro = await openaiService.generatePrefaceAndIntroduction(
        researchBrief,
        projectData.mustHaveAspects,
        projectData.otherConsiderations
      );

      // Step 3: Generate Chapter Outline
      setGenerationProgress({
        step: 'chapters',
        progress: 50,
        message: 'Structuring chapter outline...'
      });

      const chapters = await openaiService.generateChapterOutline(
        researchBrief,
        projectData.mustHaveAspects,
        projectData.maxChapters,
        projectData.otherConsiderations
      );

      // Step 4: Generate detailed topics for each chapter
      setGenerationProgress({
        step: 'topics',
        progress: 70,
        message: 'Generating detailed chapter content...'
      });

      const chaptersWithTopics = [];
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        setGenerationProgress({
          step: 'topics',
          progress: 70 + (i / chapters.length) * 25,
          message: `Generating content for Chapter ${chapter.courseNumber}: ${chapter.courseTitle}...`
        });

        try {
          const topics = await openaiService.generateChapterTopics(
            researchBrief,
            chapter.courseTitle,
            chapter.courseDescription,
            projectData.mustHaveAspects
          );
          chaptersWithTopics.push({ ...chapter, topics });
        } catch (error) {
          console.error(`Error generating topics for chapter ${chapter.courseNumber}:`, error);
          // Add chapter without topics if there's an error
          chaptersWithTopics.push({ ...chapter, topics: [] });
        }

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Step 5: Finalize outline
      setGenerationProgress({
        step: 'finalizing',
        progress: 95,
        message: 'Finalizing ebook outline...'
      });

      // Extract title from research brief or generate one
      const titleMatch = researchBrief.match(/ebookTitle[":]\s*["']([^"']+)["']/i);
      const generatedTitle = titleMatch ? titleMatch[1] : `${projectData.niche} Mastery Guide`;

      const outline = {
        title: generatedTitle,
        researchBrief,
        preface: prefaceAndIntro.preface || '<h2>Preface</h2><p>This comprehensive guide will transform your understanding...</p>',
        introduction: prefaceAndIntro.introduction || '<h2>Introduction</h2><p>Welcome to your journey toward mastery...</p>',
        chapters: chaptersWithTopics
      };

      setGenerationProgress({
        step: 'complete',
        progress: 100,
        message: 'Ebook outline generated successfully!'
      });

      return outline;

    } catch (error) {
      console.error('Error generating outline:', error);
      throw new Error(error.message || 'Failed to generate ebook outline. Please check your API keys and try again.');
    } finally {
      setIsGenerating(false);
      setGenerationProgress({ step: '', progress: 0, message: '' });
    }
  };

  const abortPublishing = () => {
    console.log('🛑 ABORT REQUESTED - Setting abort flag to true');
    setShouldAbortProcessing(true);

    // Also abort any ongoing HTTP requests if we have an abort controller
    if (abortController) {
      console.log('🛑 Aborting HTTP requests via AbortController');
      abortController.abort();
    }

    // Update progress to show aborting state
    setPublishingProgress(prev => ({
      ...prev,
      step: 'aborting',
      message: 'Stopping content generation...'
    }));
  };

  const minimizePublishingWindow = () => {
    setBackgroundProcessing(true);
  };

  const restorePublishingWindow = () => {
    setBackgroundProcessing(false);
  };

  // Helper function to get the appropriate vector store ID for a lesson
  const getVectorStoreForLesson = (knowledgeLibraries, chapterIndex, topicIndex, lessonIndex) => {
    const lessonKey = `lesson-${chapterIndex}-${topicIndex}-${lessonIndex}`;
    const topicKey = `chapter-${chapterIndex}`;

    // Priority: lesson-specific > chapter-level
    return knowledgeLibraries[lessonKey] || knowledgeLibraries[topicKey] || null;
  };

  const publishToWordPress = async (project) => {
    // Create new abort controller for this publishing session
    const controller = new AbortController();
    setAbortController(controller);

    // Reset abort flag
    setShouldAbortProcessing(false);

    // Check if WordPress credentials are configured
    if (!settings.wordpressUrl || !settings.wordpressUsername || !settings.wordpressPassword) {
      throw new Error('WordPress credentials are not configured. Please check your settings.');
    }

    setIsPublishing(true);
    setPublishingProgress({
      step: 'preparing',
      progress: 0,
      message: 'Preparing to publish ebook to WordPress...',
      currentItem: '',
      totalItems: 0,
      processedItems: 0,
      wordpressUrl: settings.wordpressUrl,
      debug: {}
    });

    try {
      // Initialize services
      const wpService = new WordPressService(
        settings.wordpressUrl,
        settings.wordpressUsername,
        settings.wordpressPassword
      );
      
      // 🔗 Initialize Webhook Service
      const webhookService = new WebhookService();

      // Check for abort before each major step
      if (shouldAbortProcessing) {
        throw new Error('Publishing process aborted by user');
      }

      // Validate WordPress connection
      setPublishingProgress(prev => ({
        ...prev,
        message: 'Validating WordPress connection...'
      }));

      const connectionCheck = await wpService.validateConnection();
      if (!connectionCheck.success) {
        throw new Error(`WordPress connection failed: ${connectionCheck.error}`);
      }

      // Check for abort
      if (shouldAbortProcessing) {
        throw new Error('Publishing process aborted by user');
      }

      setPublishingProgress(prev => ({
        ...prev,
        message: 'WordPress connection validated, checking API availability...'
      }));

      // Check if WordPress REST API is available
      const apiCheck = await wpService.checkRestApiAvailability();
      if (!apiCheck.available) {
        throw new Error(`WordPress REST API not available: ${apiCheck.error}`);
      }

      // Check for abort
      if (shouldAbortProcessing) {
        throw new Error('Publishing process aborted by user');
      }

      setPublishingProgress(prev => ({
        ...prev,
        message: 'Verifying WordPress credentials...'
      }));

      // Verify WordPress credentials
      const credentialsCheck = await wpService.verifyCredentials();
      if (!credentialsCheck.valid) {
        throw new Error(`WordPress credentials invalid: ${credentialsCheck.error}`);
      }

      // Check for abort
      if (shouldAbortProcessing) {
        throw new Error('Publishing process aborted by user');
      }

      setPublishingProgress(prev => ({
        ...prev,
        debug: {
          ...prev.debug,
          connectionCheck,
          apiCheck,
          credentialsCheck
        }
      }));

      // Initialize OpenAI service for content generation
      const openaiService = new OpenAIService(settings.openaiPrimary);
      // Use fallback key if available
      const fallbackOpenaiService = settings.openaiFallback ? new OpenAIService(settings.openaiFallback) : null;

      const outline = project.outline;
      if (!outline) {
        throw new Error('No outline available for publishing');
      }

      // Get knowledge libraries from project
      const knowledgeLibraries = project.knowledgeLibraries || {};

      // Calculate total items to track progress
      let totalItems = 1; // Book
      totalItems += outline.chapters.length; // Chapters

      // Count topics and lessons
      let topicCount = 0;
      let lessonCount = 0;
      outline.chapters.forEach(chapter => {
        if (chapter.topics) {
          topicCount += chapter.topics.length;
          chapter.topics.forEach(topic => {
            if (topic.lessons) {
              lessonCount += topic.lessons.length;
            }
          });
        }
      });

      totalItems += topicCount + lessonCount;

      setPublishingProgress(prev => ({
        ...prev,
        step: 'book',
        progress: 0,
        message: 'Creating book in WordPress...',
        currentItem: outline.title,
        totalItems,
        processedItems: 0,
        debug: {
          ...prev.debug,
          totalItems,
          topicCount,
          lessonCount
        }
      }));

      // Step 1: Create the book
      const bookContent = `
        ${outline.preface || ''}
        ${outline.introduction || ''}
        ${outline.researchBrief ? `<div class="research-brief">${outline.researchBrief}</div>` : ''}
      `;

      console.log('Creating book in WordPress:', outline.title);
      const book = await wpService.createBook(outline.title, bookContent);

      if (!book || !book.id) {
        throw new Error('Failed to create book: No valid book ID returned');
      }

      const bookId = book.id;
      console.log('✅ Book created with ID:', bookId);
      console.log('📖 Book details:', book);

      // Check for abort after book creation
      if (shouldAbortProcessing) {
        throw new Error('Publishing process aborted by user');
      }

      setPublishingProgress(prev => ({
        ...prev,
        step: 'chapters',
        progress: Math.round((1 / totalItems) * 100),
        message: 'Creating chapters and nested content...',
        processedItems: 1,
        debug: {
          ...prev.debug,
          bookId,
          bookUrl: book.link
        }
      }));

      // Step 2: Create the complete hierarchical structure
      const createdStructure = [];
      let processedCount = 1; // Start with 1 for the book

      for (let chapterIndex = 0; chapterIndex < outline.chapters.length; chapterIndex++) {
        // Check if processing should be aborted
        if (shouldAbortProcessing) {
          console.log('🛑 ABORT DETECTED - Stopping chapter creation');
          throw new Error('Publishing process aborted by user');
        }

        const chapter = outline.chapters[chapterIndex];
        const chapterTitle = `Chapter ${chapter.courseNumber}: ${chapter.courseTitle}`;
        const chapterContent = `<p>${chapter.courseDescription}</p>`;

        setPublishingProgress(prev => ({
          ...prev,
          currentItem: chapterTitle,
          message: `Creating chapter ${chapterIndex + 1} of ${outline.chapters.length}...`
        }));

        // Create chapter with book as parent
        console.log(`📚 Creating chapter: ${chapterTitle} under book ID: ${bookId}`);
        const chapterPost = await wpService.createChapter(chapterTitle, chapterContent, bookId);

        if (!chapterPost || !chapterPost.id) {
          console.error('Failed to create chapter: No valid chapter ID returned');
          continue; // Skip this chapter but continue with others
        }

        const chapterId = chapterPost.id;
        console.log('✅ Chapter created with ID:', chapterId);

        // 🔗 WEBHOOK CALL: Link Book to Chapter
        console.log('🔗 Calling webhook to link book to chapter...');
        const bookToChapterResult = await webhookService.linkBookToChapter(bookId, chapterId);
        
        if (bookToChapterResult.success) {
          console.log('✅ Book-to-Chapter webhook successful');
        } else {
          console.warn('⚠️ Book-to-Chapter webhook failed:', bookToChapterResult.error);
          // Continue processing even if webhook fails
        }

        processedCount++;
        setPublishingProgress(prev => ({
          ...prev,
          progress: Math.round((processedCount / totalItems) * 100),
          processedItems: processedCount
        }));

        const chapterStructure = {
          chapter: {
            original: chapter,
            post: chapterPost,
            id: chapterId
          },
          topics: []
        };

        // Skip topics if none exist
        if (!chapter.topics || chapter.topics.length === 0) {
          createdStructure.push(chapterStructure);
          continue;
        }

        // Create all topics for this chapter
        for (let topicIndex = 0; topicIndex < chapter.topics.length; topicIndex++) {
          // Check if processing should be aborted
          if (shouldAbortProcessing) {
            console.log('🛑 ABORT DETECTED - Stopping topic creation');
            throw new Error('Publishing process aborted by user');
          }

          const topic = chapter.topics[topicIndex];
          const topicTitle = topic.topicTitle;

          setPublishingProgress(prev => ({
            ...prev,
            currentItem: `Generating content for: ${topicTitle}`,
            message: `Creating topic ${topicIndex + 1} of ${chapter.topics.length} for chapter ${chapterIndex + 1}...`
          }));

          // Generate topic introduction using AI
          console.log('🤖 Generating topic introduction for:', topicTitle);
          let topicIntroduction;
          try {
            // Check for abort before AI generation
            if (shouldAbortProcessing) {
              console.log('🛑 ABORT DETECTED - Stopping AI generation for topic');
              throw new Error('Publishing process aborted by user');
            }

            topicIntroduction = await openaiService.generateTopicIntroduction(
              outline.researchBrief,
              chapter.courseTitle,
              chapter.courseDescription,
              topicTitle,
              topic.topicLearningObjectiveDescription,
              topic.lessons
            );
          } catch (error) {
            // Check if this is an abort error
            if (error.message.includes('aborted')) {
              throw error;
            }

            console.error('Error generating topic introduction with primary key:', error);
            // Try fallback key if available
            if (fallbackOpenaiService) {
              console.log('Using fallback API key for topic introduction');
              try {
                // Check for abort before fallback
                if (shouldAbortProcessing) {
                  throw new Error('Publishing process aborted by user');
                }

                topicIntroduction = await fallbackOpenaiService.generateTopicIntroduction(
                  outline.researchBrief,
                  chapter.courseTitle,
                  chapter.courseDescription,
                  topicTitle,
                  topic.topicLearningObjectiveDescription,
                  topic.lessons
                );
              } catch (fallbackError) {
                console.error('Fallback also failed:', fallbackError);
                topicIntroduction = `An introduction to ${topicTitle}. This topic will help you understand important concepts related to ${chapter.courseTitle}.`;
              }
            } else {
              topicIntroduction = `An introduction to ${topicTitle}. This topic will help you understand important concepts related to ${chapter.courseTitle}.`;
            }
          }

          const topicContent = `<p>${topic.topicLearningObjectiveDescription}</p><div class="topic-introduction">${topicIntroduction}</div>`;

          // Create topic with chapter as parent
          console.log(`📝 Creating chapter topic: ${topicTitle} under chapter ID: ${chapterId}`);
          const topicPost = await wpService.createChapterTopic(topicTitle, topicContent, chapterId);

          if (!topicPost || !topicPost.id) {
            console.error('Failed to create topic: No valid topic ID returned');
            continue; // Skip this topic but continue with others
          }

          const topicId = topicPost.id;
          console.log('✅ Topic created with ID:', topicId);

          // 🔗 WEBHOOK CALL: Link Chapter to Topic
          console.log('🔗 Calling webhook to link chapter to topic...');
          const chapterToTopicResult = await webhookService.linkChapterToTopic(chapterId, topicId);
          
          if (chapterToTopicResult.success) {
            console.log('✅ Chapter-to-Topic webhook successful');
          } else {
            console.warn('⚠️ Chapter-to-Topic webhook failed:', chapterToTopicResult.error);
            // Continue processing even if webhook fails
          }

          processedCount++;
          setPublishingProgress(prev => ({
            ...prev,
            progress: Math.round((processedCount / totalItems) * 100),
            processedItems: processedCount
          }));

          const topicStructure = {
            topic: {
              original: topic,
              post: topicPost,
              id: topicId
            },
            sections: []
          };

          // Skip lessons if none exist
          if (!topic.lessons || topic.lessons.length === 0) {
            chapterStructure.topics.push(topicStructure);
            continue;
          }

          // Create all sections (lessons) for this topic
          for (let lessonIndex = 0; lessonIndex < topic.lessons.length; lessonIndex++) {
            // Check if processing should be aborted
            if (shouldAbortProcessing) {
              console.log('🛑 ABORT DETECTED - Stopping lesson creation');
              throw new Error('Publishing process aborted by user');
            }

            const lesson = topic.lessons[lessonIndex];
            const lessonTitle = lesson.lessonTitle;

            // Get vector store ID for this lesson (RAG enhancement)
            const vectorStoreId = getVectorStoreForLesson(knowledgeLibraries, chapterIndex, topicIndex, lessonIndex);

            setPublishingProgress(prev => ({
              ...prev,
              currentItem: `Generating content for: ${lessonTitle}${vectorStoreId ? ' (with RAG)' : ''}`,
              message: `Creating lesson ${lessonIndex + 1} of ${topic.lessons.length} for topic ${topicIndex + 1}...`
            }));

            const fullContext = `
              ${outline.researchBrief}
              Chapter: ${chapter.courseTitle}
              Chapter Description: ${chapter.courseDescription}
              Topic: ${topicTitle}
              Topic Objective: ${topic.topicLearningObjectiveDescription}
            `;

            console.log(`🤖 Generating section content for: ${lessonTitle}${vectorStoreId ? ' with RAG' : ''}`);
            let sectionContent;
            try {
              // Check for abort before AI generation
              if (shouldAbortProcessing) {
                console.log('🛑 ABORT DETECTED - Stopping AI generation for lesson');
                throw new Error('Publishing process aborted by user');
              }

              sectionContent = await openaiService.generateSectionContent(
                fullContext,
                lessonTitle,
                lesson.lessonDescription,
                'Step-by-step guide with examples',
                'Practical and actionable',
                lesson.userAddedContext || '',
                vectorStoreId // Pass vector store ID for RAG
              );
            } catch (error) {
              // Check if this is an abort error
              if (error.message.includes('aborted')) {
                throw error;
              }

              console.error('Error generating section content with primary key:', error);
              // Try fallback key if available
              if (fallbackOpenaiService) {
                console.log('Using fallback API key for section content');
                try {
                  // Check for abort before fallback
                  if (shouldAbortProcessing) {
                    throw new Error('Publishing process aborted by user');
                  }

                  sectionContent = await fallbackOpenaiService.generateSectionContent(
                    fullContext,
                    lessonTitle,
                    lesson.lessonDescription,
                    'Step-by-step guide with examples',
                    'Practical and actionable',
                    lesson.userAddedContext || '',
                    vectorStoreId // Pass vector store ID for RAG
                  );
                } catch (fallbackError) {
                  console.error('Fallback also failed:', fallbackError);
                  sectionContent = `<h2>${lessonTitle}</h2><p>${lesson.lessonDescription}</p><p>Content will be available soon.</p>`;
                }
              } else {
                sectionContent = `<h2>${lessonTitle}</h2><p>${lesson.lessonDescription}</p><p>Content will be available soon.</p>`;
              }
            }

            const lessonContent = `
              <div class="lesson-description">${lesson.lessonDescription}</div>
              <div class="lesson-content">${sectionContent}</div>
            `;

            // Create section (lesson) with topic as parent
            console.log(`📖 Creating topic section: ${lessonTitle} under topic ID: ${topicId}`);
            const sectionPost = await wpService.createTopicSection(lessonTitle, lessonContent, topicId);

            if (!sectionPost || !sectionPost.id) {
              console.error('Failed to create lesson: No valid section ID returned');
              continue; // Skip this lesson but continue with others
            }

            const sectionId = sectionPost.id;
            console.log('✅ Section created with ID:', sectionId);

            // 🔗 WEBHOOK CALL: Link Topic to Section
            console.log('🔗 Calling webhook to link topic to section...');
            const topicToSectionResult = await webhookService.linkTopicToSection(topicId, sectionId);
            
            if (topicToSectionResult.success) {
              console.log('✅ Topic-to-Section webhook successful');
            } else {
              console.warn('⚠️ Topic-to-Section webhook failed:', topicToSectionResult.error);
              // Continue processing even if webhook fails
            }

            processedCount++;
            setPublishingProgress(prev => ({
              ...prev,
              progress: Math.round((processedCount / totalItems) * 100),
              processedItems: processedCount
            }));

            // Add section to topic structure
            topicStructure.sections.push({
              original: lesson,
              post: sectionPost,
              id: sectionId,
              usedRAG: !!vectorStoreId
            });

            // Check for abort after lesson creation
            if (shouldAbortProcessing) {
              console.log('🛑 ABORT DETECTED - Stopping after lesson creation');
              throw new Error('Publishing process aborted by user');
            }
          }

          // Add topic to chapter structure
          chapterStructure.topics.push(topicStructure);

          // Check for abort after topic creation
          if (shouldAbortProcessing) {
            console.log('🛑 ABORT DETECTED - Stopping after topic creation');
            throw new Error('Publishing process aborted by user');
          }
        }

        // Add chapter to main structure
        createdStructure.push(chapterStructure);

        // Check for abort after chapter completion
        if (shouldAbortProcessing) {
          console.log('🛑 ABORT DETECTED - Stopping after chapter completion');
          throw new Error('Publishing process aborted by user');
        }
      }

      // Update project status
      updateProject(project.id, {
        status: 'published',
        wordpressBookId: bookId,
        publishedData: {
          bookId,
          bookUrl: book.link,
          structure: createdStructure
        }
      });

      setPublishingProgress({
        step: 'complete',
        progress: 100,
        message: 'Publishing completed successfully!',
        currentItem: '',
        totalItems,
        processedItems: totalItems,
        wordpressUrl: settings.wordpressUrl,
        debug: {
          book,
          createdStructure,
          totalCreated: processedCount,
          hierarchicalStructure: 'Book -> Chapters -> Topics -> Sections',
          webhooksUsed: 'All three webhook levels implemented'
        }
      });

      return {
        success: true,
        message: 'Successfully published to WordPress',
        bookId,
        bookUrl: book.link
      };

    } catch (error) {
      console.error('Error publishing to WordPress:', error);

      // Check if this was a user-initiated abort
      if (shouldAbortProcessing || error.message.includes('aborted')) {
        console.log('🛑 Publishing was aborted by user');
        setPublishingProgress(prev => ({
          ...prev,
          step: 'aborted',
          message: 'Publishing process was cancelled by user',
          debug: {
            ...prev.debug,
            error: 'User aborted process',
            abortedAt: new Date().toISOString()
          }
        }));
      } else {
        setPublishingProgress(prev => ({
          ...prev,
          step: 'error',
          message: `Error: ${error.message}`,
          debug: {
            ...prev.debug,
            error: error.message,
            stack: error.stack
          }
        }));
      }

      throw error;
    } finally {
      // Clean up abort controller
      setAbortController(null);

      // Don't reset isPublishing here if we're in background mode
      if (!backgroundProcessing) {
        setIsPublishing(false);
      }

      // Always reset abort flag
      setShouldAbortProcessing(false);
    }
  };

  const value = {
    projects,
    currentProject,
    setCurrentProject,
    isGenerating,
    generationProgress,
    isPublishing,
    publishingProgress,
    backgroundProcessing,
    createProject,
    updateProject,
    getProject,
    deleteProject,
    generateOutline,
    publishToWordPress,
    abortPublishing,
    minimizePublishingWindow,
    restorePublishingWindow
  };

  return (
    <EbookContext.Provider value={value}>
      {children}
    </EbookContext.Provider>
  );
};