# EbookGen AI Platform - Complete Business Requirements Document

## 1. Executive Summary

EbookGen is an AI-powered ebook generation platform that leverages multiple AI services (OpenAI GPT and Perplexity Sonar) to create comprehensive, research-driven ebooks. The platform provides a complete workflow from initial research through content generation to WordPress publishing with hierarchical content structure and advanced RAG (Retrieval-Augmented Generation) capabilities.

## 2. System Architecture Overview

### 2.1 Core Components
- **Frontend**: React-based web application with real-time progress tracking
- **AI Services Integration**: OpenAI GPT-4.1 and Perplexity Sonar API integration
- **WordPress Integration**: Custom post type publishing with ACF relationship fields
- **Knowledge Management**: Vector store RAG (Retrieval-Augmented Generation) system with file upload
- **Webhook System**: Automated content linking via FlowMattic webhooks
- **PDF Generation**: Complete book content retrieval and export functionality

### 2.2 Supported AI Models
- **OpenAI Models**: gpt-4.1-mini-2025-04-14 (default), gpt-4.1-2025-04-14, gpt-4o, gpt-4o-mini, gpt-3.5-turbo (fallback)
- **Perplexity Models**: sonar (standard), sonar-pro (advanced)

## 3. Configuration Management

### 3.1 API Key Configuration
The platform requires multiple API keys for different services:

#### 3.1.1 OpenAI Configuration
- **Primary API Key**: Required for all content generation and RAG operations
- **Fallback API Key**: Optional backup for rate limit scenarios
- **Usage**: Market research (fixed parameters), content generation (configurable parameters), RAG operations with vector stores

#### 3.1.2 Perplexity Configuration
- **Primary API Key**: Required for web research and real-time data
- **Fallback API Key**: Optional backup for rate limit scenarios
- **Usage**: Market research (fixed parameters), web context generation (configurable parameters), web references

#### 3.1.3 WordPress Integration
- **Site URL**: Target WordPress installation URL
- **Username**: WordPress user with sufficient permissions
- **Application Password**: WordPress application-specific password
- **Required Permissions**: Create/edit custom post types (book, chapter, chaptertopic, topicsection)

#### 3.1.4 Webhook Configuration
Three webhook endpoints for hierarchical content linking:
- **Book-to-Chapter**: Links books to their chapters
- **Chapter-to-Topic**: Links chapters to their topics  
- **Topic-to-Section**: Links topics to their sections

Each webhook requires:
- **URL**: FlowMattic webhook endpoint
- **Username**: Authentication username
- **Password**: Authentication password

### 3.2 Advanced Options Configuration

#### 3.2.1 Perplexity Sonar Options
```json
{
  "model": "sonar|sonar-pro",
  "search_mode": "web|academic",
  "search_context_size": "low|medium|high",
  "search_recency_filter": "day|week|month|year|daterange",
  "search_domain_filter": "comma-separated domains",
  "country": "country code",
  "region": "region name", 
  "city": "city name",
  "search_after_date_filter": "YYYY-MM-DD",
  "search_before_date_filter": "YYYY-MM-DD",
  "last_updated_after_filter": "YYYY-MM-DD",
  "last_updated_before_filter": "YYYY-MM-DD"
}
```

#### 3.2.2 OpenAI GPT Options
```json
{
  "model": "gpt-4.1-mini-2025-04-14|gpt-4.1-2025-04-14|gpt-4o|gpt-4o-mini",
  "temperature": 0.0-1.0,
  "max_tokens_sonar": 100-4000,
  "max_tokens_gpt": 500-8000
}
```

## 4. Ebook Creation Workflow

### 4.1 Initial Form Configuration

#### 4.1.1 AI Method Selection
- **Research Method**: 
  - OpenAI (Standard Research): Uses knowledge base
  - Perplexity Sonar (Web + Real-time): Uses current web data
- **Content Generation Method**:
  - OpenAI Only: Direct content generation
  - Perplexity + OpenAI: Web context + AI generation
- **Web References**: Optional Sonar web search citations

#### 4.1.2 Content Requirements
- **Ebook Niche**: Target subject area
- **Maximum Chapters**: 2-15 chapters (2 for testing)
- **Must-Have Aspects**: Required content and themes
- **Other Considerations**: Additional structural preferences

#### 4.1.3 Advanced Options (Conditional)
Advanced options are displayed only when using Perplexity workflows:
- Shown when Research Method = Perplexity OR Content Generation = Perplexity OR Web References = Yes
- Hidden for pure OpenAI workflows

### 4.2 Research Phase

#### 4.2.1 Market Research (Fixed Parameters)
Regardless of advanced options, market research uses fixed parameters for consistency:

**OpenAI Research Request**:
```json
{
  "model": "gpt-4.1-mini-2025-04-14",
  "max_tokens": 2000,
  "temperature": 0.7,
  "messages": [{"role": "user", "content": "research prompt"}]
}
```

**Perplexity Research Request**:
```json
{
  "model": "sonar",
  "max_tokens": 2000,
  "temperature": 0.7,
  "search_recency_filter": "month",
  "search_mode": "web",
  "messages": [{"role": "user", "content": "research prompt"}]
}
```

#### 4.2.2 Research Output
The research generates a comprehensive brief including:
- Target audience analysis and ideal reader profile
- Current market trends and developments
- Key pain points and emotional triggers
- Recommended content structure and chapter topics
- Market positioning and competitive landscape
- Reader transformation goals and desired outcomes

### 4.3 Structure Generation Phase

#### 4.3.1 Preface and Introduction Generation
Uses OpenAI with advanced options:
```json
{
  "model": "{gptOptions.model || 'gpt-4.1-mini-2025-04-14'}",
  "max_tokens": "{gptOptions.max_tokens_gpt || 3000}",
  "temperature": "{gptOptions.temperature || 0.7}",
  "messages": [{"role": "user", "content": "preface prompt"}]
}
```

#### 4.3.2 Chapter Outline Generation
```json
{
  "model": "{gptOptions.model || 'gpt-4.1-mini-2025-04-14'}",
  "max_tokens": "{gptOptions.max_tokens_gpt || 2000}",
  "temperature": "{gptOptions.temperature || 0.7}",
  "messages": [{"role": "user", "content": "chapter outline prompt"}]
}
```

#### 4.3.3 Chapter Topics Generation
For each chapter:
```json
{
  "model": "{gptOptions.model || 'gpt-4.1-mini-2025-04-14'}",
  "max_tokens": "{gptOptions.max_tokens_gpt || 2000}",
  "temperature": "{gptOptions.temperature || 0.7}",
  "messages": [{"role": "user", "content": "chapter topics prompt"}]
}
```

## 5. Review and Editing Phase

### 5.1 Human Review Interface
The review interface provides comprehensive editing capabilities:

#### 5.1.1 Editable Elements
- **Book Title**: Direct inline editing
- **Chapter Titles**: Individual chapter title modification
- **Topic Titles**: Topic-level title editing
- **Lesson Titles**: Section-level title editing

#### 5.1.2 Content Enhancement Features

**Additional Context Addition**:
- Chapter-level context injection
- Topic-level context injection  
- Section-level context injection
- Context is passed to AI during content generation

**Knowledge Library Integration**:
- Chapter-level knowledge libraries (inherited by all topics and sections)
- Section-level knowledge libraries (overrides inherited)
- RAG-enabled content generation using vector stores
- File processing: 650-token chunks with 250-token overlaps
- Support for PDF, TXT, MD, DOC, DOCX files
- Automatic file upload and vector store creation
- Library status indicators (configured/not-configured/inherited)

#### 5.1.3 Content Structure Management
- **Add/Remove Chapters**: Dynamic chapter management
- **Add/Remove Topics**: Topic management within chapters
- **Add/Remove Lessons**: Section management within topics
- **Hierarchical Validation**: Ensures proper content structure

#### 5.1.4 Knowledge Library Management
**Library Attachment Points**:
- **Chapter Level**: Applies to all topics and sections under the chapter
- **Section Level**: Overrides chapter-level library for specific sections

**Library Creation Process**:
1. User selects "Add Knowledge Library" for chapter or section
2. Modal displays existing libraries with selection options
3. User can create new library by uploading files (PDF, TXT, MD, DOC, DOCX)
4. Files are uploaded to OpenAI with 650-token chunks and 250-token overlaps
5. Vector store is created and associated with the content level
6. Library status is indicated throughout the interface

**Library Inheritance Rules**:
- Sections inherit chapter-level libraries by default
- Section-level libraries override chapter inheritance
- Clear visual indicators show library source (chapter/section/inherited)

## 6. Content Generation Phase

### 6.1 Publishing Workflow Overview
The publishing process follows a hierarchical approach:
1. Create Book (root level)
2. Create Chapters (linked to book)
3. Create Topics (linked to chapters) 
4. Create Sections (linked to topics)

### 6.2 Chapter Topic Context Generation (Aggregated Approach)

#### 6.2.1 Aggregated Context Generation
The system generates context once per chapter topic covering all sections:

**Perplexity Request for Chapter Topic Context**:
```json
{
  "model": "{sonarOptions.model || 'sonar'}",
  "max_tokens": "{sonarOptions.max_tokens_sonar || 1500}",
  "temperature": "{sonarOptions.temperature || 0.3}",
  "search_recency_filter": "{sonarOptions.search_recency_filter || 'month'}",
  "search_mode": "{sonarOptions.search_mode || 'web'}",
  "search_domain_filter": ["domain1.com", "domain2.com"],
  "web_search_options": {
    "search_context_size": "{sonarOptions.search_context_size}",
    "user_location": {
      "country": "{sonarOptions.country}",
      "region": "{sonarOptions.region}",
      "city": "{sonarOptions.city}"
    }
  },
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "schema": {
        "type": "array",
        "items": {
          "type": "object",
          "required": ["sectionName", "summary", "keyPoints", "sources"],
          "properties": {
            "sectionName": {"type": "string"},
            "summary": {"type": "string"},
            "keyPoints": {"type": "array", "items": {"type": "string"}},
            "sources": {"type": "array", "items": {"type": "string"}}
          }
        }
      }
    }
  },
  "messages": [
    {
      "role": "system",
      "content": "Generate structured context for ebook sections"
    },
    {
      "role": "user", 
      "content": "For chapter topic 'Digital Marketing Strategies' provide context for sections: ['SEO Basics', 'Social Media Marketing', 'Email Campaigns']"
    }
  ]
}
```

#### 6.2.2 Structured Response Format
```json
[
  {
    "sectionName": "SEO Basics",
    "summary": "400-word comprehensive summary with current insights",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "sources": ["url1", "url2", "url3"]
  },
  {
    "sectionName": "Social Media Marketing", 
    "summary": "400-word comprehensive summary with current insights",
    "keyPoints": ["Point 1", "Point 2", "Point 3"],
    "sources": ["url1", "url2", "url3"]
  }
]
```

### 6.3 Section Content Generation with RAG

#### 6.3.1 RAG (Retrieval-Augmented Generation) Process
For sections with attached knowledge libraries:

**Vector Store Configuration**:
- Chunking Strategy: 650-token chunks with 250-token overlaps
- File Types: PDF, TXT, MD, DOC, DOCX
- Processing: Automatic file upload and vector store creation

**RAG Content Generation Request**:
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "Expert ebook writer context + user context + file search context"
    },
    {
      "role": "user",
      "content": "Generate content for 'SEO Basics' with web context and file search"
    }
  ],
  "tools": [
    {
      "type": "file_search"
    }
  ],
  "tool_resources": {
    "file_search": {
      "vector_store_ids": ["{vectorStoreId}"]
    }
  },
  "max_tokens": "{gptOptions.max_tokens_gpt || 3000}",
  "temperature": "{gptOptions.temperature || 0.5}"
}
```

#### 6.3.2 Context Assembly and Processing
For each section, the system:
1. Determines applicable knowledge library (section-level or inherited from chapter)
2. Extracts section-specific context from chapter topic context (if Perplexity is used)
3. Combines web context, user-added context, and RAG data
4. Generates content using appropriate AI model with all context sources

**Formatted Section Context**:
```
Web Research Context for "SEO Basics":

Summary: [400-word summary from chapter topic context]

Key Points:
1. [Key point 1]
2. [Key point 2] 
3. [Key point 3]

Sources:
1. [Source URL 1]
2. [Source URL 2]

RAG Context: [Available when vector store is attached]
Files: [List of files in knowledge library]
Processing: 650-token chunks with 250-token overlaps
```

### 6.4 Domain-Specific Research

#### 6.4.1 Domain Filter Configuration
When `search_domain_filter` is specified:
```json
{
  "search_domain_filter": ["arxiv.org", "wikipedia.org", "nature.com"],
  "search_mode": "web"
}
```

**Note**: Domain filters are automatically disabled when `search_mode: "academic"` is selected.

#### 6.4.2 Academic Mode Restrictions
When using academic mode:
- Domain filters are ignored
- Search focuses on scholarly sources
- Recency filters may be relaxed for academic content

### 6.5 Web References Integration

#### 6.5.1 Reference Generation Request
```json
{
  "model": "{sonarOptions.model || 'sonar'}",
  "max_tokens": "{sonarOptions.max_tokens_sonar || 600}",
  "temperature": "{sonarOptions.temperature || 0.3}",
  "search_recency_filter": "{sonarOptions.search_recency_filter}",
  "messages": [
    {
      "role": "user",
      "content": "Find 2-3 current web sources for 'Digital Marketing Strategies'"
    }
  ]
}
```

#### 6.5.2 Reference Formatting
References are formatted as HTML and appended to topic content:
```html
<div class="web-references" style="margin-top: 2rem; padding: 1rem; background-color: #f8f9fa; border-left: 4px solid #007bff;">
  <h4>📚 Additional Web Resources:</h4>
  <ul>
    <li>
      <a href="https://example.com" target="_blank">Article Title</a><br>
      <span style="color: #6c757d;">First 20 words of content...</span><br>
      <small>Published: 2024-01-15</small>
    </li>
  </ul>
  <p style="font-size: 0.75rem; color: #868e96;">
    Sources found via Perplexity Sonar web search • Generated: 2024-01-20
  </p>
</div>
```

## 7. Knowledge Library System (RAG Integration)

### 7.1 Vector Store Management

#### 7.1.1 File Upload Process
**Supported File Types**: PDF, TXT, MD, DOC, DOCX

**Upload Workflow**:
1. User selects files through file input
2. Files are validated for type and size
3. Progress tracking during upload
4. Files uploaded to OpenAI with purpose: 'assistants'

**File Upload API Call**:
```bash
curl -X POST "https://api.openai.com/v1/files" \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -F "file=@document.pdf" \
  -F "purpose=assistants"
```

#### 7.1.2 Vector Store Creation
**Vector Store Configuration**:
```json
{
  "name": "Chapter 1 Knowledge Library",
  "chunking_strategy": {
    "type": "static",
    "static": {
      "max_chunk_size_tokens": 650,
      "chunk_overlap_tokens": 250
    }
  },
  "file_ids": ["file-abc123", "file-def456"]
}
```

**API Call**:
```bash
curl -X POST "https://api.openai.com/v1/vector_stores" \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -H "Content-Type: application/json" \
  -H "OpenAI-Beta: assistants=v2" \
  -d '{
    "name": "Chapter 1 Knowledge Library",
    "chunking_strategy": {
      "type": "static",
      "static": {
        "max_chunk_size_tokens": 650,
        "chunk_overlap_tokens": 250
      }
    },
    "file_ids": ["file-abc123", "file-def456"]
  }'
```

### 7.2 RAG Content Generation

#### 7.2.1 File Search Integration
When generating content with RAG:

**Chat Completion with File Search**:
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "Expert ebook writer with access to uploaded knowledge files..."
    },
    {
      "role": "user",
      "content": "Generate section content using the attached files as reference..."
    }
  ],
  "tools": [
    {
      "type": "file_search"
    }
  ],
  "tool_resources": {
    "file_search": {
      "vector_store_ids": ["vs-abc123"]
    }
  },
  "max_tokens": 2400,
  "temperature": 0.5
}
```

#### 7.2.2 RAG Usage Tracking
The system tracks RAG usage for quality assurance:
- **File Search Usage**: Whether file_search tool was actually used
- **Annotations**: Presence of citation annotations in response
- **Response Quality**: Length and completeness of generated content
- **Vector Store Status**: Processing status and file count validation

### 7.3 Library Management Interface

#### 7.3.1 Library Selection Modal
**Features**:
- List existing vector stores with metadata
- Create new libraries with file upload
- Progress tracking during creation
- Library status validation

**Library Information Display**:
- Library name and creation date
- File count and processing status
- Usage statistics (chapters/sections using the library)
- Status indicators (ready/processing/failed)

#### 7.3.2 Library Inheritance System
**Chapter-Level Libraries**:
- Apply to all topics and sections under the chapter
- Clearly indicated in the interface
- Can be overridden at section level

**Section-Level Libraries**:
- Override chapter-level inheritance
- Provide specific context for individual sections
- Visual indicators show override status

## 8. WordPress Integration

### 8.1 Custom Post Type Hierarchy
The system creates a hierarchical content structure using custom post types:

```
Book (book)
├── Chapter (chapter) [ACF: chapter_parent_book]
│   ├── Chapter Topic (chaptertopic) [ACF: topic_parent_chapter]
│   │   ├── Topic Section (topicsection) [ACF: section_parent_topic]
│   │   └── Topic Section (topicsection) [ACF: section_parent_topic]
│   └── Chapter Topic (chaptertopic) [ACF: topic_parent_chapter]
└── Chapter (chapter) [ACF: chapter_parent_book]
```

### 8.2 WordPress API Interactions

#### 8.2.1 Book Creation
**cURL Command**:
```bash
curl -X POST "https://yoursite.com/wp-json/wp/v2/book" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:app_password' | base64)" \
  -d '{
    "title": "Digital Marketing Mastery Guide",
    "content": "<h2>Preface</h2><p>This comprehensive guide...</p>",
    "status": "publish"
  }'
```

**Response**:
```json
{
  "id": 123,
  "title": {"rendered": "Digital Marketing Mastery Guide"},
  "content": {"rendered": "<h2>Preface</h2><p>This comprehensive guide...</p>"},
  "status": "publish",
  "link": "https://yoursite.com/book/digital-marketing-mastery-guide/",
  "date": "2024-01-20T10:30:00"
}
```

#### 8.2.2 Chapter Creation with ACF Relationship
**cURL Command**:
```bash
curl -X POST "https://yoursite.com/wp-json/wp/v2/chapter" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:app_password' | base64)" \
  -d '{
    "title": "Chapter 1: SEO Fundamentals",
    "content": "<p>This chapter covers the basics of SEO...</p>",
    "status": "publish",
    "acf": {
      "chapter_parent_book": 123
    }
  }'
```

#### 8.2.3 Chapter Topic Creation
**cURL Command**:
```bash
curl -X POST "https://yoursite.com/wp-json/wp/v2/chaptertopic" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:app_password' | base64)" \
  -d '{
    "title": "Keyword Research Strategies",
    "content": "<div class=\"topic-introduction\">Keyword research forms...</div>",
    "status": "publish",
    "acf": {
      "topic_parent_chapter": 124
    }
  }'
```

#### 8.2.4 Topic Section Creation with RAG Content
**cURL Command**:
```bash
curl -X POST "https://yoursite.com/wp-json/wp/v2/topicsection" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'username:app_password' | base64)" \
  -d '{
    "title": "Understanding Search Intent",
    "content": "<h2>Understanding Search Intent</h2><p>Search intent represents...</p><div class=\"rag-context\">Based on uploaded knowledge files...</div>",
    "status": "publish", 
    "acf": {
      "section_parent_topic": 125
    }
  }'
```

### 8.3 Webhook Integration

#### 8.3.1 Book-to-Chapter Webhook
**Request**:
```bash
curl -X POST "https://test1.ilearn.guru/webhook/capture/uVCwiJWxOE" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'flowmattic:webhook_password' | base64)" \
  -d '{
    "parent_id": 123,
    "child_id": 124,
    "timestamp": "2024-01-20T10:35:00Z",
    "webhook_type": "bookToChapter"
  }'
```

#### 8.3.2 Chapter-to-Topic Webhook  
**Request**:
```bash
curl -X POST "https://test1.ilearn.guru/webhook/capture/k64OfUZ0VI" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'flowmattic:webhook_password' | base64)" \
  -d '{
    "parent_id": 124,
    "child_id": 125,
    "timestamp": "2024-01-20T10:40:00Z", 
    "webhook_type": "chapterToTopic"
  }'
```

#### 8.3.3 Topic-to-Section Webhook
**Request**:
```bash
curl -X POST "https://test1.ilearn.guru/webhook/capture/EM5Or1GwKY" \
  -H "Content-Type: application/json" \
  -H "Authorization: Basic $(echo -n 'flowmattic:webhook_password' | base64)" \
  -d '{
    "parent_id": 125,
    "child_id": 126,
    "timestamp": "2024-01-20T10:45:00Z",
    "webhook_type": "topicToSection"
  }'
```

## 9. PDF/HTML Generation

### 9.1 Content Retrieval Process

#### 9.1.1 Book Discovery
**cURL Command**:
```bash
curl -X GET "https://ebooktest.ilearn.guru/wp-json/wp/v2/book?_fields=id%2Ctitle" \
  -H "Accept: application/json"
```

**Response**:
```json
[
  {
    "id": 123,
    "title": {"rendered": "Digital Marketing Mastery Guide"}
  },
  {
    "id": 124, 
    "title": {"rendered": "Advanced SEO Techniques"}
  }
]
```

#### 9.1.2 Hierarchical Content Assembly
The system retrieves content in hierarchical order:

1. **Chapter Retrieval**:
```bash
curl -X GET "https://ebooktest.ilearn.guru/wp-json/wp/v2/chapter?_fields=id,title,content,acf.chapter_parent_book&per_page=100"
```

2. **Chapter Topic Retrieval**:
```bash
curl -X GET "https://ebooktest.ilearn.guru/wp-json/wp/v2/chaptertopic?_fields=id,title,content,acf.topic_parent_chapter&per_page=100"
```

3. **Topic Section Retrieval**:
```bash
curl -X GET "https://ebooktest.ilearn.guru/wp-json/wp/v2/topicsection?_fields=id,title,content,acf.section_parent_topic&per_page=100"
```

### 9.2 Content Assembly Algorithm

#### 9.2.1 Hierarchical Structure Building
```javascript
// Content assembly process
1. Fetch book by ID
2. Fetch all chapters where acf.chapter_parent_book == bookId
3. For each chapter:
   a. Fetch all topics where acf.topic_parent_chapter == chapterId
   b. For each topic:
      i. Fetch all sections where acf.section_parent_topic == topicId
      ii. Sort sections by ID (ascending)
   c. Sort topics by ID (ascending)
4. Sort chapters by ID (ascending)
5. Generate HTML structure with RAG indicators
```

#### 9.2.2 Generated HTML Structure with RAG Tracking
```html
<!DOCTYPE html>
<html>
<head>
  <title>Digital Marketing Mastery Guide - Complete Content</title>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; margin: 40px; }
    h1 { color: #2c3e50; border-bottom: 3px solid #3498db; page-break-before: always; }
    .rag-indicator { background: #e8f5e8; padding: 5px; border-left: 3px solid #4caf50; }
    .web-context { background: #e3f2fd; padding: 5px; border-left: 3px solid #2196f3; }
  </style>
</head>
<body>
  <div class="book-header">
    <h1 class="book-title">Digital Marketing Mastery Guide</h1>
    <div class="structure-info">
      <strong>Content Structure:</strong><br>
      Book ID: 123<br>
      5 Chapters<br>
      12 Topics<br>
      36 Sections<br>
      RAG-Enhanced Sections: 15<br>
      Web Context Sections: 28
    </div>
  </div>
  
  <h1>Chapter: 124 <span class="chapter-id">(ID: 124)</span></h1>
  <h2>Chapter 1: SEO Fundamentals</h2>
  <div class="content">[Chapter content]</div>
  
  <h3>Section: 126 <span class="section-id">(ID: 126)</span></h3>
  <h4>Understanding Search Intent</h4>
  <div class="rag-indicator">Enhanced with Knowledge Library</div>
  <div class="content">[Section content with RAG enhancement]</div>
</body>
</html>
```

## 10. Quality Assurance and Error Handling

### 10.1 API Rate Limit Management
- **Primary/Fallback Key System**: Automatic failover when rate limits exceeded
- **Exponential Backoff**: Retry logic with increasing delays
- **Error Context Preservation**: Detailed error logging for debugging

### 10.2 Content Generation Safeguards
- **Abort Mechanism**: User can stop generation at any point
- **Progress Tracking**: Real-time progress updates with current operation
- **Graceful Degradation**: Continue with partial context if services fail
- **Background Processing**: Minimize publishing window for better UX
- **RAG Validation**: Verify vector store status before content generation

### 10.3 WordPress Integration Validation
- **Connection Testing**: Pre-flight validation of WordPress credentials
- **Post Type Verification**: Ensure required custom post types exist
- **Permission Checking**: Validate user permissions for content creation
- **Webhook Testing**: Test all webhook endpoints before publishing

### 10.4 Knowledge Library Quality Control
- **File Validation**: Check file types and sizes before upload
- **Vector Store Status**: Monitor processing status and file counts
- **RAG Usage Verification**: Confirm file_search tool usage in responses
- **Library Inheritance Validation**: Ensure proper library application

## 11. Performance Considerations

### 11.1 API Optimization
- **Chapter Topic Aggregation**: Single Sonar call per topic instead of per section
- **Structured Responses**: JSON schema for consistent data parsing
- **Context Caching**: Cache chapter topic context to avoid duplicate calls
- **Batch Operations**: Group related API calls where possible
- **RAG Efficiency**: Optimize vector store queries with proper chunking

### 11.2 Content Processing Efficiency
- **Lazy Loading**: Load content sections as needed during review
- **Incremental Updates**: Save changes incrementally during editing
- **Vector Store Optimization**: 650-token chunks with 250-token overlaps for optimal retrieval
- **Concurrent Processing**: Parallel API calls where dependencies allow
- **File Processing**: Asynchronous file upload and vector store creation

### 11.3 User Experience Optimization
- **Real-time Progress**: Detailed progress indicators for long-running operations
- **Background Processing**: Allow users to minimize publishing window
- **Auto-save**: Automatic saving of user edits and configurations
- **Responsive Design**: Optimized for desktop and tablet usage
- **Library Management**: Intuitive interface for knowledge library operations

## 12. Security and Compliance

### 12.1 API Key Security
- **Local Storage Encryption**: Encrypted storage of sensitive credentials
- **No Server-side Storage**: All credentials remain client-side
- **Secure Transmission**: HTTPS for all API communications
- **Key Validation**: Test keys before storage and usage

### 12.2 WordPress Security
- **Application Passwords**: Use WordPress application-specific passwords
- **Permission Validation**: Verify user permissions before operations
- **Input Sanitization**: Sanitize all content before WordPress submission
- **Authentication Headers**: Secure Basic Auth for API requests

### 12.3 Data Privacy and File Security
- **No Data Retention**: Platform does not store user content server-side
- **Local Processing**: All content generation and editing occurs client-side
- **Secure APIs**: All integrations use official, secure API endpoints
- **User Control**: Users maintain full control over their data and credentials
- **File Upload Security**: Files uploaded directly to OpenAI with secure transmission
- **Vector Store Privacy**: Vector stores are user-specific and access-controlled

## 13. Integration Workflows

### 13.1 Complete Ebook Generation Workflow
1. **Configuration**: User configures API keys and advanced options
2. **Project Creation**: User defines ebook requirements and AI methods
3. **Research Phase**: AI conducts market research using selected method
4. **Structure Generation**: AI creates hierarchical ebook structure
5. **Review Phase**: User reviews, edits, and adds knowledge libraries
6. **Content Generation**: AI generates content with RAG enhancement where applicable
7. **WordPress Publishing**: Content published with hierarchical relationships
8. **PDF Export**: Complete book exported for distribution

### 13.2 Knowledge Library Workflow
1. **Library Creation**: User uploads files and creates vector stores
2. **Library Assignment**: Libraries attached at chapter or section level
3. **Inheritance Management**: Section-level libraries override chapter inheritance
4. **RAG Integration**: Vector stores used during content generation
5. **Quality Validation**: System verifies RAG usage and content enhancement

### 13.3 Multi-Modal Content Enhancement
- **Web Research**: Perplexity Sonar provides current web context
- **Knowledge Libraries**: RAG provides domain-specific expertise
- **User Context**: Custom instructions and requirements
- **AI Generation**: OpenAI synthesizes all context sources
- **Reference Integration**: Web citations and knowledge sources documented

This comprehensive business requirements document outlines the complete EbookGen platform functionality, from initial configuration through final WordPress publishing and PDF generation, with detailed technical specifications for each component, integration point, and the advanced RAG-enabled knowledge library system.