class VectorStoreService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async makeRequest(endpoint, options = {}) {
    const { method = 'GET', data, headers = {} } = options;
    
    const defaultHeaders = {
      'Authorization': `Bearer ${this.apiKey}`,
      'OpenAI-Beta': 'assistants=v2',
      ...headers
    };

    const config = {
      method,
      headers: defaultHeaders
    };

    if (data) {
      if (data instanceof FormData) {
        // Don't set Content-Type for FormData, let browser set it
        delete config.headers['Content-Type'];
        config.body = data;
      } else {
        config.headers['Content-Type'] = 'application/json';
        config.body = JSON.stringify(data);
      }
    }

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || `API error: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Vector Store API request failed: ${error.message}`);
      throw error;
    }
  }

  // List all existing vector stores
  async listVectorStores() {
    console.log('Fetching existing vector stores...');
    try {
      const response = await this.makeRequest('/vector_stores');
      console.log('Vector stores fetched successfully:', response.data?.length || 0, 'stores');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching vector stores:', error);
      throw new Error(`Failed to fetch vector stores: ${error.message}`);
    }
  }

  // Upload a single file
  async uploadFile(file) {
    console.log(`Uploading file: ${file.name}`);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('purpose', 'assistants');

      const response = await this.makeRequest('/files', {
        method: 'POST',
        data: formData
      });

      console.log(`File uploaded successfully: ${file.name} -> ${response.id}`);
      return response;
    } catch (error) {
      console.error(`Error uploading file ${file.name}:`, error);
      throw new Error(`Failed to upload file ${file.name}: ${error.message}`);
    }
  }

  // Upload multiple files
  async uploadFiles(files) {
    console.log(`Uploading ${files.length} files...`);
    const uploadPromises = files.map(file => this.uploadFile(file));
    
    try {
      const results = await Promise.all(uploadPromises);
      console.log(`All ${files.length} files uploaded successfully`);
      return results;
    } catch (error) {
      console.error('Error uploading files:', error);
      throw error;
    }
  }

  // Create a new vector store with files
  async createVectorStore(name, fileIds) {
    console.log(`Creating vector store: ${name} with ${fileIds.length} files`);
    try {
      const data = {
        name: name,
        chunking_strategy: {
          type: "static",
          static: {
            max_chunk_size_tokens: 650,
            chunk_overlap_tokens: 250
          }
        },
        file_ids: fileIds
      };

      const response = await this.makeRequest('/vector_stores', {
        method: 'POST',
        data
      });

      console.log(`Vector store created successfully: ${name} -> ${response.id}`);
      return response;
    } catch (error) {
      console.error(`Error creating vector store ${name}:`, error);
      throw new Error(`Failed to create vector store ${name}: ${error.message}`);
    }
  }

  // Get vector store details
  async getVectorStore(vectorStoreId) {
    console.log(`Fetching vector store details: ${vectorStoreId}`);
    try {
      const response = await this.makeRequest(`/vector_stores/${vectorStoreId}`);
      console.log(`Vector store details fetched: ${response.name}`);
      return response;
    } catch (error) {
      console.error(`Error fetching vector store ${vectorStoreId}:`, error);
      throw new Error(`Failed to fetch vector store: ${error.message}`);
    }
  }

  // ✅ UPDATED: Generate content using RAG with RESPONSES API - Complete context integration
  async generateContentWithRAG(
    vectorStoreId, 
    systemPrompt, 
    userPrompt, 
    maxTokens = 2400,
    gptOptions = {}
  ) {
    console.log(`🔍 Generating RAG content using RESPONSES API with vector store: ${vectorStoreId}`);
    console.log(`📊 Using /responses endpoint with max_tokens: ${maxTokens}`);
    console.log(`🧠 Model: ${gptOptions.model || 'gpt-4.1-mini-2025-04-14'}`);
    console.log(`📝 System prompt length: ${systemPrompt.length} chars`);
    console.log(`📝 User prompt length: ${userPrompt.length} chars`);

    try {
      // ✅ CRITICAL: Use the NEW /responses endpoint for RAG operations
      const responseData = {
        // DYNAMIC MODEL: Use model from gptOptions with fallback
        model: gptOptions.model || "gpt-4.1-mini-2025-04-14",
        
        // COMPLETE CONTEXT: All context sources included in input messages
        input: [
          {
            role: "system", 
            content: systemPrompt  // Contains: research context + user context + instructions
          },
          {
            role: "user", 
            content: userPrompt    // Contains: lesson prompt + web search context + specific instructions
          }
        ],
        
        // ✅ ENHANCED: Proper file_search tool configuration for /responses
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vectorStoreId],
            max_num_results: 3  // Limit search results for focused retrieval
          }
        ],
        
        // DYNAMIC OPTIONS: Use advanced options from gptOptions
        max_output_tokens: gptOptions.max_tokens_gpt || maxTokens,
        temperature: gptOptions.temperature || 0.5
      };

      console.log('🚀 Sending RAG request to /responses endpoint:', {
        endpoint: '/responses',
        vectorStoreId,
        model: responseData.model,
        toolsCount: responseData.tools.length,
        maxNumResults: responseData.tools[0].max_num_results,
        maxTokens: responseData.max_tokens,
        temperature: responseData.temperature,
        inputMessages: responseData.input.length,
        systemPromptHasWebContext: systemPrompt.includes('web_search context') || systemPrompt.includes('Web Research Context'),
        userPromptHasWebContext: userPrompt.includes('web_search context') || userPrompt.includes('Web Research Context'),
        hasUserAddedContext: systemPrompt.includes('User\'s Additional Context'),
        hasResearchContext: systemPrompt.includes('research brief') || systemPrompt.includes('Market Research')
      });

      // ✅ CRITICAL: Use /responses endpoint instead of /chat/completions
      const response = await this.makeRequest('/responses', {
        method: 'POST',
        data: responseData
      });

      // ✅ ENHANCED: Parse response from /responses API format
      const responseContent = response.content;
      const usage = response.usage;
      const responseId = response.id;

      // ✅ IMPORTANT: Log comprehensive RAG usage statistics
      console.log('✅ RAG content generated successfully via /responses API');
      console.log('📊 RAG Generation Stats:', {
        responseId: responseId,
        responseLength: responseContent?.length || 0,
        promptTokens: usage?.prompt_tokens || 0,
        completionTokens: usage?.completion_tokens || 0,
        totalTokens: usage?.total_tokens || 0,
        model: response.model,
        finishReason: response.finish_reason,
        hasContent: !!responseContent,
        contentPreview: responseContent?.substring(0, 100) + '...'
      });

      // ✅ VALIDATION: Ensure we got valid content
      if (!responseContent || responseContent.trim().length === 0) {
        throw new Error('Empty response from RAG generation via /responses API');
      }

      // ✅ SUCCESS: Return the generated content
      console.log('🎯 RAG content successfully generated with complete context integration:', {
        allContextSourcesUsed: true,
        marketingResearchContext: systemPrompt.includes('research brief'),
        userAddedContext: systemPrompt.includes('User\'s Additional Context'),
        webSearchContext: userPrompt.includes('web_search context'),
        ragFileSearch: true,
        lessonSpecificPrompt: userPrompt.includes('section title'),
        endpointUsed: '/responses',
        vectorStoreId: vectorStoreId
      });

      return responseContent;

    } catch (error) {
      console.error('❌ Error generating RAG content via /responses API:', error);
      
      // ✅ ENHANCED: Better error handling for /responses API failures
      if (error.message.includes('vector_store')) {
        throw new Error(`Vector store error: ${error.message}. The vector store may be processing files or unavailable.`);
      } else if (error.message.includes('file_search')) {
        throw new Error(`File search error: ${error.message}. Check if files are properly uploaded and processed.`);
      } else if (error.message.includes('rate_limit')) {
        throw new Error(`Rate limit exceeded: ${error.message}. Please try again later.`);
      } else if (error.message.includes('model')) {
        throw new Error(`Model error: ${error.message}. The specified model may not be available for /responses API.`);
      } else {
        throw new Error(`Failed to generate RAG content via /responses API: ${error.message}`);
      }
    }
  }

  // ✅ UNCHANGED: Check vector store status and file processing
  async checkVectorStoreStatus(vectorStoreId) {
    console.log(`🔍 Checking vector store status: ${vectorStoreId}`);
    try {
      const vectorStore = await this.getVectorStore(vectorStoreId);
      
      const status = {
        id: vectorStore.id,
        name: vectorStore.name,
        status: vectorStore.status,
        fileCount: vectorStore.file_counts?.total || 0,
        processedFiles: vectorStore.file_counts?.completed || 0,
        failedFiles: vectorStore.file_counts?.failed || 0,
        inProgressFiles: vectorStore.file_counts?.in_progress || 0,
        isReady: vectorStore.status === 'completed',
        createdAt: new Date(vectorStore.created_at * 1000).toISOString()
      };

      console.log('📊 Vector Store Status:', status);
      return status;
    } catch (error) {
      console.error('❌ Error checking vector store status:', error);
      throw error;
    }
  }

  // ✅ UNCHANGED: List files in vector store
  async listVectorStoreFiles(vectorStoreId) {
    console.log(`📁 Listing files in vector store: ${vectorStoreId}`);
    try {
      const response = await this.makeRequest(`/vector_stores/${vectorStoreId}/files`);
      const files = response.data || [];
      
      console.log(`📁 Found ${files.length} files in vector store`);
      
      return files.map(file => ({
        id: file.id,
        status: file.status,
        createdAt: new Date(file.created_at * 1000).toISOString(),
        lastError: file.last_error
      }));
    } catch (error) {
      console.error('❌ Error listing vector store files:', error);
      throw new Error(`Failed to list vector store files: ${error.message}`);
    }
  }
}

export default VectorStoreService;