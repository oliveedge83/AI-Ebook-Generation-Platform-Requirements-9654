class PerplexityService {
constructor(apiKey) {
this.apiKey=apiKey;
this.baseURL='https://api.perplexity.ai';
}

async makeRequest(endpoint,data,signal=null) {
console.log(`Making Perplexity request to ${endpoint} with model: ${data.model}`);
try {
const response=await fetch(`${this.baseURL}${endpoint}`,{
method: 'POST',
headers: {
'Content-Type': 'application/json',
'Authorization': `Bearer ${this.apiKey}`
},
body: JSON.stringify(data),
signal: signal
});

if (!response.ok) {
const errorText=await response.text();
let errorData;
try {
errorData=JSON.parse(errorText);
} catch {
errorData={error: {message: errorText}};
}
console.error('Perplexity API error:',errorData);
throw new Error(errorData.error?.message || `Perplexity API error: ${response.status} - ${errorText}`);
}

const result=await response.json();
console.log(`Perplexity request successful with model: ${data.model}`);
return result;
} catch (error) {
if (error.name==='AbortError') {
console.log('Perplexity request was aborted');
throw new Error('Request was aborted by user');
}
console.error(`Perplexity API request failed: ${error.message}`);
throw error;
}
}

async generateDeepResearch(ebookTopic,mustHaveAspects,otherDesignConsiderations,signal=null) {
console.log(`Generating research for topic: ${ebookTopic} using standard Sonar model`);

const prompt=`Conduct comprehensive market research for an ebook on: "${ebookTopic}"

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
const requestData={
model: "sonar",
messages: [
{role: "system",content: "You are an expert market researcher and content strategist. Provide comprehensive,actionable research insights for ebook creation based on current web data and trends."},
{role: "user",content: prompt}
],
max_tokens: 2000,
temperature: 0.7,
search_recency_filter: "month"
};

console.log('Sending Perplexity research request with standard Sonar model...');
const response=await this.makeRequest('/chat/completions',requestData,signal);

if (!response.choices || !response.choices[0] || !response.choices[0].message) {
throw new Error('Invalid response structure from Perplexity API');
}

const researchContent=response.choices[0].message.content;
if (!researchContent || researchContent.trim().length===0) {
throw new Error('Empty response from Perplexity API');
}

// Format the research brief for consistency with the rest of the system
const formattedBrief=`
ebookTitle: "${ebookTopic} - Complete Professional Guide"

Market Research Brief:
${researchContent}

Research Method: Perplexity Sonar with real-time web data
Generated: ${new Date().toISOString()}
`.trim();

console.log('Research completed successfully with Perplexity Sonar');
console.log('Research brief length:',formattedBrief.length,'characters');
return formattedBrief;
} catch (error) {
console.error('Perplexity research failed:',error);
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

async generateSectionContext(ebookTitle,sectionTitle,signal=null) {
console.log(`Generating section context for: ${sectionTitle} using standard Sonar model`);

const prompt=`Provide current web research context for the section "${sectionTitle}" in the ebook "${ebookTitle}".

Include:
- 3-5 key current trends and insights
- 2-4 actionable takeaways
- Recent statistics or examples (last 1-3 months if available)
- Relevant industry developments

Keep the response focused and practical for content creation.`;

const requestData={
model: "sonar",
messages: [
{role: "system",content: "You are a research assistant providing current web context for content creation. Focus on recent,actionable insights from web sources."},
{role: "user",content: prompt}
],
max_tokens: 800,
temperature: 0.5,
search_recency_filter: "month"
};

try {
console.log('Generating section context with Perplexity Sonar...');
const response=await this.makeRequest('/chat/completions',requestData,signal);

if (!response.choices || !response.choices[0] || !response.choices[0].message) {
console.warn('Invalid response structure for section context');
return null;
}

const contextContent=response.choices[0].message.content;
if (!contextContent || contextContent.trim().length===0) {
console.warn('Empty section context response');
return null;
}

const formattedContext=`
Web Research Context for "${sectionTitle}":
${contextContent}

Note: This context is based on recent web research and should be used to enhance the content with current trends and data.
Generated: ${new Date().toISOString()}
`.trim();

console.log('Section context generated successfully with Perplexity Sonar');
return formattedContext;
} catch (error) {
console.error('Perplexity section context generation failed:',error);
console.log('Continuing without web search context...');
return null;// Return null to continue gracefully without context
}
}

// ✅ NEW: Generate web references for chapter topics
async generateTopicReferences(ebookTitle,topicTitle,signal=null) {
console.log(`🔍 Generating web references for topic: ${topicTitle} using Sonar model`);

const prompt=`Find current web sources and references for the topic "${topicTitle}" in the context of "${ebookTitle}".

Please provide:
- 2-3 most relevant and recent web sources
- Brief description (first 20 words) for each source
- Focus on authoritative,recent content (last 3-6 months preferred)
- Include practical resources,case studies,or expert insights

Format for easy integration into content.`;

const requestData={
model: "sonar",
messages: [
{role: "system",content: "You are a research assistant finding relevant web sources for educational content. Focus on authoritative,recent sources with practical value."},
{role: "user",content: prompt}
],
max_tokens: 600,
temperature: 0.3,
search_recency_filter: "month"
};

try {
console.log('🔍 Searching for topic references with Perplexity Sonar...');
const response=await this.makeRequest('/chat/completions',requestData,signal);

if (!response.choices || !response.choices[0] || !response.choices[0].message) {
console.warn('Invalid response structure for topic references');
return null;
}

const referencesContent=response.choices[0].message.content;
if (!referencesContent || referencesContent.trim().length===0) {
console.warn('Empty topic references response');
return null;
}

// ✅ NEW: Extract search results if available
let webReferences=null;
if (response.search_results && response.search_results.length > 0) {
console.log(`📊 Found ${response.search_results.length} search results from Sonar`);

// Take top 2-3 results
const topResults=response.search_results.slice(0,3);
webReferences=topResults.map(result=> ({
title: result.title,
url: result.url,
date: result.date,
snippet: result.title ? result.title.split(' ').slice(0,20).join(' ') + '...' : 'Relevant resource for this topic...'
}));

console.log('📋 Processed web references:',webReferences);
}

const formattedReferences={
content: referencesContent,
webSources: webReferences,
topicTitle,
generatedAt: new Date().toISOString()
};

console.log('✅ Topic references generated successfully with Perplexity Sonar');
return formattedReferences;
} catch (error) {
console.error('❌ Perplexity topic references generation failed:',error);
console.log('Continuing without web references...');
return null;// Return null to continue gracefully without references
}
}

// ✅ NEW: Format web references for content integration
formatWebReferencesForContent(webReferences) {
if (!webReferences || !webReferences.webSources || webReferences.webSources.length===0) {
return '';
}

const referencesHtml=`
<div class="web-references" style="margin-top: 2rem; padding: 1rem; background-color: #f8f9fa; border-left: 4px solid #007bff; border-radius: 4px;">
<h4 style="margin-bottom: 0.75rem; color: #495057; font-size: 0.9rem; font-weight: 600;">📚 Additional Web Resources:</h4>
<ul style="margin: 0; padding-left: 1.25rem; font-size: 0.85rem; line-height: 1.5;">
${webReferences.webSources.map(source=> `
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