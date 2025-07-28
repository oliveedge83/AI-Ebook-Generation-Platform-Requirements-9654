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
          ...(data.tools && data.tools.some(tool => tool.type === 'file_search') ? { 'OpenAI-Beta': 'assistants=v2' } : {})
        },
        body: JSON.stringify(data),
        signal: signal // Pass abort signal
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

  async generateMarketResearch(ebookNiche, mustHaveAspects, otherDesignConsiderations, signal = null) {
    console.log(`Generating market research for niche: ${ebookNiche}`);
    const prompt = `Act as a Senior Content Strategist and bestselling non-fiction ghostwriter. I am commissioning an authoritative ebook in the professional niche of: ${ebookNiche}.

Some of the initial considerations for the ebook as per the commissioning editor are:

Must-have content and themes: ${mustHaveAspects}

Additional content and structural considerations: ${otherDesignConsiderations || 'None specified'}

Your mission is to conduct a deep market and audience analysis to uncover the most potent professional drivers, emotional triggers, and desired outcomes of the target readership for this ebook. This deep insight will inform the ebook's structure, tone, and content to ensure it is highly practical, resonant, and achieves maximum impact for the reader.

The final output MUST be a single text paragraph string titled "ebook_research_brief". The ebook_research_brief will include: "ebookTitle", "readerTransformationPillars", "idealReaderProfile", "marketRelevance", "hardHittingPainPoints", "keyEmotionalTriggers", "tangibleReaderResults", "assumedReaderKnowledge", and "recommendedContentStructure".

Generate the "ebook_research_brief" paragraph now. The output should be a single, continuous text string that can be passed to the next node.`;

    try {
      // Try with gpt-4o-mini first
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }, signal);

      return response.choices[0].message.content;
    } catch (error) {
      console.log('Error with gpt-4o-mini, falling back to gpt-3.5-turbo:', error.message);
      // Fallback to gpt-3.5-turbo if gpt-4o-mini fails
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

  async generatePrefaceAndIntroduction(researchBrief, mustHaveAspects, otherDesignConsiderations, signal = null) {
    console.log('Generating preface and introduction');
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
      // Try with gpt-4o-mini first
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 3000,
        temperature: 0.7
      }, signal);

      try {
        return JSON.parse(response.choices[0].message.content);
      } catch (parseError) {
        console.log('Error parsing JSON response, using content directly:', parseError.message);
        // Fallback if JSON parsing fails
        const content = response.choices[0].message.content;
        return {
          preface: content.includes('Preface') ? content.split('Introduction')[0] : content,
          introduction: content.includes('Introduction') ? content.split('Introduction')[1] || content : content
        };
      }
    } catch (error) {
      console.log('Error with gpt-4o-mini, falling back to gpt-3.5-turbo:', error.message);
      // Fallback to gpt-3.5-turbo if gpt-4o-mini fails
      try {
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 3000,
          temperature: 0.7
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

  async generateChapterOutline(researchBrief, mustHaveAspects, maxChapters, otherDesignConsiderations, signal = null) {
    console.log(`Generating chapter outline with max chapters: ${maxChapters}`);
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
      // Try with gpt-4o-mini first
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }, signal);

      try {
        const content = response.choices[0].message.content;
        // Extract JSON array if wrapped in text
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing chapter outline JSON response:', parseError);
        throw new Error('Failed to parse chapter outline JSON response');
      }
    } catch (error) {
      console.log('Error with gpt-4o-mini, falling back to gpt-3.5-turbo:', error.message);
      // Fallback to gpt-3.5-turbo if gpt-4o-mini fails
      try {
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.7
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

  async generateChapterTopics(researchBrief, chapterTitle, chapterDescription, mustHaveAspects, signal = null) {
    console.log(`Generating topics for chapter: ${chapterTitle}`);
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
      // Try with gpt-4o-mini first
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      }, signal);

      try {
        const content = response.choices[0].message.content;
        // Extract JSON array if wrapped in text
        const jsonMatch = content.match(/\[[\s\S]*\]/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(content);
      } catch (parseError) {
        console.error('Error parsing chapter topics JSON response:', parseError);
        throw new Error('Failed to parse chapter topics JSON response');
      }
    } catch (error) {
      console.log('Error with gpt-4o-mini, falling back to gpt-3.5-turbo:', error.message);
      // Fallback to gpt-3.5-turbo if gpt-4o-mini fails
      try {
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 2000,
          temperature: 0.7
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

  // New methods for content generation during publishing workflow
  async generateTopicIntroduction(researchBrief, chapterTitle, chapterDescription, topicTitle, topicObjective, lessons, signal = null) {
    console.log(`Generating topic introduction for: ${topicTitle} using gpt-4o-mini`);
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
      // Use gpt-4o-mini instead of gpt-4.1-mini (which doesn't exist)
      const response = await this.makeRequest('/chat/completions', {
        model: 'gpt-4o-mini',
        messages: [
          { role: 'user', content: prompt }
        ],
        max_tokens: 1000,
        temperature: 0.7
      }, signal);

      try {
        const content = response.choices[0].message.content;
        console.log('Topic introduction generated successfully');
        // Try to extract as JSON if possible
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
      console.log('Error with gpt-4o-mini, falling back to gpt-3.5-turbo:', error.message);
      // Fallback to gpt-3.5-turbo if gpt-4o-mini fails
      try {
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'user', content: prompt }
          ],
          max_tokens: 1000,
          temperature: 0.7
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

  async generateSectionContent(
    fullContext,
    lessonTitle,
    lessonDescription,
    instructionMethod = 'Step-by-step guide with examples',
    topicGenerationApproach = 'Practical and actionable',
    userAddedContext = '',
    vectorStoreId = null,
    signal = null
  ) {
    console.log(`Generating section content for: ${lessonTitle}${vectorStoreId ? ' with RAG' : ''}`);

    const systemPrompt = `Focus on actionable strategies that readers can implement immediately. Address emotional triggers. Emphasize benefits. Include common mistakes and how to avoid them. Use case studies or examples from real businesses to make content relatable. Provide templates and actionable checklists if applicable. Keep the text as action focused as possible. Quote recent research on this topic if any. Keep the tone motivating and supportive. Sound like Malcolm Gladwell or Daniel Pink for this ebook.

The full content for this section will include:
readingContent: The main text content (~1000-1500 words) in HTML format.

Generate the content for the section using the context below in HTML formatting.

Context: ${fullContext}
Instruction Method suggested by creator: ${instructionMethod}
Topic content generation approach: ${topicGenerationApproach}${userAddedContext ? `
User's Additional Context: ${userAddedContext}` : ''}${vectorStoreId ? `

Use the attached files from vector store library as reference material and use it as relevant.` : ''}`;

    const userPrompt = `TASK: Develop a practical, step-by-step section on section title ${lessonTitle} with section description as ${lessonDescription} for the target audience from context. Generate the readingContent: The main text content (~1500-2000 words). Generate in HTML format.`;

    try {
      let response;
      
      if (vectorStoreId) {
        console.log(`Using RAG with vector store: ${vectorStoreId}`);
        // Use RAG with vector store
        const VectorStoreService = (await import('./vectorStoreService.js')).default;
        const vectorStoreService = new VectorStoreService(this.apiKey);
        
        response = await vectorStoreService.generateContentWithRAG(
          vectorStoreId,
          systemPrompt,
          userPrompt,
          2400
        );
        
        console.log('RAG section content generated successfully');
        return response;
      } else {
        // Use standard chat completion
        const response = await this.makeRequest('/chat/completions', {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 3000,
          temperature: 0.7
        }, signal);

        console.log('Standard section content generated successfully');
        return response.choices[0].message.content;
      }
    } catch (error) {
      console.log('Error with gpt-4o-mini, falling back to gpt-3.5-turbo:', error.message);
      // Fallback to gpt-3.5-turbo if gpt-4o-mini fails
      try {
        const fallbackResponse = await this.makeRequest('/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: 3000,
          temperature: 0.7
        }, signal);

        return fallbackResponse.choices[0].message.content;
      } catch (fallbackError) {
        console.error('Fallback generation also failed:', fallbackError);
        return `<h2>${lessonTitle}</h2><p>${lessonDescription}</p><p>Content generation failed. Please try again later.</p>`;
      }
    }
  }
}

export default OpenAIService;