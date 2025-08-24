import axios from 'axios';

class WordPressService {
  constructor(url, username, password) {
    this.url = url;
    this.auth = {
      username,
      password
    };

    // Log initialization
    console.log(`Initializing WordPress service for URL: ${url}`);

    // Remove trailing slashes from URL for consistency
    if (this.url.endsWith('/')) {
      this.url = this.url.slice(0, -1);
    }
  }

  // Enhanced error parsing
  parseError(error, operation) {
    console.error(`WordPress ${operation} error details:`, {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      responseData: error.response?.data,
      requestConfig: error.config,
      isNetworkError: !error.response,
      isTimeoutError: error.code === 'ECONNABORTED',
      isCORSError: error.message.includes('CORS') || error.message.includes('cross-origin')
    });

    // Network Error Analysis
    if (!error.response) {
      if (error.code === 'ECONNABORTED') {
        return `Connection timeout to ${this.url}. The WordPress site may be slow or unreachable.`;
      }
      if (error.message === 'Network Error') {
        return `Network Error: Cannot connect to ${this.url}. This could be due to:
        • CORS policy blocking the request
        • WordPress site is down or unreachable
        • SSL/TLS certificate issues
        • Firewall or network restrictions
        • WordPress REST API is disabled`;
      }
      return `Network connection failed to ${this.url}: ${error.message}`;
    }

    // HTTP Error Analysis
    const status = error.response.status;
    const responseData = error.response.data;

    if (status === 401) {
      return `Authentication failed: Invalid username or password for ${this.url}`;
    }
    if (status === 403) {
      return `Permission denied: User doesn't have sufficient permissions on ${this.url}`;
    }
    if (status === 404) {
      return `Custom post type endpoint not found: The '${operation}' custom post type may not exist on ${this.url}. Please ensure the custom post types are properly registered.`;
    }
    if (status === 500) {
      return `WordPress server error: Internal server error on ${this.url}. Check WordPress error logs.`;
    }

    // Try to extract WordPress error message
    const wpError = responseData?.message || responseData?.error || responseData?.code;
    return wpError || `WordPress API error (${status}): ${error.response.statusText}`;
  }

  // Create axios instance with better configuration
  createAxiosConfig(endpoint, data = null, method = 'GET') {
    const config = {
      method,
      url: endpoint,
      auth: this.auth,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'EbookGen/1.0'
      },
      timeout: 30000, // Increased timeout
      validateStatus: function (status) {
        return status >= 200 && status < 300; // Only accept 2xx responses
      }
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      config.data = data;
    }

    return config;
  }

  // Validate WordPress API URL
  async validateConnection() {
    try {
      console.log('Validating WordPress connection...');
      const config = this.createAxiosConfig(`${this.url}/wp-json`);
      const response = await axios(config);

      if (response.status === 200) {
        console.log('WordPress connection validated successfully');
        return {
          success: true,
          data: response.data
        };
      } else {
        console.error('WordPress API responded with non-200 status:', response.status);
        return {
          success: false,
          error: `API responded with status: ${response.status}`
        };
      }
    } catch (error) {
      const errorMessage = this.parseError(error, 'connection validation');
      return {
        success: false,
        error: errorMessage,
        details: {
          originalError: error.message,
          url: `${this.url}/wp-json`,
          hasResponse: !!error.response,
          status: error.response?.status,
          statusText: error.response?.statusText
        }
      };
    }
  }

  // Check if WordPress REST API is available
  async checkRestApiAvailability() {
    try {
      console.log('Checking WordPress REST API availability...');
      const config = this.createAxiosConfig(`${this.url}/wp-json`);
      // Remove auth for this check as it should be publicly accessible
      delete config.auth;

      const response = await axios(config);

      if (response.status === 200) {
        console.log('WordPress REST API is available');
        return {
          available: true,
          data: response.data
        };
      } else {
        console.warn('WordPress REST API responded with non-200 status:', response.status);
        return {
          available: false,
          error: `API responded with status: ${response.status}`
        };
      }
    } catch (error) {
      const errorMessage = this.parseError(error, 'REST API availability check');
      return {
        available: false,
        error: errorMessage,
        details: {
          originalError: error.message,
          url: `${this.url}/wp-json`,
          hasResponse: !!error.response
        }
      };
    }
  }

  // Verify user credentials
  async verifyCredentials() {
    try {
      console.log('Verifying WordPress user credentials...');
      const config = this.createAxiosConfig(`${this.url}/wp-json/wp/v2/users/me`);
      const response = await axios(config);

      if (response.status === 200) {
        console.log('WordPress credentials verified successfully');
        return {
          valid: true,
          user: response.data
        };
      } else {
        console.warn('WordPress credentials check responded with non-200 status:', response.status);
        return {
          valid: false,
          error: `API responded with status: ${response.status}`
        };
      }
    } catch (error) {
      const errorMessage = this.parseError(error, 'credentials verification');
      if (error.response?.status === 401) {
        return {
          valid: false,
          error: 'Invalid username or password'
        };
      }
      return {
        valid: false,
        error: errorMessage,
        details: {
          originalError: error.message,
          hasResponse: !!error.response,
          status: error.response?.status
        }
      };
    }
  }

  // Validate that required CUSTOM POST TYPES exist
  async validatePostTypes() {
    console.log('Validating WordPress CUSTOM POST TYPES...');
    const customPostTypes = ['book', 'chapter', 'chaptertopic', 'topicsection'];
    const results = {};

    // Check for each CUSTOM post type ONLY
    for (const type of customPostTypes) {
      try {
        console.log(`Checking if CUSTOM POST TYPE '${type}' exists...`);
        const config = this.createAxiosConfig(`${this.url}/wp-json/wp/v2/types/${type}`);
        const response = await axios(config);

        if (response.status === 200) {
          console.log(`✅ Custom post type '${type}' found and available`);
          results[type] = {
            available: true,
            data: response.data
          };
        } else {
          console.log(`❌ Custom post type '${type}' not found (non-200 response)`);
          results[type] = {
            available: false,
            error: `API responded with status: ${response.status}`
          };
        }
      } catch (error) {
        const errorMessage = this.parseError(error, `${type} custom post type check`);
        console.log(`❌ Custom post type '${type}' not found:`, errorMessage);
        results[type] = {
          available: false,
          error: errorMessage
        };
      }
    }

    return results;
  }

  // Create book using CUSTOM POST TYPE 'book' with Secure Custom Posts
  async createBook(title, content) {
    console.log(`📚 Creating BOOK using custom post type 'book': ${title}`);
    console.log(`🔗 WordPress URL: ${this.url}`);

    try {
      // Use ONLY the custom post type endpoint for 'book'
      const endpoint = `${this.url}/wp-json/wp/v2/book`;
      console.log(`📍 Using CUSTOM POST TYPE endpoint: ${endpoint}`);

      // 🔧 NEW APPROACH: Books are root-level posts and don't need relationship fields
      // Only send the basic post data for Secure Custom Posts
      const postData = {
        title,
        content,
        status: 'publish'
      };

      console.log('📤 Sending book creation request:', JSON.stringify({
        title: postData.title,
        contentLength: content.length,
        status: postData.status,
        endpoint: endpoint,
        note: 'Using Secure Custom Posts - No relationship fields for root-level books'
      }));

      // Test connection first
      console.log('🔍 Testing connection before creating book...');
      const connectionTest = await this.validateConnection();
      if (!connectionTest.success) {
        throw new Error(`Pre-flight connection test failed: ${connectionTest.error}`);
      }

      const config = this.createAxiosConfig(endpoint, postData, 'POST');
      const response = await axios(config);

      if (response.status === 201 || response.status === 200) {
        const bookId = response.data.id;
        console.log('✅ BOOK created successfully with ID:', bookId);
        console.log('🔗 Book URL:', response.data.link);

        if (!bookId) {
          throw new Error('Book created but no valid ID returned from WordPress');
        }

        return {
          ...response.data,
          id: bookId
        };
      } else {
        console.error('❌ Unexpected response status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('❌ Error creating book:', error);
      const errorMessage = this.parseError(error, 'book creation');
      console.error('Book creation failed with details:', {
        endpoint: `${this.url}/wp-json/wp/v2/book`,
        auth: {
          username: this.auth.username,
          hasPassword: !!this.auth.password
        },
        errorType: error.constructor.name,
        errorCode: error.code,
        hasResponse: !!error.response,
        responseStatus: error.response?.status,
        responseData: error.response?.data
      });
      throw new Error(`Failed to create book: ${errorMessage}`);
    }
  }

  // Create chapter using CUSTOM POST TYPE 'chapter' with ACF relationship field
  async createChapter(title, content, parentBookId) {
    console.log(`📖 Creating CHAPTER using custom post type 'chapter': ${title} under book ID: ${parentBookId}`);

    if (!parentBookId || isNaN(parseInt(parentBookId))) {
      throw new Error(`Invalid parent book ID: ${parentBookId}`);
    }

    try {
      // Use ONLY the custom post type endpoint for 'chapter'
      const endpoint = `${this.url}/wp-json/wp/v2/chapter`;
      console.log(`📍 Using CUSTOM POST TYPE endpoint: ${endpoint}`);

      // 🔧 CORRECTED APPROACH: Use 'acf' key for ACF fields in Secure Custom Posts
      // This follows ACF's standard REST API structure post-5.11
      const postData = {
        title,
        content,
        status: 'publish',
        // ACF fields using the correct 'acf' key
        acf: {
          chapter_parent_book: parseInt(parentBookId) // ACF relationship field linking to book
        }
      };

      console.log('📤 Sending chapter creation request:', JSON.stringify({
        title: postData.title,
        contentLength: content.length,
        status: postData.status,
        parentBookId: parentBookId,
        acfFields: postData.acf,
        endpoint: endpoint,
        note: 'Using Secure Custom Posts with ACF relationship field: chapter_parent_book (using acf key)'
      }));

      const config = this.createAxiosConfig(endpoint, postData, 'POST');
      const response = await axios(config);

      if (response.status === 201 || response.status === 200) {
        const chapterId = response.data.id;
        console.log('✅ CHAPTER created successfully with ID:', chapterId);
        console.log('🔗 Chapter URL:', response.data.link);
        console.log('🔗 Chapter linked to book via ACF relationship field: chapter_parent_book');

        if (!chapterId) {
          throw new Error('Chapter created but no valid ID returned from WordPress');
        }

        return {
          ...response.data,
          id: chapterId
        };
      } else {
        console.error('❌ Unexpected response status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = this.parseError(error, 'chapter creation');
      console.error('Chapter creation error details:', {
        endpoint: `${this.url}/wp-json/wp/v2/chapter`,
        parentBookId,
        acfFieldUsed: 'chapter_parent_book',
        acfKeyStructure: 'acf',
        hasResponse: !!error.response,
        responseData: error.response?.data
      });
      throw new Error(`Failed to create chapter: ${errorMessage}`);
    }
  }

  // Create chapter topic using CUSTOM POST TYPE 'chaptertopic' with ACF relationship field
  async createChapterTopic(title, content, parentChapterId) {
    console.log(`📝 Creating CHAPTER TOPIC using custom post type 'chaptertopic': ${title} under chapter ID: ${parentChapterId}`);

    if (!parentChapterId || isNaN(parseInt(parentChapterId))) {
      throw new Error(`Invalid parent chapter ID: ${parentChapterId}`);
    }

    try {
      // Use ONLY the custom post type endpoint for 'chaptertopic'
      const endpoint = `${this.url}/wp-json/wp/v2/chaptertopic`;
      console.log(`📍 Using CUSTOM POST TYPE endpoint: ${endpoint}`);

      // 🔧 CORRECTED APPROACH: Use 'acf' key for ACF fields in Secure Custom Posts
      // This follows ACF's standard REST API structure post-5.11
      const postData = {
        title,
        content,
        status: 'publish',
        // ACF fields using the correct 'acf' key
        acf: {
          topic_parent_chapter: parseInt(parentChapterId) // ACF relationship field linking to chapter
        }
      };

      console.log('📤 Sending chapter topic creation request:', JSON.stringify({
        title: postData.title,
        contentLength: content.length,
        status: postData.status,
        parentChapterId: parentChapterId,
        acfFields: postData.acf,
        endpoint: endpoint,
        note: 'Using Secure Custom Posts with ACF relationship field: topic_parent_chapter (using acf key)'
      }));

      const config = this.createAxiosConfig(endpoint, postData, 'POST');
      const response = await axios(config);

      if (response.status === 201 || response.status === 200) {
        const topicId = response.data.id;
        console.log('✅ CHAPTER TOPIC created successfully with ID:', topicId);
        console.log('🔗 Chapter topic URL:', response.data.link);
        console.log('🔗 Topic linked to chapter via ACF relationship field: topic_parent_chapter');

        if (!topicId) {
          throw new Error('Topic created but no valid ID returned from WordPress');
        }

        return {
          ...response.data,
          id: topicId
        };
      } else {
        console.error('❌ Unexpected response status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = this.parseError(error, 'chapter topic creation');
      console.error('Chapter topic creation error details:', {
        endpoint: `${this.url}/wp-json/wp/v2/chaptertopic`,
        parentChapterId,
        acfFieldUsed: 'topic_parent_chapter',
        acfKeyStructure: 'acf',
        hasResponse: !!error.response,
        responseData: error.response?.data
      });
      throw new Error(`Failed to create chapter topic: ${errorMessage}`);
    }
  }

  // Create topic section using CUSTOM POST TYPE 'topicsection' with ACF relationship field
  async createTopicSection(title, content, parentTopicId) {
    console.log(`📄 Creating TOPIC SECTION using custom post type 'topicsection': ${title} under topic ID: ${parentTopicId}`);

    if (!parentTopicId || isNaN(parseInt(parentTopicId))) {
      throw new Error(`Invalid parent topic ID: ${parentTopicId}`);
    }

    try {
      // Use ONLY the custom post type endpoint for 'topicsection'
      const endpoint = `${this.url}/wp-json/wp/v2/topicsection`;
      console.log(`📍 Using CUSTOM POST TYPE endpoint: ${endpoint}`);

      // 🔧 CORRECTED APPROACH: Use 'acf' key for ACF fields in Secure Custom Posts
      // This follows ACF's standard REST API structure post-5.11
      const postData = {
        title,
        content,
        status: 'publish',
        // ACF fields using the correct 'acf' key
        acf: {
          section_parent_topic: parseInt(parentTopicId) // ACF relationship field linking to chaptertopic
        }
      };

      console.log('📤 Sending topic section creation request:', JSON.stringify({
        title: postData.title,
        contentLength: content.length,
        status: postData.status,
        parentTopicId: parentTopicId,
        acfFields: postData.acf,
        endpoint: endpoint,
        note: 'Using Secure Custom Posts with ACF relationship field: section_parent_topic (using acf key)'
      }));

      const config = this.createAxiosConfig(endpoint, postData, 'POST');
      const response = await axios(config);

      if (response.status === 201 || response.status === 200) {
        const sectionId = response.data.id;
        console.log('✅ TOPIC SECTION created successfully with ID:', sectionId);
        console.log('🔗 Topic section URL:', response.data.link);
        console.log('🔗 Section linked to chaptertopic via ACF relationship field: section_parent_topic');
        console.log(`🔧 Parent relationship: topicsection(${sectionId}) -> chaptertopic(${parentTopicId})`);

        if (!sectionId) {
          throw new Error('Section created but no valid ID returned from WordPress');
        }

        return {
          ...response.data,
          id: sectionId
        };
      } else {
        console.error('❌ Unexpected response status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      const errorMessage = this.parseError(error, 'topic section creation');
      console.error('Topic section creation error details:', {
        endpoint: `${this.url}/wp-json/wp/v2/topicsection`,
        parentTopicId,
        expectedParentType: 'chaptertopic',
        acfFieldUsed: 'section_parent_topic',
        acfKeyStructure: 'acf',
        hasResponse: !!error.response,
        responseData: error.response?.data
      });
      throw new Error(`Failed to create topic section: ${errorMessage}`);
    }
  }
}

export default WordPressService;