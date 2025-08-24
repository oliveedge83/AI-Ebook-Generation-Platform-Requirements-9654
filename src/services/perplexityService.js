class PerplexityService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.perplexity.ai';
  }

  async makeRequest(endpoint, data, signal = null) {
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

  async generateDeepResearch(ebookTopic, mustHaveAspects, otherDesignConsiderations, signal = null) {
    console.log(`Generating research for topic: ${ebookTopic} using standard Sonar model`);
    
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
      // Use the standard sonar model
      const requestData = {
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
        max_tokens: 2000,
        temperature: 0.7,
        search_recency_filter: "month"
      };

      console.log('Sending Perplexity research request with standard Sonar model...');
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

Research Method: Perplexity Sonar with real-time web data
Generated: ${new Date().toISOString()}
      `.trim();

      console.log('Research completed successfully with Perplexity Sonar');
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

  async generateSectionContext(ebookTitle, sectionTitle, signal = null) {
    console.log(`Generating section context for: ${sectionTitle} using standard Sonar model`);
    
    const prompt = `Provide current web research context for the section "${sectionTitle}" in the ebook "${ebookTitle}".

Include:
- 3-5 key current trends and insights
- 2-4 actionable takeaways
- Recent statistics or examples (last 1-3 months if available)
- Relevant industry developments

Keep the response focused and practical for content creation.`;

    const requestData = {
      model: "sonar",
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
      max_tokens: 800,
      temperature: 0.5,
      search_recency_filter: "month"
    };

    try {
      console.log('Generating section context with Perplexity Sonar...');
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

      console.log('Section context generated successfully with Perplexity Sonar');
      return formattedContext;

    } catch (error) {
      console.error('Perplexity section context generation failed:', error);
      console.log('Continuing without web search context...');
      return null; // Return null to continue gracefully without context
    }
  }
}

export default PerplexityService;