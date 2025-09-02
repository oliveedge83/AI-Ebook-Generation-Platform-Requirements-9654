class PerplexityService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.perplexity.ai';
  }

  async makeRequest(endpoint, data, signal = null) {
    // VibeCoding: Log now shows the dynamically selected model from the request data
    console.log(`Making Perplexity request to ${endpoint} with model: ${data.model}`);
    
    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(data),
        signal: signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }
        console.error('Perplexity API error:', errorData);
        throw new Error(errorData.error?.message || `Perplexity API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      // VibeCoding: Success log now shows the actual model used in the request
      console.log(`Perplexity request successful with model: ${data.model}`);
      return result;
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('Perplexity request was aborted');
        throw new Error('Request was aborted by user');
      }
      console.error(`Perplexity API request failed: ${error.message}`);
      throw error;
    }
  }

  // VibeCoding: FIXED - generateDeepResearch now uses FIXED defaults, ignoring sonarOptions for research
  async generateDeepResearch(ebookTopic, mustHaveAspects, otherDesignConsiderations, sonarOptions = {}, signal = null) {
    // VibeCoding: Log shows fixed defaults for research
    console.log(`Generating research for topic: ${ebookTopic} using FIXED defaults (model: sonar, recency: month, mode: web, tokens: 2000)`);
    
    const prompt = `Conduct comprehensive market research for an ebook on: "${ebookTopic}"

Key Requirements:
- Must-have content: ${mustHaveAspects}
- Additional considerations: ${otherDesignConsiderations || 'None specified'}

Please provide a detailed research brief that includes:
1. Target audience analysis and ideal reader profile
2. Current market trends and developments (focus on recent data)
3. Key pain points and emotional triggers for the target audience
4. Recommended content structure and chapter topics
5. Market positioning and competitive landscape
6. Reader transformation goals and desired outcomes

Format the response as a comprehensive research brief that can guide ebook creation.`;

    try {
      // VibeCoding: FIXED - requestData now uses FIXED defaults for research consistency
      const requestData = {
        // FIXED: Always use "sonar" model for research
        model: "sonar",
        messages: [
          {
            role: "system",
            content: "You are an expert market researcher and content strategist. Provide comprehensive, actionable research insights for ebook creation based on current web data and trends."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        // FIXED: Always use 2000 tokens for research
        max_tokens: 2000,
        // FIXED: Always use 0.7 temperature for research
        temperature: 0.7,
        // FIXED: Always use 'month' recency filter for research
        search_recency_filter: 'month',
        // FIXED: Always use 'web' search mode for research
        search_mode: 'web'
        // VibeCoding: NO location filters, NO domain filters, NO custom date ranges for research
        // This ensures consistent, reliable research results every time
      };

      console.log('Sending Perplexity research request with FIXED defaults (no advanced options applied to research)...');
      const response = await this.makeRequest('/chat/completions', requestData, signal);

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        throw new Error('Invalid response structure from Perplexity API');
      }

      const researchContent = response.choices[0].message.content;
      if (!researchContent || researchContent.trim().length === 0) {
        throw new Error('Empty response from Perplexity API');
      }

      // Format the research brief for consistency with the rest of the system
      const formattedBrief = `
ebookTitle: "${ebookTopic} - Complete Professional Guide"

Market Research Brief:
${researchContent}

Research Method: Perplexity Sonar with fixed defaults (model: sonar, recency: month, mode: web, tokens: 2000)
Generated: ${new Date().toISOString()}
      `.trim();

      console.log('Research completed successfully with Perplexity Sonar using fixed defaults');
      console.log('Research brief length:', formattedBrief.length, 'characters');
      return formattedBrief;
    } catch (error) {
      console.error('Perplexity research failed:', error);
      // Provide more specific error messages
      if (error.message.includes('rate_limit_exceeded')) {
        throw new Error(`Perplexity rate limit exceeded: ${error.message}. Please try again later or use fallback API key.`);
      } else if (error.message.includes('invalid_api_key') || error.message.includes('authentication')) {
        throw new Error(`Perplexity authentication failed: ${error.message}. Please check your API key in settings.`);
      } else if (error.message.includes('model_not_found')) {
        throw new Error(`Perplexity model not available: ${error.message}. The service may be temporarily unavailable.`);
      } else {
        throw new Error(`Perplexity research failed: ${error.message}`);
      }
    }
  }

  // VibeCoding: NEW METHOD - generateChapterTopicContext - Aggregated context generation at chapter topic level
  async generateChapterTopicContext(ebookTitle, chapterTopicTitle, topicSections, sonarOptions = {}, signal = null) {
    // VibeCoding: Log shows chapter-topic aggregated call with dynamic options
    console.log(`🔍 Generating chapter topic context for: "${chapterTopicTitle}" with ${topicSections.length} sections using model: ${sonarOptions.model || 'sonar'}`);
    console.log(`📋 Topic sections: ${topicSections.map(section => section.lessonTitle).join(', ')}`);

    // VibeCoding: Build section names array for the prompt
    const sectionNames = topicSections.map(section => section.lessonTitle);
    const sectionDescriptions = topicSections.map(section => 
      `"${section.lessonTitle}": ${section.lessonDescription}`
    ).join(', ');

    const prompt = `For the chapter topic "${chapterTopicTitle}" in the ebook "${ebookTitle}", provide structured research context for the following sections:

Section Details: ${sectionDescriptions}

Return a JSON array where each object corresponds to one section and contains:
- sectionName: The exact section name from the list
- summary: A comprehensive 300-400 word summary with current insights and trends
- keyPoints: 3-5 key actionable insights or important points
- sources: Up to 5 relevant URLs or references (if available)

Focus on recent developments, practical applications, and current industry trends for each section.`;

    // VibeCoding: Build requestData dynamically from sonarOptions with structured output
    const requestData = {
      // DYNAMIC_OPTION: Use the model from options, or default to "sonar"
      model: sonarOptions.model || "sonar",
      messages: [
        {
          role: "system",
          content: "You are a research assistant generating structured context for ebook sections. Always return valid JSON arrays with the requested structure."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      // DYNAMIC_OPTION: Use max_tokens from options, or default to 1500 (higher for multiple sections)
      max_tokens: sonarOptions.max_tokens_sonar || 1500,
      // DYNAMIC_OPTION: Use temperature from options or default to 0.3 (lower for structured output)
      temperature: sonarOptions.temperature || 0.3,
      // VibeCoding: Structured output via JSON schema
      response_format: {
        type: "json_schema",
        json_schema: {
          schema: {
            type: "array",
            items: {
              type: "object",
              required: ["sectionName", "summary", "keyPoints", "sources"],
              properties: {
                sectionName: { type: "string" },
                summary: { type: "string" },
                keyPoints: { 
                  type: "array", 
                  items: { type: "string" },
                  minItems: 3,
                  maxItems: 5
                },
                sources: { 
                  type: "array", 
                  items: { type: "string" },
                  maxItems: 5
                }
              }
            }
          }
        }
      }
    };

    // VibeCoding: Add search-specific options only if they exist in sonarOptions
    // DYNAMIC_OPTION: Add search recency filter if specified and not daterange
    if (sonarOptions.search_recency_filter && sonarOptions.search_recency_filter !== 'daterange') {
      requestData.search_recency_filter = sonarOptions.search_recency_filter;
    }

    // DYNAMIC_OPTION: Add search mode if specified
    if (sonarOptions.search_mode) {
      requestData.search_mode = sonarOptions.search_mode;
    }

    // DYNAMIC_OPTION: Add domain filter if specified and mode is not 'academic'
    if (sonarOptions.search_domain_filter && sonarOptions.search_mode !== 'academic') {
      requestData.search_domain_filter = sonarOptions.search_domain_filter.split(',').map(d => d.trim());
    }

    // VibeCoding: Build web_search_options object with conditional fields
    const webSearchOptions = {};

    // DYNAMIC_OPTION: Add search context size if specified
    if (sonarOptions.search_context_size) {
      webSearchOptions.search_context_size = sonarOptions.search_context_size;
    }

    // DYNAMIC_OPTION: Add user location if any location fields are specified
    const userLocation = {};
    if (sonarOptions.country) userLocation.country = sonarOptions.country;
    if (sonarOptions.region) userLocation.region = sonarOptions.region;
    if (sonarOptions.city) userLocation.city = sonarOptions.city;
    if (Object.keys(userLocation).length > 0) {
      webSearchOptions.user_location = userLocation;
    }

    // VibeCoding: Only add web_search_options if it has content
    if (Object.keys(webSearchOptions).length > 0) {
      requestData.web_search_options = webSearchOptions;
    }

    // DYNAMIC_OPTION: Handle custom date range filters if daterange is selected
    if (sonarOptions.search_recency_filter === 'daterange') {
      if (sonarOptions.search_after_date_filter) {
        requestData.search_after_date_filter = sonarOptions.search_after_date_filter;
      }
      if (sonarOptions.search_before_date_filter) {
        requestData.search_before_date_filter = sonarOptions.search_before_date_filter;
      }
      if (sonarOptions.last_updated_after_filter) {
        requestData.last_updated_after_filter = sonarOptions.last_updated_after_filter;
      }
      if (sonarOptions.last_updated_before_filter) {
        requestData.last_updated_before_filter = sonarOptions.last_updated_before_filter;
      }
    }

    try {
      console.log('🚀 Generating chapter topic context with dynamic Perplexity Sonar options and structured output...');
      console.log('📊 Request details:', {
        chapterTopic: chapterTopicTitle,
        sectionsCount: topicSections.length,
        model: requestData.model,
        maxTokens: requestData.max_tokens,
        hasStructuredOutput: !!requestData.response_format,
        advancedOptionsUsed: Object.keys(sonarOptions).length
      });

      const response = await this.makeRequest('/chat/completions', requestData, signal);

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        console.warn('Invalid response structure for chapter topic context');
        return null;
      }

      const contextContent = response.choices[0].message.content;
      if (!contextContent || contextContent.trim().length === 0) {
        console.warn('Empty chapter topic context response');
        return null;
      }

      // VibeCoding: Parse structured JSON response
      let structuredContext;
      try {
        structuredContext = JSON.parse(contextContent);
        
        if (!Array.isArray(structuredContext)) {
          throw new Error('Response is not an array');
        }

        // VibeCoding: Validate that we have context for each section
        const providedSections = structuredContext.map(item => item.sectionName);
        const missingSections = sectionNames.filter(name => 
          !providedSections.some(provided => 
            provided.toLowerCase().includes(name.toLowerCase()) || 
            name.toLowerCase().includes(provided.toLowerCase())
          )
        );

        if (missingSections.length > 0) {
          console.warn('⚠️ Missing context for sections:', missingSections);
        }

        console.log('✅ Chapter topic context generated successfully with structured output');
        console.log('📊 Context stats:', {
          sectionsProvided: structuredContext.length,
          sectionsRequested: sectionNames.length,
          avgSummaryLength: Math.round(structuredContext.reduce((sum, item) => sum + (item.summary?.length || 0), 0) / structuredContext.length),
          totalSources: structuredContext.reduce((sum, item) => sum + (item.sources?.length || 0), 0)
        });

        // VibeCoding: Return formatted context with metadata
        return {
          chapterTopic: chapterTopicTitle,
          ebookTitle: ebookTitle,
          sectionContexts: structuredContext,
          generatedAt: new Date().toISOString(),
          sonarOptionsUsed: sonarOptions,
          sectionsCount: topicSections.length
        };

      } catch (parseError) {
        console.error('❌ Failed to parse structured JSON response:', parseError);
        console.log('Raw response content:', contextContent);
        
        // VibeCoding: Fallback - return unstructured context if JSON parsing fails
        console.log('🔄 Using fallback unstructured context format...');
        return {
          chapterTopic: chapterTopicTitle,
          ebookTitle: ebookTitle,
          fallbackContent: contextContent,
          generatedAt: new Date().toISOString(),
          sonarOptionsUsed: sonarOptions,
          sectionsCount: topicSections.length,
          isStructured: false
        };
      }

    } catch (error) {
      console.error('❌ Perplexity chapter topic context generation failed:', error);
      console.log('Continuing without chapter topic context...');
      return null; // Return null to continue gracefully without context
    }
  }

  // VibeCoding: DEPRECATED - This method is replaced by generateChapterTopicContext
  // Keeping for backward compatibility but it should not be used anymore
  async generateSectionContext(ebookTitle, sectionTitle, sonarOptions = {}, signal = null) {
    console.warn('⚠️ DEPRECATED: generateSectionContext is deprecated. Use generateChapterTopicContext instead.');
    // VibeCoding: Log now reflects the dynamically selected model from options
    console.log(`Generating section context for: ${sectionTitle} using model: ${sonarOptions.model || 'sonar'}`);

    const prompt = `Provide current web research context for the section "${sectionTitle}" in the ebook "${ebookTitle}".

Include:
- 3-5 key current trends and insights
- 2-4 actionable takeaways  
- Recent statistics or examples (last 1-3 months if available)
- Relevant industry developments

Keep the response focused and practical for content creation.`;

    // VibeCoding: requestData is now built dynamically from sonarOptions with fallbacks
    const requestData = {
      // DYNAMIC_OPTION: Use the model from options, or default to "sonar"
      model: sonarOptions.model || "sonar",
      messages: [
        {
          role: "system",
          content: "You are a research assistant providing current web context for content creation. Focus on recent, actionable insights from web sources."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      // DYNAMIC_OPTION: Use max_tokens from options, or default to 800
      max_tokens: sonarOptions.max_tokens_sonar || 800,
      // DYNAMIC_OPTION: Use temperature from options or default to 0.5
      temperature: sonarOptions.temperature || 0.5
    };

    // VibeCoding: Add search-specific options only if they exist in sonarOptions
    // DYNAMIC_OPTION: Add search recency filter if specified and not daterange
    if (sonarOptions.search_recency_filter && sonarOptions.search_recency_filter !== 'daterange') {
      requestData.search_recency_filter = sonarOptions.search_recency_filter;
    }

    // DYNAMIC_OPTION: Add search mode if specified
    if (sonarOptions.search_mode) {
      requestData.search_mode = sonarOptions.search_mode;
    }

    // DYNAMIC_OPTION: Add domain filter if specified and mode is not 'academic'
    if (sonarOptions.search_domain_filter && sonarOptions.search_mode !== 'academic') {
      requestData.search_domain_filter = sonarOptions.search_domain_filter.split(',').map(d => d.trim());
    }

    // VibeCoding: Build web_search_options object with conditional fields
    const webSearchOptions = {};

    // DYNAMIC_OPTION: Add search context size if specified
    if (sonarOptions.search_context_size) {
      webSearchOptions.search_context_size = sonarOptions.search_context_size;
    }

    // DYNAMIC_OPTION: Add user location if any location fields are specified
    const userLocation = {};
    if (sonarOptions.country) userLocation.country = sonarOptions.country;
    if (sonarOptions.region) userLocation.region = sonarOptions.region;
    if (sonarOptions.city) userLocation.city = sonarOptions.city;
    if (Object.keys(userLocation).length > 0) {
      webSearchOptions.user_location = userLocation;
    }

    // VibeCoding: Only add web_search_options if it has content
    if (Object.keys(webSearchOptions).length > 0) {
      requestData.web_search_options = webSearchOptions;
    }

    // DYNAMIC_OPTION: Handle custom date range filters if daterange is selected
    if (sonarOptions.search_recency_filter === 'daterange') {
      if (sonarOptions.search_after_date_filter) {
        requestData.search_after_date_filter = sonarOptions.search_after_date_filter;
      }
      if (sonarOptions.search_before_date_filter) {
        requestData.search_before_date_filter = sonarOptions.search_before_date_filter;
      }
      if (sonarOptions.last_updated_after_filter) {
        requestData.last_updated_after_filter = sonarOptions.last_updated_after_filter;
      }
      if (sonarOptions.last_updated_before_filter) {
        requestData.last_updated_before_filter = sonarOptions.last_updated_before_filter;
      }
    }

    try {
      console.log('Generating section context with dynamic Perplexity Sonar options...');
      const response = await this.makeRequest('/chat/completions', requestData, signal);

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        console.warn('Invalid response structure for section context');
        return null;
      }

      const contextContent = response.choices[0].message.content;
      if (!contextContent || contextContent.trim().length === 0) {
        console.warn('Empty section context response');
        return null;
      }

      const formattedContext = `
Web Research Context for "${sectionTitle}":
${contextContent}

Note: This context is based on recent web research and should be used to enhance the content with current trends and data.
Generated: ${new Date().toISOString()}
      `.trim();

      console.log('Section context generated successfully with dynamic Perplexity Sonar options');
      return formattedContext;
    } catch (error) {
      console.error('Perplexity section context generation failed:', error);
      console.log('Continuing without web search context...');
      return null; // Return null to continue gracefully without context
    }
  }

  // VibeCoding: Updated method signature to accept sonarOptions configuration object
  async generateTopicReferences(ebookTitle, topicTitle, sonarOptions = {}, signal = null) {
    // VibeCoding: Log now reflects the dynamically selected model from options
    console.log(`🔍 Generating web references for topic: ${topicTitle} using model: ${sonarOptions.model || 'sonar'}`);

    const prompt = `Find current web sources and references for the topic "${topicTitle}" in the context of "${ebookTitle}".

Please provide:
- 2-3 most relevant and recent web sources
- Brief description (first 20 words) for each source
- Focus on authoritative, recent content (last 3-6 months preferred)
- Include practical resources, case studies, or expert insights

Format for easy integration into content.`;

    // VibeCoding: requestData is now built dynamically from sonarOptions with fallbacks
    const requestData = {
      // DYNAMIC_OPTION: Use the model from options, or default to "sonar"
      model: sonarOptions.model || "sonar",
      messages: [
        {
          role: "system",
          content: "You are a research assistant finding relevant web sources for educational content. Focus on authoritative, recent sources with practical value."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      // DYNAMIC_OPTION: Use max_tokens from options, or default to 600
      max_tokens: sonarOptions.max_tokens_sonar || 600,
      // DYNAMIC_OPTION: Use temperature from options or default to 0.3
      temperature: sonarOptions.temperature || 0.3
    };

    // VibeCoding: Add search-specific options only if they exist in sonarOptions
    // DYNAMIC_OPTION: Add search recency filter if specified and not daterange
    if (sonarOptions.search_recency_filter && sonarOptions.search_recency_filter !== 'daterange') {
      requestData.search_recency_filter = sonarOptions.search_recency_filter;
    }

    // DYNAMIC_OPTION: Add search mode if specified
    if (sonarOptions.search_mode) {
      requestData.search_mode = sonarOptions.search_mode;
    }

    // DYNAMIC_OPTION: Add domain filter if specified and mode is not 'academic'
    if (sonarOptions.search_domain_filter && sonarOptions.search_mode !== 'academic') {
      requestData.search_domain_filter = sonarOptions.search_domain_filter.split(',').map(d => d.trim());
    }

    // VibeCoding: Build web_search_options object with conditional fields
    const webSearchOptions = {};

    // DYNAMIC_OPTION: Add search context size if specified
    if (sonarOptions.search_context_size) {
      webSearchOptions.search_context_size = sonarOptions.search_context_size;
    }

    // DYNAMIC_OPTION: Add user location if any location fields are specified
    const userLocation = {};
    if (sonarOptions.country) userLocation.country = sonarOptions.country;
    if (sonarOptions.region) userLocation.region = sonarOptions.region;
    if (sonarOptions.city) userLocation.city = sonarOptions.city;
    if (Object.keys(userLocation).length > 0) {
      webSearchOptions.user_location = userLocation;
    }

    // VibeCoding: Only add web_search_options if it has content
    if (Object.keys(webSearchOptions).length > 0) {
      requestData.web_search_options = webSearchOptions;
    }

    // DYNAMIC_OPTION: Handle custom date range filters if daterange is selected
    if (sonarOptions.search_recency_filter === 'daterange') {
      if (sonarOptions.search_after_date_filter) {
        requestData.search_after_date_filter = sonarOptions.search_after_date_filter;
      }
      if (sonarOptions.search_before_date_filter) {
        requestData.search_before_date_filter = sonarOptions.search_before_date_filter;
      }
      if (sonarOptions.last_updated_after_filter) {
        requestData.last_updated_after_filter = sonarOptions.last_updated_after_filter;
      }
      if (sonarOptions.last_updated_before_filter) {
        requestData.last_updated_before_filter = sonarOptions.last_updated_before_filter;
      }
    }

    try {
      console.log('🔍 Searching for topic references with dynamic Perplexity Sonar options...');
      const response = await this.makeRequest('/chat/completions', requestData, signal);

      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        console.warn('Invalid response structure for topic references');
        return null;
      }

      const referencesContent = response.choices[0].message.content;
      if (!referencesContent || referencesContent.trim().length === 0) {
        console.warn('Empty topic references response');
        return null;
      }

      // Extract search results if available
      let webReferences = null;
      if (response.search_results && response.search_results.length > 0) {
        console.log(`📊 Found ${response.search_results.length} search results from Sonar`);
        
        // Take top 2-3 results
        const topResults = response.search_results.slice(0, 3);
        webReferences = topResults.map(result => ({
          title: result.title,
          url: result.url,
          date: result.date,
          snippet: result.title ? result.title.split(' ').slice(0, 20).join(' ') + '...' : 'Relevant resource for this topic...'
        }));
        
        console.log('📋 Processed web references:', webReferences);
      }

      const formattedReferences = {
        content: referencesContent,
        webSources: webReferences,
        topicTitle,
        generatedAt: new Date().toISOString()
      };

      console.log('✅ Topic references generated successfully with dynamic Perplexity Sonar options');
      return formattedReferences;
    } catch (error) {
      console.error('❌ Perplexity topic references generation failed:', error);
      console.log('Continuing without web references...');
      return null; // Return null to continue gracefully without references
    }
  }

  // VibeCoding: Helper method to extract section context from chapter topic context
  extractSectionContext(chapterTopicContext, sectionTitle) {
    if (!chapterTopicContext || !chapterTopicContext.sectionContexts) {
      return null;
    }

    // VibeCoding: Find matching section context by name (flexible matching)
    const sectionContext = chapterTopicContext.sectionContexts.find(context => 
      context.sectionName.toLowerCase().includes(sectionTitle.toLowerCase()) || 
      sectionTitle.toLowerCase().includes(context.sectionName.toLowerCase())
    );

    if (!sectionContext) {
      console.warn(`⚠️ No context found for section: ${sectionTitle} in chapter topic context`);
      return null;
    }

    // VibeCoding: Format section context for content generation
    const formattedContext = `
Web Research Context for "${sectionTitle}":

Summary: ${sectionContext.summary}

Key Points:
${sectionContext.keyPoints.map((point, index) => `${index + 1}. ${point}`).join('\n')}

${sectionContext.sources && sectionContext.sources.length > 0 ? `
Sources:
${sectionContext.sources.map((source, index) => `${index + 1}. ${source}`).join('\n')}
` : ''}

Note: This context is based on recent web research at the chapter topic level and should be used to enhance the content with current trends and data.
Generated: ${chapterTopicContext.generatedAt}
    `.trim();

    console.log(`✅ Extracted section context for: ${sectionTitle}`);
    return formattedContext;
  }

  // Format web references for content integration (unchanged - no parameters needed)
  formatWebReferencesForContent(webReferences) {
    if (!webReferences || !webReferences.webSources || webReferences.webSources.length === 0) {
      return '';
    }

    const referencesHtml = `
<div class="web-references" style="margin-top: 2rem; padding: 1rem; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">
  <h4 style="margin-bottom: 0.75rem; color: #495057; font-size: 0.9rem; font-weight: 600;">📚 Additional Web Resources:</h4>
  <ul style="margin: 0; padding-left: 1.25rem; font-size: 0.85rem; line-height: 1.5;">
    ${webReferences.webSources.map(source => `
      <li style="margin-bottom: 0.5rem;">
        <a href="${source.url}" target="_blank" rel="noopener noreferrer" style="color: #007bff; text-decoration: none; font-weight: 500;">
          ${source.title}
        </a>
        <br>
        <span style="color: #6c757d; font-size: 0.8rem;">${source.snippet}</span>
        ${source.date ? `<br><small style="color: #868e96;">Published: ${source.date}</small>` : ''}
      </li>
    `).join('')}
  </ul>
  <p style="margin-top: 0.75rem; margin-bottom: 0; font-size: 0.75rem; color: #868e96; font-style: italic;">
    Sources found via Perplexity Sonar web search • Generated: ${new Date(webReferences.generatedAt).toLocaleDateString()}
  </p>
</div>
    `;

    return referencesHtml;
  }
}

export default PerplexityService;