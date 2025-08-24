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

  // ✅ FIXED: Generate content using RAG with vector store - Proper file_search implementation
  async generateContentWithRAG(vectorStoreId, systemPrompt, userPrompt, maxTokens = 2400) {
    console.log(`🔍 Generating RAG content using vector store: ${vectorStoreId}`);
    console.log(`📊 Using file_search with max_tokens: ${maxTokens}`);
    
    try {
      // ✅ CORRECTED: Use proper file_search tool configuration
      const chatData = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system", 
            content: systemPrompt
          },
          {
            role: "user", 
            content: userPrompt
          }
        ],
        // ✅ CRITICAL: Proper file_search tool configuration
        tools: [
          {
            type: "file_search"
          }
        ],
        // ✅ CRITICAL: Attach vector store to the conversation
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        },
        max_tokens: maxTokens,
        temperature: 0.5
      };

      console.log('🚀 Sending RAG request with file_search tool:', {
        vectorStoreId,
        toolsCount: chatData.tools.length,
        hasToolResources: !!chatData.tool_resources,
        vectorStoreIds: chatData.tool_resources.file_search.vector_store_ids
      });

      const response = await this.makeRequest('/chat/completions', {
        method: 'POST',
        data: chatData
      });

      // ✅ ENHANCED: Check if file_search was actually used
      const message = response.choices?.[0]?.message;
      const toolCalls = message?.tool_calls;
      const usedFileSearch = toolCalls?.some(call => call.type === 'file_search');

      console.log('✅ RAG content generated successfully');
      console.log('📊 RAG Usage Stats:', {
        responseLength: message?.content?.length || 0,
        toolCallsCount: toolCalls?.length || 0,
        usedFileSearch: usedFileSearch,
        hasAnnotations: message?.content?.includes('【') || false,
        finishReason: response.choices?.[0]?.finish_reason
      });

      // ✅ IMPORTANT: Log file_search usage for debugging
      if (usedFileSearch) {
        console.log('🎯 File search was successfully used in generation');
      } else {
        console.warn('⚠️ File search tool was NOT used - content generated without RAG');
      }

      return message?.content || 'Content generation failed';
    } catch (error) {
      console.error('❌ Error generating RAG content:', error);
      
      // ✅ ENHANCED: Better error handling for RAG failures
      if (error.message.includes('vector_store')) {
        throw new Error(`Vector store error: ${error.message}. The vector store may be processing files or unavailable.`);
      } else if (error.message.includes('file_search')) {
        throw new Error(`File search error: ${error.message}. Check if files are properly uploaded and processed.`);
      } else if (error.message.includes('rate_limit')) {
        throw new Error(`Rate limit exceeded: ${error.message}. Please try again later.`);
      } else {
        throw new Error(`Failed to generate RAG content: ${error.message}`);
      }
    }
  }

  // ✅ NEW: Check vector store status and file processing
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

  // ✅ NEW: List files in vector store
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