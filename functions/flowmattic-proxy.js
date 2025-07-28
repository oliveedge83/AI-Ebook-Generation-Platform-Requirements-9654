const axios = require('axios');

exports.handler = async function(event, context) {
  // Enable CORS for all origins
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };
  
  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  try {
    // Parse the incoming webhook data
    const body = JSON.parse(event.body);
    
    // Get the webhook target from the query parameters or use a default
    const targetWebhook = event.queryStringParameters?.webhook || 'default';
    
    // Log the incoming request for debugging
    console.log(`Proxy request to webhook: ${targetWebhook}`);
    console.log('Request payload:', JSON.stringify(body));
    
    // Extract authorization from the request if present
    let authHeader = event.headers.authorization || event.headers.Authorization;
    
    // Default headers for the outgoing request
    const requestHeaders = {
      'Content-Type': 'application/json'
    };
    
    // Add authorization if it was provided
    if (authHeader) {
      requestHeaders['Authorization'] = authHeader;
    }

    // Get the target URL based on the webhook parameter
    let webhookUrl;
    switch(targetWebhook) {
      case 'bookToChapter':
        webhookUrl = 'https://test1.ilearn.guru/webhook/capture/uVCwiJWxOE';
        break;
      case 'chapterToTopic':
        webhookUrl = 'https://test1.ilearn.guru/webhook/capture/k64OfUZ0VI';
        break;
      case 'topicToSection':
        webhookUrl = 'https://test1.ilearn.guru/webhook/capture/EM5Or1GwKY';
        break;
      default:
        // Use the URL directly from the request if provided
        webhookUrl = body.webhookUrl;
    }

    if (!webhookUrl) {
      throw new Error('No webhook URL specified');
    }

    // Forward the request to the actual webhook endpoint
    const response = await axios.post(
      webhookUrl,
      body,
      {
        headers: requestHeaders,
        timeout: 10000
      }
    );

    // Return the response from the webhook
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        status: response.status,
        data: response.data
      })
    };
  } catch (error) {
    console.error('Webhook proxy error:', error.message);

    // Return appropriate error response
    return {
      statusCode: error.response?.status || 500,
      headers,
      body: JSON.stringify({
        error: error.response?.data || error.message,
        errorMessage: error.message
      })
    };
  }
};