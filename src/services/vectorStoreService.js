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

  // Generate content using RAG with vector store
  async generateContentWithRAG(vectorStoreId, systemPrompt, userPrompt, maxTokens = 2400) {
    console.log(`Generating RAG content using vector store: ${vectorStoreId}`);
    try {
      const chatData = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        tools: [
          {
            type: "file_search",
            file_search: {
              max_num_results: 3
            }
          }
        ],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        },
        max_tokens: maxTokens
      };

      const response = await this.makeRequest('/chat/completions', {
        method: 'POST',
        data: chatData
      });

      console.log('RAG content generated successfully');
      return response.choices?.[0]?.message?.content || 'Content generation failed';
    } catch (error) {
      console.error('Error generating RAG content:', error);
      throw new Error(`Failed to generate RAG content: ${error.message}`);
    }
  }
}

export default VectorStoreService;