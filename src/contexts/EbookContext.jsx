import React,{createContext,useContext,useState} from 'react';
import {useSettings} from './SettingsContext';
import OpenAIService from '../services/openaiService';
import PerplexityService from '../services/perplexityService';
import WordPressService from '../services/wordpressService';
import WebhookService from '../services/webhookService';

const EbookContext=createContext();

export const useEbook=()=> {
const context=useContext(EbookContext);
if (!context) {
throw new Error('useEbook must be used within an EbookProvider');
}
return context;
};

export const EbookProvider=({children})=> {
const {settings}=useSettings();
const [projects,setProjects]=useState([]);
const [currentProject,setCurrentProject]=useState(null);
const [isGenerating,setIsGenerating]=useState(false);
const [generationProgress,setGenerationProgress]=useState({
step: '',
progress: 0,
message: ''
});
const [isPublishing,setIsPublishing]=useState(false);
const [publishingProgress,setPublishingProgress]=useState({
step: '',
progress: 0,
message: '',
currentItem: '',
totalItems: 0,
processedItems: 0,
wordpressUrl: '',
debug: {}
});
const [backgroundProcessing,setBackgroundProcessing]=useState(false);
const [shouldAbortProcessing,setShouldAbortProcessing]=useState(false);
const [abortController,setAbortController]=useState(null);

const createProject=(projectData)=> {
const newProject={
id: Date.now().toString(),
...projectData,
status: 'draft',
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString(),
knowledgeLibraries: {},
contextValues: {} // Add context values storage
};

setProjects(prev=> [newProject,...prev]);
return newProject;
};

const updateProject=(projectId,updates)=> {
setProjects(prev=>
prev.map(project=>
project.id===projectId
? {...project,...updates,updatedAt: new Date().toISOString()}
: project
)
);
};

const getProject=(projectId)=> {
return projects.find(project=> project.id===projectId);
};

const deleteProject=(projectId)=> {
setProjects(prev=> prev.filter(project=> project.id !==projectId));
};

const generateOutline=async (projectData)=> {
// ✅ FIXED: API key validation with proper method checking
console.log('🔍 Checking API key configuration...');
console.log('Research method:',projectData.researchLLM);
console.log('Content generation method:',projectData.contentGenerationLLM);
console.log('Include web references:',projectData.includeWebReferences);  // ✅ NEW: Log web references setting

// Check research method API key
if (projectData.researchLLM==='perplexity') {
if (!settings.perplexityPrimary) {
throw new Error('Perplexity API key is not configured for research. Please check your settings.');
}
console.log('✅ Perplexity API key found for research');
} else if (projectData.researchLLM==='openai') {
if (!settings.openaiPrimary) {
throw new Error('OpenAI API key is not configured for research. Please check your settings.');
}
console.log('✅ OpenAI API key found for research');
}

// Check content generation method API key
if (projectData.contentGenerationLLM==='perplexity') {
if (!settings.perplexityPrimary) {
throw new Error('Perplexity API key is not configured for content generation. Please check your settings.');
}
if (!settings.openaiPrimary) {
throw new Error('OpenAI API key is also required when using Perplexity for content generation (for final content synthesis). Please check your settings.');
}
console.log('✅ Both Perplexity and OpenAI API keys found for hybrid content generation');
} else if (projectData.contentGenerationLLM==='openai') {
if (!settings.openaiPrimary) {
throw new Error('OpenAI API key is not configured for content generation. Please check your settings.');
}
console.log('✅ OpenAI API key found for content generation');
}

// ✅ NEW: Check web references API key requirement
if (projectData.includeWebReferences==='yes') {
if (!settings.perplexityPrimary) {
throw new Error('Perplexity API key is required for web references. Please check your settings.');
}
console.log('✅ Perplexity API key found for web references');
} else {
console.log('ℹ️ Web references disabled, no additional API key needed');
}

setIsGenerating(true);
try {
let researchBrief;

// Step 1: Market Research using selected LLM
setGenerationProgress({
step: 'research',
progress: 10,
message: `Conducting market and audience research using ${projectData.researchLLM==='perplexity' ? 'Perplexity Sonar Research' : 'OpenAI'}...`
});

if (projectData.researchLLM==='perplexity') {
console.log('🔍 Using Perplexity Sonar for market research...');
let perplexityService=new PerplexityService(settings.perplexityPrimary);
try {
researchBrief=await perplexityService.generateDeepResearch(
projectData.niche,
projectData.mustHaveAspects,
projectData.otherConsiderations
);
console.log('✅ Perplexity Sonar research completed successfully');
} catch (error) {
console.error('❌ Perplexity research failed:',error.message);
if (settings.perplexityFallback && error.message.includes('rate_limit_exceeded')) {
console.log('🔄 Primary Perplexity key rate limited,trying fallback...');
perplexityService=new PerplexityService(settings.perplexityFallback);
researchBrief=await perplexityService.generateDeepResearch(
projectData.niche,
projectData.mustHaveAspects,
projectData.otherConsiderations
);
console.log('✅ Fallback Perplexity research completed successfully');
} else {
throw new Error(`Perplexity research failed: ${error.message}. Please check your Perplexity API key in settings.`);
}
}
} else {
console.log('🔍 Using OpenAI for market research...');
// ✅ FIXED: Use correct API key for OpenAI research
let openaiService=new OpenAIService(settings.openaiPrimary);
try {
researchBrief=await openaiService.generateMarketResearch(
projectData.niche,
projectData.mustHaveAspects,
projectData.otherConsiderations
);
console.log('✅ OpenAI research completed successfully');
} catch (error) {
console.error('❌ OpenAI research failed:',error.message);
if (settings.openaiFallback && error.message.includes('rate_limit_exceeded')) {
console.log('🔄 Primary OpenAI key rate limited,trying fallback...');
openaiService=new OpenAIService(settings.openaiFallback);
researchBrief=await openaiService.generateMarketResearch(
projectData.niche,
projectData.mustHaveAspects,
projectData.otherConsiderations
);
console.log('✅ Fallback OpenAI research completed successfully');
} else {
throw new Error(`OpenAI research failed: ${error.message}. Please check your OpenAI API key in settings.`);
}
}
}

// Validate research brief
if (!researchBrief || researchBrief.trim().length===0) {
throw new Error('Research brief generation failed - empty response received');
}

console.log('📝 Research brief generated successfully');
console.log('🔍 Research brief length:',researchBrief.length,'characters');

// ✅ Use OpenAI for outline generation steps (always)
console.log('📝 Using OpenAI for outline generation steps...');
let openaiService=new OpenAIService(settings.openaiPrimary);

// Step 2: Generate Preface and Introduction
setGenerationProgress({
step: 'preface',
progress: 30,
message: 'Creating preface and introduction...'
});

const prefaceAndIntro=await openaiService.generatePrefaceAndIntroduction(
researchBrief,
projectData.mustHaveAspects,
projectData.otherConsiderations
);
console.log('✅ Preface and introduction generated');

// Step 3: Generate Chapter Outline
setGenerationProgress({
step: 'chapters',
progress: 50,
message: 'Structuring chapter outline...'
});

const chapters=await openaiService.generateChapterOutline(
researchBrief,
projectData.mustHaveAspects,
projectData.maxChapters,
projectData.otherConsiderations
);
console.log('✅ Chapter outline generated:',chapters?.length || 0,'chapters');

// Step 4: Generate detailed topics for each chapter
setGenerationProgress({
step: 'topics',
progress: 70,
message: 'Generating detailed chapter content...'
});

const chaptersWithTopics=[];
for (let i=0;i < chapters.length;i++) {
const chapter=chapters[i];
setGenerationProgress({
step: 'topics',
progress: 70 + (i / chapters.length) * 25,
message: `Generating content for Chapter ${chapter.courseNumber}: ${chapter.courseTitle}...`
});

try {
console.log(`🔍 Generating topics for chapter ${chapter.courseNumber}: ${chapter.courseTitle}`);
const topics=await openaiService.generateChapterTopics(
researchBrief,
chapter.courseTitle,
chapter.courseDescription,
projectData.mustHaveAspects
);
console.log(`✅ Topics generated for chapter ${chapter.courseNumber}:`,topics?.length || 0,'topics');
chaptersWithTopics.push({
...chapter,
topics
});
} catch (error) {
console.error(`❌ Error generating topics for chapter ${chapter.courseNumber}:`,error);
chaptersWithTopics.push({
...chapter,
topics: []
});
}

await new Promise(resolve=> setTimeout(resolve,1000));
}

// Step 5: Finalize outline
setGenerationProgress({
step: 'finalizing',
progress: 95,
message: 'Finalizing ebook outline...'
});

// ✅ FIXED: Better title extraction and fallback
const titleMatch=researchBrief.match(/ebookTitle[":]\s*["']([^"']+)["']/i);
const generatedTitle=titleMatch ? titleMatch[1] : `${projectData.niche} Mastery Guide`;

console.log('📚 Generated title:',generatedTitle);
console.log('📊 Final outline structure:',{
title: generatedTitle,
chaptersCount: chaptersWithTopics.length,
totalTopics: chaptersWithTopics.reduce((sum,ch)=> sum + (ch.topics?.length || 0),0),
totalLessons: chaptersWithTopics.reduce((sum,ch)=> sum + (ch.topics?.reduce((topicSum,topic)=> topicSum + (topic.lessons?.length || 0),0) || 0),0),
includeWebReferences: projectData.includeWebReferences  // ✅ NEW: Log web references setting
});

// ✅ FIXED: Properly construct the outline object
const outline={
title: generatedTitle,
researchBrief,
researchMethod: projectData.researchLLM,
contentGenerationMethod: projectData.contentGenerationLLM,
includeWebReferences: projectData.includeWebReferences,  // ✅ NEW: Store web references setting
preface: prefaceAndIntro.preface || '<h2>Preface</h2><p>This comprehensive guide will transform your understanding...</p>',
introduction: prefaceAndIntro.introduction || '<h2>Introduction</h2><p>Welcome to your journey toward mastery...</p>',
chapters: chaptersWithTopics
};

setGenerationProgress({
step: 'complete',
progress: 100,
message: 'Ebook outline generated successfully!'
});

console.log('✅ Complete outline generated successfully');
return outline;
} catch (error) {
console.error('❌ Error generating outline:',error);
throw new Error(error.message || 'Failed to generate ebook outline. Please check your API keys and try again.');
} finally {
setIsGenerating(false);
setGenerationProgress({
step: '',
progress: 0,
message: ''
});
}
};

const abortPublishing=()=> {
console.log('🛑 ABORT REQUESTED - Setting abort flag to true');
setShouldAbortProcessing(true);

if (abortController) {
console.log('🛑 Aborting HTTP requests via AbortController');
abortController.abort();
}

setPublishingProgress(prev=> ({
...prev,
step: 'aborting',
message: 'Stopping content generation...'
}));
};

const minimizePublishingWindow=()=> {
setBackgroundProcessing(true);
};

const restorePublishingWindow=()=> {
setBackgroundProcessing(false);
};

const getVectorStoreForLesson=(knowledgeLibraries,chapterIndex,topicIndex,lessonIndex)=> {
const lessonKey=`lesson-${chapterIndex}-${topicIndex}-${lessonIndex}`;
const topicKey=`chapter-${chapterIndex}`;
return knowledgeLibraries[lessonKey] || knowledgeLibraries[topicKey] || null;
};

// ✅ FIXED: Enhanced context handling in publishing
const getContextForItem=(outline,chapterIndex,topicIndex=null,lessonIndex=null)=> {
if (lessonIndex !==null && topicIndex !==null) {
// Lesson context
const lesson=outline.chapters?.[chapterIndex]?.topics?.[topicIndex]?.lessons?.[lessonIndex];
return lesson?.userAddedContext || '';
} else if (topicIndex !==null) {
// Topic context
const topic=outline.chapters?.[chapterIndex]?.topics?.[topicIndex];
return topic?.userAddedContext || '';
} else {
// Chapter context
const chapter=outline.chapters?.[chapterIndex];
return chapter?.userAddedContext || '';
}
};

const publishToWordPress=async (project)=> {
const controller=new AbortController();
setAbortController(controller);
setShouldAbortProcessing(false);

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
const wpService=new WordPressService(
settings.wordpressUrl,
settings.wordpressUsername,
settings.wordpressPassword
);
const webhookService=new WebhookService();

// Validate connection
if (shouldAbortProcessing) {
throw new Error('Publishing process aborted by user');
}

setPublishingProgress(prev=> ({
...prev,
message: 'Validating WordPress connection...'
}));

const connectionCheck=await wpService.validateConnection();
if (!connectionCheck.success) {
throw new Error(`WordPress connection failed: ${connectionCheck.error}`);
}

// ✅ Initialize services based on content generation method with proper API keys
const contentGenerationMethod=project.outline?.contentGenerationMethod || 'openai';
const includeWebReferences=project.outline?.includeWebReferences || project.includeWebReferences || 'no';  // ✅ NEW: Get web references setting

console.log(`🔧 Using content generation method: ${contentGenerationMethod}`);
console.log(`🔧 Include web references: ${includeWebReferences}`);

let openaiService;
let perplexityService=null;

if (contentGenerationMethod==='perplexity') {
console.log('🔧 Initializing hybrid Perplexity + OpenAI services...');
if (!settings.openaiPrimary) {
throw new Error('OpenAI API key is required for content generation even when using Perplexity for web context. Please configure OpenAI API key in settings.');
}
openaiService=new OpenAIService(settings.openaiPrimary);
console.log('✅ OpenAI service initialized for final content generation');

if (settings.perplexityPrimary) {
perplexityService=new PerplexityService(settings.perplexityPrimary);
console.log('✅ Perplexity Sonar service initialized for web search context');
} else {
console.warn('⚠️ Perplexity not configured,will skip web search context');
}
} else {
console.log('🔧 Initializing OpenAI-only service...');
if (!settings.openaiPrimary) {
throw new Error('OpenAI API key is required for content generation. Please configure OpenAI API key in settings.');
}
openaiService=new OpenAIService(settings.openaiPrimary);
console.log('✅ OpenAI service initialized for direct content generation');
}

// ✅ NEW: Initialize Perplexity service for web references if needed
if (includeWebReferences==='yes' && !perplexityService && settings.perplexityPrimary) {
perplexityService=new PerplexityService(settings.perplexityPrimary);
console.log('✅ Perplexity service initialized for web references');
} else if (includeWebReferences==='yes' && !settings.perplexityPrimary) {
console.warn('⚠️ Web references requested but Perplexity not configured, will skip references');
}

const fallbackOpenaiService=settings.openaiFallback ? new OpenAIService(settings.openaiFallback) : null;

const outline=project.outline;
if (!outline) {
throw new Error('No outline available for publishing');
}

const knowledgeLibraries=project.knowledgeLibraries || {};

// Calculate total items
let totalItems=1;// Book
totalItems +=outline.chapters.length;// Chapters
let topicCount=0;
let lessonCount=0;

outline.chapters.forEach(chapter=> {
if (chapter.topics) {
topicCount +=chapter.topics.length;
chapter.topics.forEach(topic=> {
if (topic.lessons) {
lessonCount +=topic.lessons.length;
}
});
}
});

totalItems +=topicCount + lessonCount;

setPublishingProgress(prev=> ({
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
lessonCount,
contentMethod: contentGenerationMethod,
includeWebReferences  // ✅ NEW: Log web references setting
}
}));

// Create the book
const bookContent=`
${outline.preface || ''}
${outline.introduction || ''}
${outline.researchBrief ? `<div class="research-brief">${outline.researchBrief}</div>` : ''}
`;

const book=await wpService.createBook(outline.title,bookContent);
if (!book || !book.id) {
throw new Error('Failed to create book: No valid book ID returned');
}

const bookId=book.id;
console.log('✅ Book created with ID:',bookId);

if (shouldAbortProcessing) {
throw new Error('Publishing process aborted by user');
}

setPublishingProgress(prev=> ({
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

// Create hierarchical structure
const createdStructure=[];
let processedCount=1;

for (let chapterIndex=0;chapterIndex < outline.chapters.length;chapterIndex++) {
if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping chapter creation');
throw new Error('Publishing process aborted by user');
}

const chapter=outline.chapters[chapterIndex];
const chapterTitle=`Chapter ${chapter.courseNumber}: ${chapter.courseTitle}`;

// ✅ FIXED: Include chapter context in content
const chapterContext=getContextForItem(outline,chapterIndex);
const chapterContent=`<p>${chapter.courseDescription}</p>${chapterContext ? `<div class="chapter-context"><h4>Additional Context:</h4><p>${chapterContext}</p></div>` : ''}`;

setPublishingProgress(prev=> ({
...prev,
currentItem: chapterTitle,
message: `Creating chapter ${chapterIndex + 1} of ${outline.chapters.length}...`
}));

const chapterPost=await wpService.createChapter(chapterTitle,chapterContent,bookId);
if (!chapterPost || !chapterPost.id) {
console.error('Failed to create chapter: No valid chapter ID returned');
continue;
}

const chapterId=chapterPost.id;
console.log('✅ Chapter created with ID:',chapterId);

// Webhook call
const bookToChapterResult=await webhookService.linkBookToChapter(bookId,chapterId);
if (bookToChapterResult.success) {
console.log('✅ Book-to-Chapter webhook successful');
} else {
console.warn('⚠️ Book-to-Chapter webhook failed:',bookToChapterResult.error);
}

processedCount++;
setPublishingProgress(prev=> ({
...prev,
progress: Math.round((processedCount / totalItems) * 100),
processedItems: processedCount
}));

const chapterStructure={
chapter: {
original: chapter,
post: chapterPost,
id: chapterId
},
topics: []
};

if (!chapter.topics || chapter.topics.length===0) {
createdStructure.push(chapterStructure);
continue;
}

// Create topics for this chapter
for (let topicIndex=0;topicIndex < chapter.topics.length;topicIndex++) {
if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping topic creation');
throw new Error('Publishing process aborted by user');
}

const topic=chapter.topics[topicIndex];
const topicTitle=topic.topicTitle;

setPublishingProgress(prev=> ({
...prev,
currentItem: `Generating content for: ${topicTitle}${includeWebReferences==='yes' ? ' (with web references)' : ''}`,
message: `Creating topic ${topicIndex + 1} of ${chapter.topics.length} for chapter ${chapterIndex + 1}...`
}));

// Generate topic introduction using AI
console.log('🤖 Generating topic introduction for:',topicTitle);
let topicIntroduction;
try {
if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping AI generation for topic');
throw new Error('Publishing process aborted by user');
}

topicIntroduction=await openaiService.generateTopicIntroduction(
outline.researchBrief,
chapter.courseTitle,
chapter.courseDescription,
topicTitle,
topic.topicLearningObjectiveDescription,
topic.lessons
);
} catch (error) {
if (error.message.includes('aborted')) {
throw error;
}
console.error('Error generating topic introduction with primary key:',error);
if (fallbackOpenaiService) {
console.log('Using fallback API key for topic introduction');
try {
if (shouldAbortProcessing) {
throw new Error('Publishing process aborted by user');
}
topicIntroduction=await fallbackOpenaiService.generateTopicIntroduction(
outline.researchBrief,
chapter.courseTitle,
chapter.courseDescription,
topicTitle,
topic.topicLearningObjectiveDescription,
topic.lessons
);
} catch (fallbackError) {
console.error('Fallback also failed:',fallbackError);
topicIntroduction=`An introduction to ${topicTitle}. This topic will help you understand important concepts related to ${chapter.courseTitle}.`;
}
} else {
topicIntroduction=`An introduction to ${topicTitle}. This topic will help you understand important concepts related to ${chapter.courseTitle}.`;
}
}

// ✅ NEW: Generate web references if enabled
let webReferencesHtml='';
if (includeWebReferences==='yes' && perplexityService) {
try {
console.log(`🔍 Generating web references for topic: ${topicTitle}`);
const webReferences=await perplexityService.generateTopicReferences(
outline.title,
topicTitle
);
if (webReferences) {
webReferencesHtml=perplexityService.formatWebReferencesForContent(webReferences);
console.log('✅ Web references generated and formatted for topic');
}
} catch (error) {
console.warn('⚠️ Web references generation failed, continuing without:',error.message);
}
}

// ✅ FIXED: Include topic context in content
const topicContext=getContextForItem(outline,chapterIndex,topicIndex);
const topicContent=`<p>${topic.topicLearningObjectiveDescription}</p><div class="topic-introduction">${topicIntroduction}</div>${topicContext ? `<div class="topic-context"><h4>Additional Context:</h4><p>${topicContext}</p></div>` : ''}${webReferencesHtml}`;

const topicPost=await wpService.createChapterTopic(topicTitle,topicContent,chapterId);
if (!topicPost || !topicPost.id) {
console.error('Failed to create topic: No valid topic ID returned');
continue;
}

const topicId=topicPost.id;
console.log('✅ Topic created with ID:',topicId);

// Webhook call
const chapterToTopicResult=await webhookService.linkChapterToTopic(chapterId,topicId);
if (chapterToTopicResult.success) {
console.log('✅ Chapter-to-Topic webhook successful');
} else {
console.warn('⚠️ Chapter-to-Topic webhook failed:',chapterToTopicResult.error);
}

processedCount++;
setPublishingProgress(prev=> ({
...prev,
progress: Math.round((processedCount / totalItems) * 100),
processedItems: processedCount
}));

const topicStructure={
topic: {
original: topic,
post: topicPost,
id: topicId,
hasWebReferences: !!webReferencesHtml  // ✅ NEW: Track if web references were added
},
sections: []
};

if (!topic.lessons || topic.lessons.length===0) {
chapterStructure.topics.push(topicStructure);
continue;
}

// Create sections (lessons) for this topic
for (let lessonIndex=0;lessonIndex < topic.lessons.length;lessonIndex++) {
if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping lesson creation');
throw new Error('Publishing process aborted by user');
}

const lesson=topic.lessons[lessonIndex];
const lessonTitle=lesson.lessonTitle;
const vectorStoreId=getVectorStoreForLesson(knowledgeLibraries,chapterIndex,topicIndex,lessonIndex);

setPublishingProgress(prev=> ({
...prev,
currentItem: `Generating content for: ${lessonTitle}${vectorStoreId ? ' (with RAG)' : ''}${perplexityService ? ' (with web context)' : ''}`,
message: `Creating lesson ${lessonIndex + 1} of ${topic.lessons.length} for topic ${topicIndex + 1}...`
}));

const fullContext=`
${outline.researchBrief}

Chapter: ${chapter.courseTitle}
Chapter Description: ${chapter.courseDescription}

Topic: ${topicTitle}
Topic Objective: ${topic.topicLearningObjectiveDescription}
`;

console.log(`🤖 Generating section content for: ${lessonTitle}${vectorStoreId ? ' with RAG' : ''}${perplexityService ? ' with web context' : ''}`);

// Get web search context if using Perplexity
let webSearchContext=null;
if (perplexityService && contentGenerationMethod==='perplexity') {
try {
if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping web search context generation');
throw new Error('Publishing process aborted by user');
}

console.log('🔍 Getting web search context from Perplexity Sonar...');
webSearchContext=await perplexityService.generateSectionContext(
outline.title,
lessonTitle
);

if (webSearchContext) {
console.log('✅ Web search context generated successfully');
} else {
console.log('ℹ️ No web search context available,continuing without it');
}
} catch (error) {
console.warn('⚠️ Web search context generation failed,continuing without it:',error.message);
// Try fallback Perplexity if available
if (settings.perplexityFallback && !error.message.includes('aborted')) {
try {
console.log('🔄 Trying fallback Perplexity for web context...');
const fallbackPerplexity=new PerplexityService(settings.perplexityFallback);
webSearchContext=await fallbackPerplexity.generateSectionContext(
outline.title,
lessonTitle
);
console.log('✅ Fallback web search context generated');
} catch (fallbackError) {
console.warn('⚠️ Fallback web search also failed:',fallbackError.message);
}
}
}
}

// ✅ FIXED: Get lesson context from outline
const lessonContext=getContextForItem(outline,chapterIndex,topicIndex,lessonIndex);

let sectionContent;
try {
if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping AI generation for lesson');
throw new Error('Publishing process aborted by user');
}

sectionContent=await openaiService.generateSectionContent(
fullContext,
lessonTitle,
lesson.lessonDescription,
'Step-by-step guide with examples',
'Practical and actionable',
lessonContext || '',// ✅ FIXED: Use lesson context from outline
vectorStoreId,
webSearchContext
);
} catch (error) {
if (error.message.includes('aborted')) {
throw error;
}
console.error('Error generating section content with primary key:',error);
if (fallbackOpenaiService) {
console.log('Using fallback API key for section content');
try {
if (shouldAbortProcessing) {
throw new Error('Publishing process aborted by user');
}
sectionContent=await fallbackOpenaiService.generateSectionContent(
fullContext,
lessonTitle,
lesson.lessonDescription,
'Step-by-step guide with examples',
'Practical and actionable',
lessonContext || '',// ✅ FIXED: Use lesson context from outline
vectorStoreId,
webSearchContext
);
} catch (fallbackError) {
console.error('Fallback also failed:',fallbackError);
sectionContent=`<h2>${lessonTitle}</h2><p>${lesson.lessonDescription}</p><p>Content will be available soon.</p>`;
}
} else {
sectionContent=`<h2>${lessonTitle}</h2><p>${lesson.lessonDescription}</p><p>Content will be available soon.</p>`;
}
}

const lessonContent=`
<div class="lesson-description">${lesson.lessonDescription}</div>
<div class="lesson-content">${sectionContent}</div>
${lessonContext ? `<div class="lesson-context"><h4>Additional Context:</h4><p>${lessonContext}</p></div>` : ''}
`;

const sectionPost=await wpService.createTopicSection(lessonTitle,lessonContent,topicId);
if (!sectionPost || !sectionPost.id) {
console.error('Failed to create lesson: No valid section ID returned');
continue;
}

const sectionId=sectionPost.id;
console.log('✅ Section created with ID:',sectionId);

// Webhook call
const topicToSectionResult=await webhookService.linkTopicToSection(topicId,sectionId);
if (topicToSectionResult.success) {
console.log('✅ Topic-to-Section webhook successful');
} else {
console.warn('⚠️ Topic-to-Section webhook failed:',topicToSectionResult.error);
}

processedCount++;
setPublishingProgress(prev=> ({
...prev,
progress: Math.round((processedCount / totalItems) * 100),
processedItems: processedCount
}));

topicStructure.sections.push({
original: lesson,
post: sectionPost,
id: sectionId,
usedRAG: !!vectorStoreId,
usedWebContext: !!webSearchContext,
hadCustomContext: !!lessonContext // ✅ FIXED: Track if custom context was used
});

if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping after lesson creation');
throw new Error('Publishing process aborted by user');
}
}

chapterStructure.topics.push(topicStructure);

if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping after topic creation');
throw new Error('Publishing process aborted by user');
}
}

createdStructure.push(chapterStructure);

if (shouldAbortProcessing) {
console.log('🛑 ABORT DETECTED - Stopping after chapter completion');
throw new Error('Publishing process aborted by user');
}
}

// Update project status
updateProject(project.id,{
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
webhooksUsed: 'All three webhook levels implemented',
contentMethod: contentGenerationMethod,
webContextUsed: !!perplexityService,
customContextUsed: true, // ✅ FIXED: Track that custom context handling was implemented
webReferencesUsed: includeWebReferences==='yes'  // ✅ NEW: Track if web references were used
}
});

return {
success: true,
message: 'Successfully published to WordPress',
bookId,
bookUrl: book.link
};
} catch (error) {
console.error('Error publishing to WordPress:',error);

if (shouldAbortProcessing || error.message.includes('aborted')) {
console.log('🛑 Publishing was aborted by user');
setPublishingProgress(prev=> ({
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
setPublishingProgress(prev=> ({
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
setAbortController(null);
if (!backgroundProcessing) {
setIsPublishing(false);
}
setShouldAbortProcessing(false);
}
};

const value={
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