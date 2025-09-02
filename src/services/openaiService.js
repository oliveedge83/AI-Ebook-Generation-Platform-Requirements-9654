class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
    this.abortController = null;
  }

  async makeRequest(endpoint, data, signal = null) {
    // VibeCoding: Log now shows the dynamically selected model from the request data
    console.log(`Making OpenAI request to ${endpoint} with model: ${data.model}`);
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          // Add OpenAI-Beta header when using file_search or /responses
          ...(data.tools && data.tools.some(tool => tool.type === 'file_search') ? 
            { 'OpenAI-Beta': 'assistants=v2' } : {}),
          // Add OpenAI-Beta header for /responses endpoint
          ...(endpoint === '/responses' ? 
            { 'OpenAI-Beta': 'assistants=v2' } : {})
        },
        body: JSON.stringify(data),
        signal: signal
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI API error:', error);
        throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
      }

      const result = await response.json();
      // VibeCoding: Success log now shows the actual model used in the request
      console.log(`OpenAI request successful with model: ${data.model}`);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('OpenAI request was aborted');
        throw new Error('Request was aborted by user');
      }
      console.error(`OpenAI API request failed: ${error.message}`);
      throw error;
    }
  }

  // VibeCoding: FIXED - generateMarketResearch now uses FIXED defaults, ignoring gptOptions for research
  async generateMarketResearch(ebookNiche, mustHaveAspects, otherDesignConsiderations, gptOptions = {}, signal = null) {
    // VibeCoding: Log shows fixed defaults for research
    console.log(`Generating market research for niche: ${ebookNiche} using FIXED defaults (model: gpt-4.1-mini-2025-04-14, tokens: 2000)`);

    const prompt = `Act as a Senior Content Strategist and bestselling non-fiction ghostwriter. I am commissioning an authoritative ebook in the professional niche of: ${ebookNiche}.

Some of the initial considerations for the ebook as per the commissioning editor are:

Must-have content and themes: ${mustHaveAspects}

Additional content and structural considerations: ${otherDesignConsiderations || 'None specified'}

Your mission is to conduct a deep market and audience analysis to uncover the most potent professional drivers, emotional triggers, and desired outcomes of the target readership for this ebook. This deep insight will inform the ebook's structure, tone, and content to ensure it is highly practical, resonant, and achieves maximum impact for the reader.

The final output MUST be a single text paragraph string titled "ebook_research_brief". The ebook_research_brief will include: "ebookTitle", "readerTransformationPillars", "idealReaderProfile", "marketRelevance", "hardHittingPainPoints", "keyEmotionalTriggers", "tangibleReaderResults", "assumedReaderKnowledge", and "recommendedContentStructure".

Generate the "ebook_research_brief" paragraph now. The output should be a single, continuous text string that can be passed to the next node.`;

    try {
      // VibeCoding: FIXED - Use fixed defaults for research consistency, ignore gptOptions
      const response = await this.makeRequest('/chat/completions', {
        // FIXED: Always use gpt-4.1-mini-2025-04-14 for research
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        // FIXED: Always use 2000 tokens for research
        max_tokens: 2000,
        // FIXED: Always use 0.7 temperature for research
        temperature: 0.7
      }, signal);

      return response.choices[0].message.content;
    } catch (error) {
      console.log('Error with primary model, falling back to gpt-3.5-turbo:', error.message);
      try {
        // VibeCoding: FIXED - Fallback still uses fixed defaults
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          // FIXED: Always use 2000 tokens for research (fallback)
          max_tokens: 2000,
          // FIXED: Always use 0.7 temperature for research (fallback)
          temperature: 0.7
        }, signal);

        return fallbackResponse.choices[0].message.content;
      } catch (fallbackError) {
        throw new Error(`Failed to generate market research: ${fallbackError.message}`);
      }
    }
  }

  // VibeCoding: Updated method signature to accept gptOptions configuration object
  async generatePrefaceAndIntroduction(researchBrief, mustHaveAspects, otherDesignConsiderations, gptOptions = {}, signal = null) {
    // VibeCoding: Log now reflects the dynamically selected model from options
    console.log('Generating preface and introduction using model:', gptOptions.model || 'gpt-4.1-mini-2025-04-14');

    const prompt = `Act as an expert developmental editor and bestselling non-fiction author. Your task is to write the ebook's preface and Introduction.

CONTEXT:
Use the research brief below:
${researchBrief}

Must-Have Themes: ${mustHaveAspects}

Other Ebook Structural Considerations: ${otherDesignConsiderations || 'None specified'}

TASK:
Given the above research brief and additional context, generate both a Preface and Introduction for the book. Generate both in HTML format. Around 800-1000 words each for Preface and Introduction.

Format your response as a JSON object with two keys:
{"preface": "<html content for preface>", "introduction": "<html content for introduction>"}`;

    try {
      // VibeCoding: Use dynamic options with fallbacks to defaults
      const response = await this.makeRequest('/chat/completions', {
        // DYNAMIC_OPTION: Use model from options, or default to 'gpt-4.1-mini-2025-04-14'
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        // DYNAMIC_OPTION: Use max_tokens from options, or default to 3000
        max_tokens: gptOptions.max_tokens_gpt || 3000,
        // DYNAMIC_OPTION: Use temperature from options, or default to 0.7
        temperature: gptOptions.temperature || 0.7
      }, signal);

      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.log('Error parsing JSON response, using content directly:', parseError.message);
        const content = response.choices[0].message.content;
        return {
          preface: content.includes('Preface') ? content.split('Introduction')[0] : content,
          introduction: content.includes('Introduction') ? content.split('Introduction')[1] || content : content
        };
      }
    } catch (error) {
      console.log('Error with primary model, falling back to gpt-3.5-turbo:', error.message);
      try {
        // VibeCoding: Fallback still uses dynamic options but with gpt-3.5-turbo as model
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          // DYNAMIC_OPTION: Use max_tokens from options, or default to 3000
          max_tokens: gptOptions.max_tokens_gpt || 3000,
          // DYNAMIC_OPTION: Use temperature from options, or default to 0.7
          temperature: gptOptions.temperature || 0.7
        }, signal);

        try {
          return JSON.parse(fallbackResponse.choices[0].message.content);
        } catch (fallbackParseError) {
          const content = fallbackResponse.choices[0].message.content;
          return {
            preface: content.includes('Preface') ? content.split('Introduction')[0] : content,
            introduction: content.includes('Introduction') ? content.split('Introduction')[1] || content : content
          };
        }
      } catch (fallbackError) {
        throw new Error(`Failed to generate preface and introduction: ${fallbackError.message}`);
      }
    }
  }

  // VibeCoding: Updated method signature to accept gptOptions configuration object
  async generateChapterOutline(researchBrief, mustHaveAspects, maxChapters, otherDesignConsiderations, gptOptions = {}, signal = null) {
    // VibeCoding: Log now reflects the dynamically selected model from options
    console.log(`Generating chapter outline with max chapters: ${maxChapters} using model: ${gptOptions.model || 'gpt-4.1-mini-2025-04-14'}`);

    const prompt = `Act as an expert developmental editor and curriculum design specialist. Your task is to apply curriculum design principles to outline a practical, high-impact ebook by structuring the ebook's main chapters as a sequence of "courses".

CONTEXT:
${researchBrief}

Must-Have Themes: ${mustHaveAspects}

Other Ebook Structural Considerations: ${otherDesignConsiderations || 'None specified'}

Total number of courses (chapters) should not exceed ${maxChapters}.

TASK:
Generate a logical, scaffolded sequence of "courses" to structure the ebook. Each course should build upon previous knowledge and guide the reader toward mastery.

Your output MUST be an array of JSON objects. Each object represents a chapter and MUST have the following keys:
- "courseNumber": Integer starting from 1
- "courseTitle": String - compelling chapter title
- "courseDescription": String - brief description of what this chapter covers

Return ONLY the JSON array, no other text.`;

    try {
      // VibeCoding: Use dynamic options with fallbacks to defaults
      const response = await this.makeRequest('/chat/completions', {
        // DYNAMIC_OPTION: Use model from options, or default to 'gpt-4.1-mini-2025-04-14'
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        // DYNAMIC_OPTION: Use max_tokens from options, or default to 2000
        max_tokens: gptOptions.max_tokens_gpt || 2000,
        // DYNAMIC_OPTION: Use temperature from options, or default to 0.7
        temperature: gptOptions.temperature || 0.7
      }, signal);

      try {
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing chapter outline JSON response:', parseError);
        throw new Error('Failed to parse chapter outline JSON response');
      }
    } catch (error) {
      console.log('Error with primary model, falling back to gpt-3.5-turbo:', error.message);
      try {
        // VibeCoding: Fallback still uses dynamic options but with gpt-3.5-turbo as model
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          // DYNAMIC_OPTION: Use max_tokens from options, or default to 2000
          max_tokens: gptOptions.max_tokens_gpt || 2000,
          // DYNAMIC_OPTION: Use temperature from options, or default to 0.7
          temperature: gptOptions.temperature || 0.7
        }, signal);

        try {
          const content = fallbackResponse.choices[0].message.content;
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
        } catch (fallbackParseError) {
          throw new Error('Failed to parse chapter outline JSON response from fallback model');
        }
      } catch (fallbackError) {
        throw new Error(`Failed to generate chapter outline: ${fallbackError.message}`);
      }
    }
  }

  // VibeCoding: Updated method signature to accept gptOptions configuration object
  async generateChapterTopics(researchBrief, chapterTitle, chapterDescription, mustHaveAspects, gptOptions = {}, signal = null) {
    // VibeCoding: Log now reflects the dynamically selected model from options
    console.log(`Generating topics for chapter: ${chapterTitle} using model: ${gptOptions.model || 'gpt-4.1-mini-2025-04-14'}`);

    const prompt = `As an expert ebook architect, you are designing a single chapter of an authoritative professional ebook. Your task is to create the complete, detailed content outline for this single chapter.

CONTEXT:
${researchBrief}

Current Chapter: ${chapterTitle}
Chapter Description: ${chapterDescription}

Must-Have aspects: ${mustHaveAspects}

TASK:
Generate the complete content outline for ONLY the chapter specified above. Break down the chapter into logical topics and sections that deliver maximum value to the reader.

Your output MUST be a single raw array of JSON objects. Each object in the array represents a chapter topic and MUST have the following keys:
- "topicTitle": String - the main topic title
- "topicLearningObjectiveDescription": String - what the reader will learn/achieve
- "lessons": Array of lesson objects, each with:
  - "lessonTitle": String - specific lesson title
  - "lessonDescription": String - what this lesson covers

Return ONLY the JSON array, no other text.`;

    try {
      // VibeCoding: Use dynamic options with fallbacks to defaults
      const response = await this.makeRequest('/chat/completions', {
        // DYNAMIC_OPTION: Use model from options, or default to 'gpt-4.1-mini-2025-04-14'
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        // DYNAMIC_OPTION: Use max_tokens from options, or default to 2000
        max_tokens: gptOptions.max_tokens_gpt || 2000,
        // DYNAMIC_OPTION: Use temperature from options, or default to 0.7
        temperature: gptOptions.temperature || 0.7
      }, signal);

      try {
        const content = response.choices[0].message.content;
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing chapter topics JSON response:', parseError);
        throw new Error('Failed to parse chapter topics JSON response');
      }
    } catch (error) {
      console.log('Error with primary model, falling back to gpt-3.5-turbo:', error.message);
      try {
        // VibeCoding: Fallback still uses dynamic options but with gpt-3.5-turbo as model
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          // DYNAMIC_OPTION: Use max_tokens from options, or default to 2000
          max_tokens: gptOptions.max_tokens_gpt || 2000,
          // DYNAMIC_OPTION: Use temperature from options, or default to 0.7
          temperature: gptOptions.temperature || 0.7
        }, signal);

        try {
          const content = fallbackResponse.choices[0].message.content;
          const jsonMatch = content.match(/\[[\s\S]*\]/);
          return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
        } catch (fallbackParseError) {
          throw new Error('Failed to parse chapter topics JSON response from fallback model');
        }
      } catch (fallbackError) {
        throw new Error(`Failed to generate chapter topics: ${fallbackError.message}`);
      }
    }
  }

  // VibeCoding: Updated method signature to accept gptOptions configuration object
  async generateTopicIntroduction(researchBrief, chapterTitle, chapterDescription, topicTitle, topicObjective, lessons, gptOptions = {}, signal = null) {
    // VibeCoding: Log now reflects the dynamically selected model from options
    console.log(`Generating topic introduction for: ${topicTitle} using model: ${gptOptions.model || 'gpt-4.1-mini-2025-04-14'}`);

    const lessonsJson = JSON.stringify(lessons);
    const prompt = `Write the introductory and activity-focused content for a single topic.

CONTEXT:
Overall context: ${researchBrief}
Course title: ${chapterTitle}
Course description: ${chapterDescription}
Current Topic: ${topicTitle}
Learning objective: ${topicObjective}
Lessons in this Topic: ${lessonsJson}

TASK:
Generate the topic introduction in plain text format:

"topicIntroduction": A compelling introductory paragraph (150-200 words) for the topic.`;

    try {
      // VibeCoding: Use dynamic options with fallbacks to defaults
      const response = await this.makeRequest('/chat/completions', {
        // DYNAMIC_OPTION: Use model from options, or default to 'gpt-4.1-mini-2025-04-14'
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        // DYNAMIC_OPTION: Use max_tokens from options, or default to 1000
        max_tokens: gptOptions.max_tokens_gpt || 1000,
        // DYNAMIC_OPTION: Use temperature from options, or default to 0.5
        temperature: gptOptions.temperature || 0.5
      }, signal);

      try {
        const content = response.choices[0].message.content;
        console.log('Topic introduction generated successfully');
        
        if (content.includes('"topicIntroduction"')) {
          const jsonMatch = content.match(/"topicIntroduction":\s*"([^"]+)"/);
          return jsonMatch ? jsonMatch[1] : content;
        }
        return content;
      } catch (error) {
        console.error('Error parsing topic introduction:', error);
        return response.choices[0].message.content;
      }
    } catch (error) {
      console.log('Error with primary model, falling back to gpt-3.5-turbo:', error.message);
      try {
        // VibeCoding: Fallback still uses dynamic options but with gpt-3.5-turbo as model
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          // DYNAMIC_OPTION: Use max_tokens from options, or default to 1000
          max_tokens: gptOptions.max_tokens_gpt || 1000,
          // DYNAMIC_OPTION: Use temperature from options, or default to 0.5
          temperature: gptOptions.temperature || 0.5
        }, signal);

        const content = fallbackResponse.choices[0].message.content;
        if (content.includes('"topicIntroduction"')) {
          const jsonMatch = content.match(/"topicIntroduction":\s*"([^"]+)"/);
          return jsonMatch ? jsonMatch[1] : content;
        }
        return content;
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError);
        return "An introduction to this important topic. The following lessons will guide you through key concepts and practical applications.";
      }
    }
  }

  // ✅ UPDATED: Complete context integration with RAG using /responses API
  async generateSectionContent(
    fullContext,
    lessonTitle,
    lessonDescription,
    instructionMethod = 'Step-by-step guide with examples',
    topicGenerationApproach = 'Practical and actionable',
    userAddedContext = '',
    vectorStoreId = null,
    webSearchContext = null,
    gptOptions = {}, // DYNAMIC_OPTION: New configuration object for GPT parameters
    signal = null
  ) {
    // VibeCoding: Log now shows comprehensive context integration
    console.log(`🤖 Generating section content for: ${lessonTitle} with model ${gptOptions.model || 'gpt-4.1-mini-2025-04-14'}${vectorStoreId ? ' with RAG (/responses API)' : ''}${webSearchContext ? ' with web context' : ''}`);
    
    console.log('📊 Context Sources Available:', {
      marketingResearchContext: fullContext.includes('research brief') || fullContext.includes('Market Research'),
      userAddedContext: !!userAddedContext,
      webSearchContext: !!webSearchContext,
      ragKnowledgeLibrary: !!vectorStoreId,
      lessonSpecificPrompt: true
    });

    // ✅ ENHANCED: Complete system prompt with ALL context sources
    const systemPrompt = `Act as an expert ebook writer. ${fullContext}

Focus on actionable strategies that readers can implement immediately. Address emotional triggers. Emphasize benefits. Include common mistakes and how to avoid them. Use case studies or examples from real businesses to make content relatable. Provide templates and actionable checklists if applicable. Keep the text as action focused as possible. Quote recent research on this topic if any. Keep the tone motivating and supportive. Sound like Malcolm Gladwell or Daniel Pink for this ebook.

The full content for this section will include: readingContent: The main text content (~1000-1500 words) in HTML format.

Generate the content for the section using the context below in HTML formatting.

Context: ${fullContext}
Instruction Method suggested by creator: ${instructionMethod}
Topic content generation approach: ${topicGenerationApproach}${userAddedContext ? `

User's Additional Context: ${userAddedContext}` : ''}${vectorStoreId ? `

Use the attached files from vector store library as reference material and use it as relevant.` : ''}`;

    // ✅ ENHANCED: Complete user prompt with web search context and lesson specifics
    const userPrompt = `TASK: Develop a practical, step-by-step section on section title ${lessonTitle} with section description as ${lessonDescription} for the target audience from context.${webSearchContext ? `

Given the objective based on ebook research passed above and the web_search context: ${webSearchContext}` : ''}

Generate the readingContent: The main text content (~1500-2000 words). Generate in HTML format.

Objectives: Provide practical, actionable content that readers can implement immediately.`;

    try {
      if (vectorStoreId) {
        console.log(`🔍 Using RAG with /responses API and vector store: ${vectorStoreId}${webSearchContext ? ' and web context' : ''}`);
        
        // ✅ CRITICAL: Use RAG with vector store, web context, and all other context sources
        const VectorStoreService = (await import('./vectorStoreService.js')).default;
        const vectorStoreService = new VectorStoreService(this.apiKey);

        // Check vector store status before using
        try {
          const storeStatus = await vectorStoreService.checkVectorStoreStatus(vectorStoreId);
          console.log('📊 Vector store status:', storeStatus);

          if (!storeStatus.isReady) {
            console.warn('⚠️ Vector store is not ready, using standard generation instead');
            throw new Error(`Vector store is not ready (status: ${storeStatus.status}). Files may still be processing.`);
          }

          if (storeStatus.fileCount === 0) {
            console.warn('⚠️ Vector store has no files, using standard generation instead');
            throw new Error('Vector store has no files available for search.');
          }

          console.log(`✅ Vector store ready with ${storeStatus.fileCount} files (${storeStatus.processedFiles} processed)`);
        } catch (statusError) {
          console.warn('⚠️ Vector store status check failed, proceeding with standard generation:', statusError.message);
          // Fall through to standard generation
          vectorStoreId = null;
        }

        if (vectorStoreId) {
          // ✅ CRITICAL: Pass gptOptions to RAG generation for /responses API
          const ragResponse = await vectorStoreService.generateContentWithRAG(
            vectorStoreId,
            systemPrompt,  // Contains: research context + user context + instructions
            userPrompt,    // Contains: lesson prompt + web search context + specific instructions
            gptOptions.max_tokens_gpt || 1800, // DYNAMIC_OPTION: Use max_tokens from gptOptions
            gptOptions     // DYNAMIC_OPTION: Pass complete gptOptions for model, temperature, etc.
          );

          console.log('✅ RAG section content generated successfully via /responses API with complete context integration');
          console.log('🎯 All context sources used:', {
            marketingResearchInSystemPrompt: systemPrompt.includes('research brief'),
            userContextInSystemPrompt: userAddedContext ? true : false,
            webSearchContextInUserPrompt: webSearchContext ? true : false,
            ragFileSearchUsed: true,
            lessonSpecificInUserPrompt: userPrompt.includes(lessonTitle),
            apiEndpoint: '/responses',
            vectorStoreId: vectorStoreId
          });
          
          return ragResponse;
        }
      }

      // Use standard chat completion with all context (no RAG)
      console.log('🤖 Using standard content generation (no RAG) with complete context integration');
      
      // VibeCoding: Parameters are now sourced from the gptOptions object with fallbacks
      const standardResponse = await this.makeRequest('/chat/completions', {
        // DYNAMIC_OPTION: Use model from options, or default to 'gpt-4.1-mini-2025-04-14'
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },  // Contains: research + user + instructions
          { role: 'user', content: userPrompt }       // Contains: lesson + web search context
        ],
        // DYNAMIC_OPTION: Use max_tokens from options, or default to 3000
        max_tokens: gptOptions.max_tokens_gpt || 3000,
        // DYNAMIC_OPTION: Use temperature from options, or default to 0.5
        temperature: gptOptions.temperature || 0.5
      }, signal);

      console.log('✅ Standard section content generated successfully with complete context integration');
      console.log('🎯 All context sources used (no RAG):', {
        marketingResearchInSystemPrompt: systemPrompt.includes('research brief'),
        userContextInSystemPrompt: userAddedContext ? true : false,
        webSearchContextInUserPrompt: webSearchContext ? true : false,
        ragFileSearchUsed: false,
        lessonSpecificInUserPrompt: userPrompt.includes(lessonTitle),
        apiEndpoint: '/chat/completions'
      });
      
      return standardResponse.choices[0].message.content;
    } catch (error) {
      console.log('❌ Error with primary model, falling back to gpt-3.5-turbo:', error.message);
      try {
        // VibeCoding: Fallback still uses dynamic options but with gpt-3.5-turbo as model
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          // DYNAMIC_OPTION: Use max_tokens from options, or default to 3000
          max_tokens: gptOptions.max_tokens_gpt || 3000,
          // DYNAMIC_OPTION: Use temperature from options, or default to 0.5
          temperature: gptOptions.temperature || 0.5
        }, signal);

        console.log('✅ Fallback section content generated with complete context integration');
        return fallbackResponse.choices[0].message.content;
      } catch (fallbackError) {
        console.error('❌ Fallback generation also failed:', fallbackError);
        return `<h2>${lessonTitle}</h2><p>${lessonDescription}</p><p>Content generation failed. Please try again later.</p>`;
      }
    }
  }
}

export default OpenAIService;