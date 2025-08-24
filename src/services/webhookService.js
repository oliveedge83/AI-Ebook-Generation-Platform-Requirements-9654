class WebhookService {
  constructor() {
    // Use your Netlify function as the proxy
    this.proxyUrl = 'https://stalwart-strudel-558d81.netlify.app/.netlify/functions/flowmattic-proxy';
  }

  async callWebhook(webhookType, parentId, childId) {
    console.log(`🔗 Calling webhook: ${webhookType} with parent: ${parentId}, child: ${childId}`);
    
    try {
      const payload = {
        parent_id: parseInt(parentId),
        child_id: parseInt(childId),
        timestamp: new Date().toISOString(),
        webhook_type: webhookType
      };

      console.log(`📤 Sending webhook payload:`, payload);

      const response = await fetch(`${this.proxyUrl}?webhook=${webhookType}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      console.log(`📥 Webhook response status: ${response.status}`);

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Webhook ${webhookType} successful:`, result);
        return { success: true, data: result };
      } else {
        const errorData = await response.text();
        console.error(`❌ Webhook ${webhookType} failed:`, response.status, errorData);
        return { 
          success: false, 
          error: `Webhook failed with status: ${response.status}`,
          details: errorData 
        };
      }
    } catch (error) {
      console.error(`❌ Webhook ${webhookType} error:`, error);
      return { 
        success: false, 
        error: error.message,
        details: error.stack 
      };
    }
  }

  // Link book to chapter
  async linkBookToChapter(bookId, chapterId) {
    return this.callWebhook('bookToChapter', bookId, chapterId);
  }

  // Link chapter to topic
  async linkChapterToTopic(chapterId, topicId) {
    return this.callWebhook('chapterToTopic', chapterId, topicId);
  }

  // Link topic to section
  async linkTopicToSection(topicId, sectionId) {
    return this.callWebhook('topicToSection', topicId, sectionId);
  }
}

export default WebhookService;