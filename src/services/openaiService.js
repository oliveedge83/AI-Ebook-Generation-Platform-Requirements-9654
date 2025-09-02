class OpenAIService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
    this.abortController = null;
  }

  async makeRequest(endpoint, data, signal = null) {
    console.log(`Making OpenAI request to ${endpoint} with model: ${data.model}`);

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
          // Add OpenAI-Beta header when using file_search or /responses
          ...(data.tools && data.tools.some(tool => tool.type === 'file_search') ? { 'OpenAI-Beta': 'assistants=v2' } : {}),
          // Add OpenAI-Beta header for /responses endpoint
          ...(endpoint === '/responses' ? { 'OpenAI-Beta': 'assistants=v2' } : {})
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

  async generateMarketResearch(ebookNiche, mustHaveAspects, otherDesignConsiderations, gptOptions = {}, signal = null) {
    console.log(`Generating market research for niche: ${ebookNiche} using FIXED defaults (model: gpt-4.1-mini-2025-04-14, tokens: 2000)`);

    const prompt = `Act as a Senior Content Strategist and bestselling non-fiction ghostwriter. I am commissioning an authoritative ebook in the professional niche of: ${ebookNiche}.

Some of the initial considerations for the ebook as per the commissioning editor are:

Must-have content and themes: ${mustHaveAspects}

Additional content and structural considerations: ${otherDesignConsiderations || 'None specified'}

Your mission is to conduct a deep market and audience analysis to uncover the most potent professional drivers, emotional triggers, and desired outcomes of the target readership for this ebook. This deep insight will inform the ebook's structure, tone, and content to ensure it is highly practical, resonant, and achieves maximum impact for the reader.

The final output MUST be a single text paragraph string titled "ebook_research_brief". The ebook_research_brief will include: "ebookTitle", "readerTransformationPillars", "idealReaderProfile", "marketRelevance", "hardHittingPainPoints", "keyEmotionalTriggers", "tangibleReaderResults", "assumedReaderKnowledge", and "recommendedContentStructure".

Generate the "ebook_research_brief" paragraph now. The output should be a single, continuous text string that can be passed to the next node.`;

    try {
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }, signal);

      return response.choices[0].message.content;
    } catch (error) {
      console.log('Error with primary model, falling back to gpt-3.5-turbo:', error.message);
      try {
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.7
        }, signal);

        return fallbackResponse.choices[0].message.content;
      } catch (fallbackError) {
        throw new Error(`Failed to generate market research: ${fallbackError.message}`);
      }
    }
  }

  async generatePrefaceAndIntroduction(researchBrief, mustHaveAspects, otherDesignConsiderations, gptOptions = {}, signal = null) {
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
      const response = await this.makeRequest('/chat/completions', {
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: gptOptions.max_tokens_gpt || 3000,
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
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: gptOptions.max_tokens_gpt || 3000,
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

  async generateChapterOutline(researchBrief, mustHaveAspects, maxChapters, otherDesignConsiderations, gptOptions = {}, signal = null) {
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
      const response = await this.makeRequest('/chat/completions', {
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: gptOptions.max_tokens_gpt || 2000,
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
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: gptOptions.max_tokens_gpt || 2000,
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

  async generateChapterTopics(researchBrief, chapterTitle, chapterDescription, mustHaveAspects, gptOptions = {}, signal = null) {
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
      const response = await this.makeRequest('/chat/completions', {
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: gptOptions.max_tokens_gpt || 2000,
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
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: gptOptions.max_tokens_gpt || 2000,
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

  async generateTopicIntroduction(researchBrief, chapterTitle, chapterDescription, topicTitle, topicObjective, lessons, gptOptions = {}, signal = null) {
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
      const response = await this.makeRequest('/chat/completions', {
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: gptOptions.max_tokens_gpt || 1000,
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
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: gptOptions.max_tokens_gpt || 1000,
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

  // 🔧 FIXED: Enhanced RAG Content Generation with Proper Response Parsing
  async generateSectionContent(
    fullContext,
    lessonTitle,
    lessonDescription,
    instructionMethod = 'Step-by-step guide with examples',
    topicGenerationApproach = 'Practical and actionable',
    userAddedContext = '',
    vectorStoreId = null,
    webSearchContext = null,
    gptOptions = {},
    signal = null
  ) {
    console.log(`🤖 Starting Two-Stage RAG Content Generation for: ${lessonTitle}`);
    console.log(`📊 Context Sources:`, {
      hasFullContext: Boolean(fullContext),
      hasUserContext: Boolean(userAddedContext),
      hasWebContext: Boolean(webSearchContext),
      hasRAGLibrary: Boolean(vectorStoreId),
      usingTwoStageApproach: Boolean(vectorStoreId)
    });

    // 🔢 TOKEN TRACKING: Initialize token counters
    let tokenTracking = {
      stage1_rag: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      stage2_final: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      web_search_context: { estimated_tokens: 0 },
      overall_total: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      content_info: {
        lesson_title: lessonTitle,
        has_rag: Boolean(vectorStoreId),
        has_web_context: Boolean(webSearchContext),
        has_user_context: Boolean(userAddedContext),
        generation_timestamp: new Date().toISOString()
      }
    };

    // 🔢 Estimate web search context tokens
    if (webSearchContext) {
      tokenTracking.web_search_context.estimated_tokens = Math.ceil(webSearchContext.length / 4);
      console.log(`📊 WEB SEARCH CONTEXT TOKEN ESTIMATE: ${tokenTracking.web_search_context.estimated_tokens} tokens (${webSearchContext.length} characters)`);
    }

    let ragContent = null;

    // ✅ STAGE 1: RAG Content Extraction using /responses API
    if (vectorStoreId) {
      console.log(`🔍 STAGE 1: Extracting RAG content using /responses API`);
      console.log(`📚 Vector Store ID: ${vectorStoreId}`);

      try {
        // Check vector store status first
        const VectorStoreService = (await import('./vectorStoreService.js')).default;
        const vectorStoreService = new VectorStoreService(this.apiKey);
        
        const storeStatus = await vectorStoreService.checkVectorStoreStatus(vectorStoreId);
        console.log('📊 Vector store status:', storeStatus);
        
        if (!storeStatus.isReady) {
          console.warn('⚠️ Vector store is not ready, proceeding without RAG');
          vectorStoreId = null;
        } else {
          console.log(`✅ Vector store ready with ${storeStatus.fileCount} files`);

          // System prompt for RAG extraction
          const ragSystemPrompt = `Act as a senior instructional designer. Output strictly as HTML, concise and practical. Focus on extracting relevant knowledge from the attached reference materials.`;

          // User prompt for RAG extraction
          const ragUserPrompt = `Generate the readingContent (1000-1200 words in HTML) for the topic section titled "${lessonTitle}" with description "${lessonDescription}" using the relevant reference from the attached documents from the reference library using file_search tool.

Focus on:
- Practical, actionable content
- Step-by-step guidance where applicable
- Real-world examples and case studies
- Current best practices from the reference materials

Output should be comprehensive HTML content that can stand alone as educational material.`;

          // Calculate input tokens for STAGE 1
          const stage1InputLength = ragSystemPrompt.length + ragUserPrompt.length;
          tokenTracking.stage1_rag.input_tokens = Math.ceil(stage1InputLength / 4);

          console.log(`🔢 STAGE 1 INPUT TOKEN ESTIMATE: ${tokenTracking.stage1_rag.input_tokens} tokens`);

          // 🔧 CRITICAL FIX: Updated /responses API call format
          const ragResponse = await this.makeRequest('/responses', {
            model: 'gpt-4.1-mini-2025-04-14',
            tools: [
              {
                type: "file_search",
                vector_store_ids: [vectorStoreId],
                max_num_results: 3
              }
            ],
            input: [
              {
                role: "system",
                content: ragSystemPrompt
              },
              {
                role: "user", 
                content: ragUserPrompt
              }
            ],
            max_output_tokens: 1200
          }, signal);

          // 🔧 CRITICAL FIX: Debug the actual response structure
          console.log('🔍 RAG RESPONSE STRUCTURE DEBUG:', {
            hasOutput: !!ragResponse.output,
            hasChoices: !!ragResponse.choices,
            hasContent: !!ragResponse.content,
            hasMessage: !!ragResponse.message,
            responseKeys: Object.keys(ragResponse),
            fullResponse: ragResponse
          });

          // 🔢 Extract token usage from /responses API
          if (ragResponse.usage) {
            tokenTracking.stage1_rag.input_tokens = ragResponse.usage.prompt_tokens || tokenTracking.stage1_rag.input_tokens;
            tokenTracking.stage1_rag.output_tokens = ragResponse.usage.completion_tokens || 0;
            tokenTracking.stage1_rag.total_tokens = ragResponse.usage.total_tokens || (tokenTracking.stage1_rag.input_tokens + tokenTracking.stage1_rag.output_tokens);
            
            console.log(`🔢 STAGE 1 RAG TOKEN USAGE (ACTUAL):`, {
              input_tokens: tokenTracking.stage1_rag.input_tokens,
              output_tokens: tokenTracking.stage1_rag.output_tokens,
              total_tokens: tokenTracking.stage1_rag.total_tokens,
              model: 'gpt-4.1-mini-2025-04-14',
              endpoint: '/responses',
              vector_store_id: vectorStoreId
            });
          }

          // 🔧 ENHANCED RESPONSE PARSING: Handle multiple possible response formats
          ragContent = null;

          // Try different response format possibilities
          if (ragResponse.content) {
            // Direct content field
            ragContent = ragResponse.content;
            console.log('✅ RAG Content found in response.content');
          } else if (ragResponse.output && Array.isArray(ragResponse.output)) {
            // Output array format
            for (const outputItem of ragResponse.output) {
              if (outputItem.type === 'message' && outputItem.content) {
                if (Array.isArray(outputItem.content)) {
                  // Content is an array
                  for (const contentItem of outputItem.content) {
                    if (contentItem.type === 'text' && contentItem.text) {
                      ragContent = contentItem.text;
                      console.log('✅ RAG Content found in output[].content[].text');
                      break;
                    }
                  }
                } else if (typeof outputItem.content === 'string') {
                  // Content is a string
                  ragContent = outputItem.content;
                  console.log('✅ RAG Content found in output[].content (string)');
                }
                if (ragContent) break;
              }
            }
          } else if (ragResponse.choices && ragResponse.choices[0] && ragResponse.choices[0].message) {
            // Choices format (like chat completions)
            ragContent = ragResponse.choices[0].message.content;
            console.log('✅ RAG Content found in choices[0].message.content');
          } else if (ragResponse.message && ragResponse.message.content) {
            // Direct message format
            ragContent = ragResponse.message.content;
            console.log('✅ RAG Content found in message.content');
          }

          if (ragContent) {
            // Clean up any markdown code blocks if present
            if (ragContent.includes('```html')) {
              ragContent = ragContent.replace(/```html\n?/g, '').replace(/```\n?$/g, '');
            }
            
            console.log('✅ STAGE 1 Complete: RAG content extracted successfully');
            console.log(`📊 RAG Content Length: ${ragContent.length} characters`);
            console.log(`📄 RAG Content Preview: ${ragContent.substring(0, 200)}...`);
          } else {
            console.error('❌ STAGE 1: No RAG content found in any expected response format');
            console.log('🔍 Full response for debugging:', JSON.stringify(ragResponse, null, 2));
          }
        }
      } catch (error) {
        console.error('❌ STAGE 1 Error:', error.message);
        console.log('🔄 Continuing to STAGE 2 without RAG content');
        ragContent = null;
      }
    }

    // ✅ STAGE 2: Full Context Integration & Final Content Generation
    console.log(`🚀 STAGE 2: Full Context Integration & Final Content Generation`);
    console.log(`📊 Available Context Sources:`, {
      webSearchContext: webSearchContext ? 'Priority 1' : 'Not available',
      ragContent: ragContent ? 'Priority 2' : 'Not available', 
      researchBrief: fullContext ? 'Priority 3' : 'Not available',
      userAddedContext: userAddedContext ? 'Priority 4' : 'Not available'
    });

    // Build comprehensive system prompt with all context sources
    const comprehensiveSystemPrompt = `Act as an expert ebook writer and instructional designer. You are creating comprehensive, practical content for professionals.

${fullContext ? `RESEARCH CONTEXT (Priority 3 - Overall Ebook Research):
${fullContext}

` : ''}${userAddedContext ? `USER ADDED CONTEXT (Priority 4 - Specific Instructions):
${userAddedContext}

` : ''}CONTENT REQUIREMENTS:
- Focus on actionable strategies that readers can implement immediately
- Address emotional triggers and emphasize benefits
- Include common mistakes and how to avoid them
- Use case studies or examples from real businesses to make content relatable
- Provide templates and actionable checklists if applicable
- Keep the text as action focused as possible
- Quote recent research on this topic if any
- Keep the tone motivating and supportive
- Sound like Malcolm Gladwell or Daniel Pink for this ebook
- Generate 1500-2000 words in HTML format

Instruction Method: ${instructionMethod}
Generation Approach: ${topicGenerationApproach}`;

    // Build comprehensive user prompt with prioritized context
    const comprehensiveUserPrompt = `TASK: Develop a comprehensive, practical section on "${lessonTitle}" with description: "${lessonDescription}"

${webSearchContext ? `WEB SEARCH CONTEXT (Priority 1 - Current Trends & Data):
${webSearchContext}

` : ''}${ragContent ? `KNOWLEDGE LIBRARY CONTEXT (Priority 2 - Domain Expertise):
${ragContent}

` : ''}PRIORITY INSTRUCTIONS:
1. ${webSearchContext ? 'Use the WEB SEARCH CONTEXT for current trends and recent insights' : 'Focus on established best practices and proven methods'}
2. ${ragContent ? 'Enhance with KNOWLEDGE LIBRARY CONTEXT for domain-specific expertise and detailed guidance' : 'Ensure content is comprehensive and authoritative'}
3. Ensure alignment with the overall research context and user requirements
4. Generate practical, actionable content that readers can implement immediately

Generate comprehensive HTML content (1500-2000 words) that combines all available context sources into a cohesive, valuable learning experience.`;

    // Calculate input tokens for STAGE 2
    const stage2InputLength = comprehensiveSystemPrompt.length + comprehensiveUserPrompt.length;
    tokenTracking.stage2_final.input_tokens = Math.ceil(stage2InputLength / 4);

    console.log(`🔢 STAGE 2 INPUT TOKEN ESTIMATE: ${tokenTracking.stage2_final.input_tokens} tokens`);

    try {
      // ✅ STAGE 2: Comprehensive Content Generation
      const finalResponse = await this.makeRequest('/chat/completions', {
        model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
        messages: [
          { role: 'system', content: comprehensiveSystemPrompt },
          { role: 'user', content: comprehensiveUserPrompt }
        ],
        max_tokens: gptOptions.max_tokens_gpt || 3000,
        temperature: gptOptions.temperature || 0.5
      }, signal);

      const finalContent = finalResponse.choices[0].message.content;

      // Extract actual token usage from STAGE 2
      if (finalResponse.usage) {
        tokenTracking.stage2_final.input_tokens = finalResponse.usage.prompt_tokens || tokenTracking.stage2_final.input_tokens;
        tokenTracking.stage2_final.output_tokens = finalResponse.usage.completion_tokens || 0;
        tokenTracking.stage2_final.total_tokens = finalResponse.usage.total_tokens || (tokenTracking.stage2_final.input_tokens + tokenTracking.stage2_final.output_tokens);
        
        console.log(`🔢 STAGE 2 FINAL GENERATION TOKEN USAGE (ACTUAL):`, {
          input_tokens: tokenTracking.stage2_final.input_tokens,
          output_tokens: tokenTracking.stage2_final.output_tokens,
          total_tokens: tokenTracking.stage2_final.total_tokens,
          model: gptOptions.model || 'gpt-4.1-mini-2025-04-14',
          endpoint: '/chat/completions'
        });
      }

      // Calculate overall totals
      tokenTracking.overall_total.input_tokens = tokenTracking.stage1_rag.input_tokens + tokenTracking.stage2_final.input_tokens + tokenTracking.web_search_context.estimated_tokens;
      tokenTracking.overall_total.output_tokens = tokenTracking.stage1_rag.output_tokens + tokenTracking.stage2_final.output_tokens;
      tokenTracking.overall_total.total_tokens = tokenTracking.overall_total.input_tokens + tokenTracking.overall_total.output_tokens;

      // 🔢 COMPREHENSIVE TOKEN USAGE SUMMARY
      console.log(`
🔢 ===== COMPREHENSIVE TOKEN USAGE SUMMARY =====
📝 LESSON: "${lessonTitle}"
📅 TIMESTAMP: ${tokenTracking.content_info.generation_timestamp}

📊 STAGE BREAKDOWN:
${ragContent ? `🔍 STAGE 1 (RAG /responses):
   • Input Tokens: ${tokenTracking.stage1_rag.input_tokens}
   • Output Tokens: ${tokenTracking.stage1_rag.output_tokens}
   • Total Tokens: ${tokenTracking.stage1_rag.total_tokens}
   • Model: gpt-4.1-mini-2025-04-14
   • Vector Store: ${vectorStoreId}
   • RAG Content Generated: ✅ YES (${ragContent.length} characters)
` : '🔍 STAGE 1 (RAG): SKIPPED - No vector store'}
${webSearchContext ? `🌐 WEB SEARCH CONTEXT:
   • Estimated Tokens: ${tokenTracking.web_search_context.estimated_tokens}
   • Content Length: ${webSearchContext.length} characters
   • Source: Perplexity Sonar
` : '🌐 WEB SEARCH CONTEXT: NOT USED'}
🚀 STAGE 2 (Final Generation /chat/completions):
   • Input Tokens: ${tokenTracking.stage2_final.input_tokens}
   • Output Tokens: ${tokenTracking.stage2_final.output_tokens}
   • Total Tokens: ${tokenTracking.stage2_final.total_tokens}
   • Model: ${gptOptions.model || 'gpt-4.1-mini-2025-04-14'}

🎯 OVERALL TOTALS:
   • Total Input Tokens: ${tokenTracking.overall_total.input_tokens}
   • Total Output Tokens: ${tokenTracking.overall_total.output_tokens}
   • Grand Total Tokens: ${tokenTracking.overall_total.total_tokens}

📈 CONTEXT SOURCES USED:
   • RAG Library: ${ragContent ? '✅ YES' : '❌ NO'}
   • Web Search Context: ${webSearchContext ? '✅ YES' : '❌ NO'}
   • User Added Context: ${userAddedContext ? '✅ YES' : '❌ NO'}
   • Research Brief: ${fullContext ? '✅ YES' : '❌ NO'}

📋 GENERATION SUMMARY:
   • Processing Stages: ${ragContent ? '2 (RAG + Final)' : '1 (Final Only)'}
   • Final Content Length: ${finalContent.length} characters
   • Estimated Final Content Tokens: ${Math.ceil(finalContent.length / 4)}
   • RAG Enhancement Status: ${ragContent ? '✅ SUCCESSFUL' : '❌ FAILED'}
===============================================
      `);

      console.log('✅ STAGE 2 Complete: Final content generated successfully');
      console.log('🎯 Two-Stage Generation Summary:', {
        stage1RAGUsed: Boolean(ragContent),
        stage1ContentLength: ragContent ? ragContent.length : 0,
        stage2FinalLength: finalContent.length,
        contextSourcesUsed: {
          webSearch: Boolean(webSearchContext),
          ragLibrary: Boolean(ragContent),
          researchBrief: Boolean(fullContext),
          userContext: Boolean(userAddedContext)
        },
        totalProcessingStages: ragContent ? 2 : 1,
        tokenTracking: tokenTracking
      });

      return finalContent;

    } catch (error) {
      console.error('❌ STAGE 2 Error:', error.message);
      
      // Fallback to gpt-3.5-turbo if primary model fails
      try {
        console.log('🔄 STAGE 2 Fallback: Using gpt-3.5-turbo');
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: comprehensiveSystemPrompt },
            { role: 'user', content: comprehensiveUserPrompt }
          ],
          max_tokens: gptOptions.max_tokens_gpt || 3000,
          temperature: gptOptions.temperature || 0.5
        }, signal);

        // Track fallback tokens
        if (fallbackResponse.usage) {
          tokenTracking.stage2_final.input_tokens = fallbackResponse.usage.prompt_tokens || tokenTracking.stage2_final.input_tokens;
          tokenTracking.stage2_final.output_tokens = fallbackResponse.usage.completion_tokens || 0;
          tokenTracking.stage2_final.total_tokens = fallbackResponse.usage.total_tokens || (tokenTracking.stage2_final.input_tokens + tokenTracking.stage2_final.output_tokens);
          
          // Recalculate overall totals
          tokenTracking.overall_total.input_tokens = tokenTracking.stage1_rag.input_tokens + tokenTracking.stage2_final.input_tokens + tokenTracking.web_search_context.estimated_tokens;
          tokenTracking.overall_total.output_tokens = tokenTracking.stage1_rag.output_tokens + tokenTracking.stage2_final.output_tokens;
          tokenTracking.overall_total.total_tokens = tokenTracking.overall_total.input_tokens + tokenTracking.overall_total.output_tokens;

          console.log(`🔢 FALLBACK TOKEN USAGE: Input: ${tokenTracking.stage2_final.input_tokens}, Output: ${tokenTracking.stage2_final.output_tokens}, Total: ${tokenTracking.stage2_final.total_tokens}, Model: gpt-3.5-turbo`);
          console.log(`🔢 OVERALL TOTALS (WITH FALLBACK): Input: ${tokenTracking.overall_total.input_tokens}, Output: ${tokenTracking.overall_total.output_tokens}, Grand Total: ${tokenTracking.overall_total.total_tokens}`);
        }

        console.log('✅ STAGE 2 Fallback Complete');
        return fallbackResponse.choices[0].message.content;

      } catch (fallbackError) {
        console.error('❌ STAGE 2 Fallback also failed:', fallbackError);
        return `<h2>${lessonTitle}</h2><p>${lessonDescription}</p><p>Content generation failed. Please try again later.</p>`;
      }
    }
  }
}

export default OpenAIService;