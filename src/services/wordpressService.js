import axios from 'axios';

class WordPressService {
  constructor(url, username, password) {
    this.url = url;
    this.auth = { username, password };
    
    // Log initialization
    console.log(`Initializing WordPress service for URL: ${url}`);
    
    // Remove trailing slashes from URL for consistency
    if (this.url.endsWith('/')) {
      this.url = this.url.slice(0, -1);
    }
  }

  // Validate WordPress API URL
  async validateConnection() {
    try {
      console.log('Validating WordPress connection...');
      const response = await axios.get(`${this.url}/wp-json`, {
        auth: this.auth
      });
      if (response.status === 200) {
        console.log('WordPress connection validated successfully');
        return { success: true, data: response.data };
      } else {
        console.error('WordPress API responded with non-200 status:', response.status);
        return { success: false, error: `API responded with status: ${response.status}` };
      }
    } catch (error) {
      console.error('WordPress connection validation failed:', error.message);
      const errorMessage = error.response?.data?.message || error.message;
      return { success: false, error: `Failed to connect to WordPress: ${errorMessage}`, details: error.response?.data || {} };
    }
  }

  // Validate that required post types exist (using singular names)
  async validatePostTypes() {
    console.log('Validating WordPress custom post types...');
    const postTypes = ['book', 'chapter', 'chaptertopic', 'topicsection'];
    const results = {};
    
    // Check for each post type
    for (const type of postTypes) {
      try {
        console.log(`Checking if ${type} post type exists...`);
        const response = await axios.get(`${this.url}/wp-json/wp/v2/types/${type}`, {
          auth: this.auth,
          timeout: 5000 // 5 second timeout
        });
        if (response.status === 200) {
          console.log(`${type} post type found`);
          results[type] = { available: true, data: response.data };
        } else {
          console.log(`${type} post type not found (non-200 response)`);
          results[type] = { available: false, error: `API responded with status: ${response.status}` };
        }
      } catch (error) {
        console.log(`${type} post type not found:`, error.message);
        results[type] = { available: false, error: error.message };
      }
    }
    
    // Also check if regular posts are available as fallback
    try {
      const response = await axios.get(`${this.url}/wp-json/wp/v2/posts`, {
        auth: this.auth,
        timeout: 5000
      });
      if (response.status === 200) {
        console.log('Regular posts endpoint is available');
        results.posts = { available: true, data: 'Regular posts available as fallback' };
      } else {
        console.log('Regular posts endpoint not available (non-200 response)');
        results.posts = { available: false, error: `API responded with status: ${response.status}` };
      }
    } catch (error) {
      console.log('Regular posts endpoint not available:', error.message);
      results.posts = { available: false, error: error.message };
    }
    
    return results;
  }

  // Create book in WordPress (using singular endpoint)
  async createBook(title, content) {
    console.log(`Creating book in WordPress: ${title}`);
    console.log(`WordPress URL: ${this.url}`);
    try {
      // First check if custom post type exists, if not use regular posts
      let endpoint = `${this.url}/wp-json/wp/v2/book`;
      let customTypeExists = false;
      
      try {
        // Test if the book endpoint exists
        console.log('Checking if book custom post type exists...');
        const typesResponse = await axios.get(`${this.url}/wp-json/wp/v2/types/book`, {
          auth: this.auth
        });
        if (typesResponse.status === 200) {
          console.log('Book custom post type found');
          customTypeExists = true;
        }
      } catch (error) {
        // If book endpoint doesn't exist, fallback to regular posts
        console.log('Book custom post type not found, using regular posts instead');
        endpoint = `${this.url}/wp-json/wp/v2/posts`;
      }
      
      console.log(`Using endpoint: ${endpoint}`);
      
      // Prepare the data for WordPress
      const postData = {
        title,
        content,
        status: 'publish',
        meta: {
          book_type: 'ebook', // Add custom meta to identify as a book even when using regular posts
        }
      };
      
      console.log('Sending book creation request with data:', JSON.stringify({
        title: postData.title,
        contentExcerpt: content.substring(0, 100) + '...',
        status: postData.status
      }));
      
      const response = await axios({
        method: 'post',
        url: endpoint,
        auth: this.auth,
        headers: { 'Content-Type': 'application/json' },
        data: postData
      });
      
      if (response.status === 201 || response.status === 200) {
        console.log('Book created successfully:', response.data.id);
        console.log('Book URL:', response.data.link);
        return response.data;
      } else {
        console.error('Unexpected response status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating book:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
      } else if (error.request) {
        console.error('No response received from server');
        console.error('Request details:', error.request);
      } else {
        console.error('Error during request setup:', error.message);
      }
      
      // Try fallback to regular posts if not already tried
      if (error.response?.status === 404 && !error.config?.url.includes('/posts')) {
        console.log('Attempting fallback to regular posts endpoint');
        try {
          const fallbackUrl = `${this.url}/wp-json/wp/v2/posts`;
          console.log(`Using fallback URL: ${fallbackUrl}`);
          const fallbackResponse = await axios({
            method: 'post',
            url: fallbackUrl,
            auth: this.auth,
            headers: { 'Content-Type': 'application/json' },
            data: {
              title,
              content,
              status: 'publish',
              meta: {
                book_type: 'ebook',
              }
            }
          });
          
          if (fallbackResponse.status === 201 || fallbackResponse.status === 200) {
            console.log('Book created using fallback method:', fallbackResponse.data.id);
            console.log('Book URL:', fallbackResponse.data.link);
            return fallbackResponse.data;
          } else {
            console.error('Unexpected fallback response status:', fallbackResponse.status);
            throw new Error(`Unexpected fallback response status: ${fallbackResponse.status}`);
          }
        } catch (fallbackError) {
          console.error('Fallback attempt failed:', fallbackError);
          if (fallbackError.response) {
            console.error('Fallback response data:', fallbackError.response.data);
            console.error('Fallback response status:', fallbackError.response.status);
          }
          throw new Error(`Failed to create book using fallback method: ${fallbackError.message}`);
        }
      }
      
      throw new Error(`Failed to create book: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create chapter in WordPress (using singular endpoint)
  async createChapter(title, content) {
    console.log(`Creating chapter: ${title}`);
    try {
      // Try custom post type first
      let endpoint = `${this.url}/wp-json/wp/v2/chapter`;
      let customTypeExists = false;
      
      try {
        console.log('Checking if chapter custom post type exists...');
        const typesResponse = await axios.get(`${this.url}/wp-json/wp/v2/types/chapter`, {
          auth: this.auth
        });
        if (typesResponse.status === 200) {
          console.log('Chapter custom post type found');
          customTypeExists = true;
        }
      } catch (error) {
        // If chapter endpoint doesn't exist, fallback to regular posts
        console.log('Chapter custom post type not found, using regular posts instead');
        endpoint = `${this.url}/wp-json/wp/v2/posts`;
      }
      
      console.log(`Using endpoint: ${endpoint}`);
      
      // Prepare the data for WordPress
      const postData = {
        title,
        content,
        status: 'publish',
        meta: {
          content_type: 'chapter'
        }
      };
      
      const response = await axios({
        method: 'post',
        url: endpoint,
        auth: this.auth,
        headers: { 'Content-Type': 'application/json' },
        data: postData
      });
      
      if (response.status === 201 || response.status === 200) {
        console.log('Chapter created successfully:', response.data.id);
        console.log('Chapter URL:', response.data.link);
        return response.data;
      } else {
        console.error('Unexpected response status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating chapter:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      
      // Try fallback to regular posts if not already tried
      if (error.response?.status === 404 && !error.config?.url.includes('/posts')) {
        console.log('Attempting fallback to regular posts endpoint for chapter');
        try {
          const fallbackUrl = `${this.url}/wp-json/wp/v2/posts`;
          console.log(`Using fallback URL: ${fallbackUrl}`);
          const fallbackResponse = await axios({
            method: 'post',
            url: fallbackUrl,
            auth: this.auth,
            headers: { 'Content-Type': 'application/json' },
            data: {
              title,
              content,
              status: 'publish',
              meta: {
                content_type: 'chapter'
              }
            }
          });
          
          if (fallbackResponse.status === 201 || fallbackResponse.status === 200) {
            console.log('Chapter created using fallback method:', fallbackResponse.data.id);
            console.log('Chapter URL:', fallbackResponse.data.link);
            return fallbackResponse.data;
          } else {
            console.error('Unexpected fallback response status:', fallbackResponse.status);
            throw new Error(`Unexpected fallback response status: ${fallbackResponse.status}`);
          }
        } catch (fallbackError) {
          console.error('Fallback attempt failed for chapter:', fallbackError);
          if (fallbackError.response) {
            console.error('Fallback response data:', fallbackError.response.data);
            console.error('Fallback response status:', fallbackError.response.status);
          }
          throw new Error(`Failed to create chapter using fallback method: ${fallbackError.message}`);
        }
      }
      
      throw new Error(`Failed to create chapter: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create chapter topic in WordPress (using singular endpoint)
  async createChapterTopic(title, content) {
    console.log(`Creating chapter topic: ${title}`);
    try {
      // Try custom post type first
      let endpoint = `${this.url}/wp-json/wp/v2/chaptertopic`;
      let customTypeExists = false;
      
      try {
        console.log('Checking if chaptertopic custom post type exists...');
        const typesResponse = await axios.get(`${this.url}/wp-json/wp/v2/types/chaptertopic`, {
          auth: this.auth
        });
        if (typesResponse.status === 200) {
          console.log('ChapterTopic custom post type found');
          customTypeExists = true;
        }
      } catch (error) {
        // If chaptertopic endpoint doesn't exist, fallback to regular posts
        console.log('ChapterTopic custom post type not found, using regular posts instead');
        endpoint = `${this.url}/wp-json/wp/v2/posts`;
      }
      
      console.log(`Using endpoint: ${endpoint}`);
      
      // Prepare the data for WordPress
      const postData = {
        title,
        content,
        status: 'publish',
        meta: {
          content_type: 'topic'
        }
      };
      
      const response = await axios({
        method: 'post',
        url: endpoint,
        auth: this.auth,
        headers: { 'Content-Type': 'application/json' },
        data: postData
      });
      
      if (response.status === 201 || response.status === 200) {
        console.log('Chapter topic created successfully:', response.data.id);
        console.log('Chapter topic URL:', response.data.link);
        return response.data;
      } else {
        console.error('Unexpected response status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating chapter topic:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      
      // Try fallback to regular posts if not already tried
      if (error.response?.status === 404 && !error.config?.url.includes('/posts')) {
        console.log('Attempting fallback to regular posts endpoint for topic');
        try {
          const fallbackUrl = `${this.url}/wp-json/wp/v2/posts`;
          console.log(`Using fallback URL: ${fallbackUrl}`);
          const fallbackResponse = await axios({
            method: 'post',
            url: fallbackUrl,
            auth: this.auth,
            headers: { 'Content-Type': 'application/json' },
            data: {
              title,
              content,
              status: 'publish',
              meta: {
                content_type: 'topic'
              }
            }
          });
          
          if (fallbackResponse.status === 201 || fallbackResponse.status === 200) {
            console.log('Topic created using fallback method:', fallbackResponse.data.id);
            console.log('Topic URL:', fallbackResponse.data.link);
            return fallbackResponse.data;
          } else {
            console.error('Unexpected fallback response status:', fallbackResponse.status);
            throw new Error(`Unexpected fallback response status: ${fallbackResponse.status}`);
          }
        } catch (fallbackError) {
          console.error('Fallback attempt failed for topic:', fallbackError);
          if (fallbackError.response) {
            console.error('Fallback response data:', fallbackError.response.data);
            console.error('Fallback response status:', fallbackError.response.status);
          }
          throw new Error(`Failed to create topic using fallback method: ${fallbackError.message}`);
        }
      }
      
      throw new Error(`Failed to create chapter topic: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create topic section in WordPress (using singular endpoint)
  async createTopicSection(title, content) {
    console.log(`Creating topic section: ${title}`);
    try {
      // Try custom post type first
      let endpoint = `${this.url}/wp-json/wp/v2/topicsection`;
      let customTypeExists = false;
      
      try {
        console.log('Checking if topicsection custom post type exists...');
        const typesResponse = await axios.get(`${this.url}/wp-json/wp/v2/types/topicsection`, {
          auth: this.auth
        });
        if (typesResponse.status === 200) {
          console.log('TopicSection custom post type found');
          customTypeExists = true;
        }
      } catch (error) {
        // If topicsection endpoint doesn't exist, fallback to regular posts
        console.log('TopicSection custom post type not found, using regular posts instead');
        endpoint = `${this.url}/wp-json/wp/v2/posts`;
      }
      
      console.log(`Using endpoint: ${endpoint}`);
      
      // Prepare the data for WordPress
      const postData = {
        title,
        content,
        status: 'publish',
        meta: {
          content_type: 'section'
        }
      };
      
      const response = await axios({
        method: 'post',
        url: endpoint,
        auth: this.auth,
        headers: { 'Content-Type': 'application/json' },
        data: postData
      });
      
      if (response.status === 201 || response.status === 200) {
        console.log('Topic section created successfully:', response.data.id);
        console.log('Topic section URL:', response.data.link);
        return response.data;
      } else {
        console.error('Unexpected response status:', response.status);
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error creating topic section:', error);
      
      // More detailed error logging
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      
      // Try fallback to regular posts if not already tried
      if (error.response?.status === 404 && !error.config?.url.includes('/posts')) {
        console.log('Attempting fallback to regular posts endpoint for section');
        try {
          const fallbackUrl = `${this.url}/wp-json/wp/v2/posts`;
          console.log(`Using fallback URL: ${fallbackUrl}`);
          const fallbackResponse = await axios({
            method: 'post',
            url: fallbackUrl,
            auth: this.auth,
            headers: { 'Content-Type': 'application/json' },
            data: {
              title,
              content,
              status: 'publish',
              meta: {
                content_type: 'section'
              }
            }
          });
          
          if (fallbackResponse.status === 201 || fallbackResponse.status === 200) {
            console.log('Section created using fallback method:', fallbackResponse.data.id);
            console.log('Section URL:', fallbackResponse.data.link);
            return fallbackResponse.data;
          } else {
            console.error('Unexpected fallback response status:', fallbackResponse.status);
            throw new Error(`Unexpected fallback response status: ${fallbackResponse.status}`);
          }
        } catch (fallbackError) {
          console.error('Fallback attempt failed for section:', fallbackError);
          if (fallbackError.response) {
            console.error('Fallback response data:', fallbackError.response.data);
            console.error('Fallback response status:', fallbackError.response.status);
          }
          throw new Error(`Failed to create section using fallback method: ${fallbackError.message}`);
        }
      }
      
      throw new Error(`Failed to create topic section: ${error.response?.data?.message || error.message}`);
    }
  }

  // Link book to chapter (L1) - Using configurable webhook settings
  async linkBookToChapter(bookId, chapterId, webhookConfig) {
    try {
      console.log(`🔗 Starting linkBookToChapter: book ${bookId} to chapter ${chapterId}`);
      if (!bookId || !chapterId) {
        console.error('❌ Missing ID for linking: bookId:', bookId, 'chapterId:', chapterId);
        return { success: false, error: 'Missing book or chapter ID' };
      }
      
      // First try to use the WordPress REST API to update post relationships if supported
      try {
        console.log('🔄 Attempting to update chapter metadata via WordPress API...');
        // Attempt to update the chapter's metadata to link it to the book
        const updateResponse = await axios({
          method: 'post',
          url: `${this.url}/wp-json/wp/v2/posts/${chapterId}`,
          auth: this.auth,
          headers: { 'Content-Type': 'application/json' },
          data: {
            meta: {
              parent_book_id: bookId
            }
          }
        });
        
        if (updateResponse.status === 200) {
          console.log(`✅ Successfully linked book ${bookId} to chapter ${chapterId} via WordPress API`);
          return { success: true, message: 'Linked via WordPress API', data: updateResponse.data };
        } else {
          console.log('⚠️ WordPress API returned non-200 status:', updateResponse.status);
          throw new Error(`API returned status: ${updateResponse.status}`);
        }
      } catch (wpError) {
        console.log('⚠️ WordPress API relationship update failed, falling back to webhook:', wpError.message);
        if (wpError.response) {
          console.error('WordPress API error response:', wpError.response.data);
          console.error('WordPress API error status:', wpError.response.status);
        }
      }
      
      // Fallback to the webhook method using Netlify function proxy
      console.log('🎣 Using Netlify function proxy to link book to chapter');
      
      const webhookData = {
        parent_id: parseInt(bookId), // Ensure it's a number
        child_id: parseInt(chapterId) // Ensure it's a number
      };
      
      console.log('📤 Sending webhook request with data:', webhookData);
      
      try {
        // Use the Netlify function proxy instead of directly calling the webhook
        const response = await axios({
          method: 'post',
          url: '/.netlify/functions/flowmattic-proxy?webhook=bookToChapter',
          headers: { 'Content-Type': 'application/json' },
          data: webhookData,
          timeout: 10000 // 10 second timeout
        });
        
        console.log(`✅ Successfully linked book ${bookId} to chapter ${chapterId} via Netlify proxy`);
        console.log('📋 Proxy response status:', response.status);
        console.log('📋 Proxy response data:', response.data);
        
        return {
          success: true,
          message: 'Linked via Netlify proxy webhook',
          data: response.data,
          webhookStatus: response.status
        };
      } catch (webhookError) {
        console.error('❌ Netlify proxy webhook linking failed:', webhookError.message);
        if (webhookError.response) {
          console.error('Webhook error response:', webhookError.response.data);
          console.error('Webhook error status:', webhookError.response.status);
        }
        
        // Don't throw error, just return failure status
        return {
          success: false,
          error: `Webhook linking failed: ${webhookError.message}`,
          webhookError: webhookError.response?.data || webhookError.message
        };
      }
    } catch (error) {
      console.error('❌ Error in linkBookToChapter:', error);
      // Don't fail the whole process if linking fails, just log it
      console.log(`⚠️ Warning: Failed to link book ${bookId} to chapter ${chapterId}, but continuing`);
      return { success: false, error: error.message };
    }
  }

  // Link chapter to chapter topic (L2) - Using configurable webhook settings
  async linkChapterToTopic(chapterId, topicId, webhookConfig) {
    try {
      console.log(`🔗 Starting linkChapterToTopic: chapter ${chapterId} to topic ${topicId}`);
      if (!chapterId || !topicId) {
        console.error('❌ Missing ID for linking: chapterId:', chapterId, 'topicId:', topicId);
        return { success: false, error: 'Missing chapter or topic ID' };
      }
      
      // First try to use the WordPress REST API to update post relationships if supported
      try {
        console.log('🔄 Attempting to update topic metadata via WordPress API...');
        // Attempt to update the topic's metadata to link it to the chapter
        const updateResponse = await axios({
          method: 'post',
          url: `${this.url}/wp-json/wp/v2/posts/${topicId}`,
          auth: this.auth,
          headers: { 'Content-Type': 'application/json' },
          data: {
            meta: {
              parent_chapter_id: chapterId
            }
          }
        });
        
        if (updateResponse.status === 200) {
          console.log(`✅ Successfully linked chapter ${chapterId} to topic ${topicId} via WordPress API`);
          return { success: true, message: 'Linked via WordPress API', data: updateResponse.data };
        } else {
          console.log('⚠️ WordPress API returned non-200 status:', updateResponse.status);
          throw new Error(`API returned status: ${updateResponse.status}`);
        }
      } catch (wpError) {
        console.log('⚠️ WordPress API relationship update failed, falling back to webhook:', wpError.message);
        if (wpError.response) {
          console.error('WordPress API error response:', wpError.response.data);
          console.error('WordPress API error status:', wpError.response.status);
        }
      }
      
      // Fallback to the webhook method using Netlify function proxy
      console.log('🎣 Using Netlify function proxy to link chapter to topic');
      
      const webhookData = {
        parent_id: parseInt(chapterId), // Ensure it's a number
        child_id: parseInt(topicId) // Ensure it's a number
      };
      
      console.log('📤 Sending webhook request with data:', webhookData);
      
      try {
        // Use the Netlify function proxy instead of directly calling the webhook
        const response = await axios({
          method: 'post',
          url: '/.netlify/functions/flowmattic-proxy?webhook=chapterToTopic',
          headers: { 'Content-Type': 'application/json' },
          data: webhookData,
          timeout: 10000 // 10 second timeout
        });
        
        console.log(`✅ Successfully linked chapter ${chapterId} to topic ${topicId} via Netlify proxy`);
        console.log('📋 Proxy response status:', response.status);
        console.log('📋 Proxy response data:', response.data);
        
        return {
          success: true,
          message: 'Linked via Netlify proxy webhook',
          data: response.data,
          webhookStatus: response.status
        };
      } catch (webhookError) {
        console.error('❌ Netlify proxy webhook linking failed:', webhookError.message);
        if (webhookError.response) {
          console.error('Webhook error response:', webhookError.response.data);
          console.error('Webhook error status:', webhookError.response.status);
        }
        
        // Don't throw error, just return failure status
        return {
          success: false,
          error: `Webhook linking failed: ${webhookError.message}`,
          webhookError: webhookError.response?.data || webhookError.message
        };
      }
    } catch (error) {
      console.error('❌ Error in linkChapterToTopic:', error);
      // Don't fail the whole process if linking fails, just log it
      console.log(`⚠️ Warning: Failed to link chapter ${chapterId} to topic ${topicId}, but continuing`);
      return { success: false, error: error.message };
    }
  }

  // Link chapter topic to topic section (L3) - Using configurable webhook settings
  async linkTopicToSection(topicId, sectionId, webhookConfig) {
    try {
      console.log(`🔗 Starting linkTopicToSection: topic ${topicId} to section ${sectionId}`);
      if (!topicId || !sectionId) {
        console.error('❌ Missing ID for linking: topicId:', topicId, 'sectionId:', sectionId);
        return { success: false, error: 'Missing topic or section ID' };
      }
      
      // First try to use the WordPress REST API to update post relationships if supported
      try {
        console.log('🔄 Attempting to update section metadata via WordPress API...');
        // Attempt to update the section's metadata to link it to the topic
        const updateResponse = await axios({
          method: 'post',
          url: `${this.url}/wp-json/wp/v2/posts/${sectionId}`,
          auth: this.auth,
          headers: { 'Content-Type': 'application/json' },
          data: {
            meta: {
              parent_topic_id: topicId
            }
          }
        });
        
        if (updateResponse.status === 200) {
          console.log(`✅ Successfully linked topic ${topicId} to section ${sectionId} via WordPress API`);
          return { success: true, message: 'Linked via WordPress API', data: updateResponse.data };
        } else {
          console.log('⚠️ WordPress API returned non-200 status:', updateResponse.status);
          throw new Error(`API returned status: ${updateResponse.status}`);
        }
      } catch (wpError) {
        console.log('⚠️ WordPress API relationship update failed, falling back to webhook:', wpError.message);
        if (wpError.response) {
          console.error('WordPress API error response:', wpError.response.data);
          console.error('WordPress API error status:', wpError.response.status);
        }
      }
      
      // Fallback to the webhook method using Netlify function proxy
      console.log('🎣 Using Netlify function proxy to link topic to section');
      
      const webhookData = {
        parent_id: parseInt(topicId), // Ensure it's a number
        child_id: parseInt(sectionId) // Ensure it's a number
      };
      
      console.log('📤 Sending webhook request with data:', webhookData);
      
      try {
        // Use the Netlify function proxy instead of directly calling the webhook
        const response = await axios({
          method: 'post',
          url: '/.netlify/functions/flowmattic-proxy?webhook=topicToSection',
          headers: { 'Content-Type': 'application/json' },
          data: webhookData,
          timeout: 10000 // 10 second timeout
        });
        
        console.log(`✅ Successfully linked topic ${topicId} to section ${sectionId} via Netlify proxy`);
        console.log('📋 Proxy response status:', response.status);
        console.log('📋 Proxy response data:', response.data);
        
        return {
          success: true,
          message: 'Linked via Netlify proxy webhook',
          data: response.data,
          webhookStatus: response.status
        };
      } catch (webhookError) {
        console.error('❌ Netlify proxy webhook linking failed:', webhookError.message);
        if (webhookError.response) {
          console.error('Webhook error response:', webhookError.response.data);
          console.error('Webhook error status:', webhookError.response.status);
        }
        
        // Don't throw error, just return failure status
        return {
          success: false,
          error: `Webhook linking failed: ${webhookError.message}`,
          webhookError: webhookError.response?.data || webhookError.message
        };
      }
    } catch (error) {
      console.error('❌ Error in linkTopicToSection:', error);
      // Don't fail the whole process if linking fails, just log it
      console.log(`⚠️ Warning: Failed to link topic ${topicId} to section ${sectionId}, but continuing`);
      return { success: false, error: error.message };
    }
  }

  // Check if WordPress REST API is available
  async checkRestApiAvailability() {
    try {
      console.log('Checking WordPress REST API availability...');
      const response = await axios.get(`${this.url}/wp-json`, {
        timeout: 5000 // 5 second timeout
      });
      if (response.status === 200) {
        console.log('WordPress REST API is available');
        return { available: true, data: response.data };
      } else {
        console.warn('WordPress REST API responded with non-200 status:', response.status);
        return { available: false, error: `API responded with status: ${response.status}` };
      }
    } catch (error) {
      console.error('WordPress REST API check failed:', error.message);
      return { available: false, error: `REST API not available: ${error.message}`, details: error.response?.data || {} };
    }
  }

  // Verify user credentials
  async verifyCredentials() {
    try {
      console.log('Verifying WordPress user credentials...');
      const response = await axios.get(`${this.url}/wp-json/wp/v2/users/me`, {
        auth: this.auth,
        timeout: 5000 // 5 second timeout
      });
      if (response.status === 200) {
        console.log('WordPress credentials verified successfully');
        return { valid: true, user: response.data };
      } else {
        console.warn('WordPress credentials check responded with non-200 status:', response.status);
        return { valid: false, error: `API responded with status: ${response.status}` };
      }
    } catch (error) {
      console.error('WordPress credentials verification failed:', error.message);
      if (error.response?.status === 401) {
        return { valid: false, error: 'Invalid username or password' };
      }
      return { valid: false, error: `Credentials verification failed: ${error.message}`, details: error.response?.data || {} };
    }
  }
}

export default WordPressService;