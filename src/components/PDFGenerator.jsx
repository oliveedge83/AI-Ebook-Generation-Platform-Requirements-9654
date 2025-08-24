import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiDownload, FiLoader, FiFileText, FiBook, FiAlertCircle, FiRefreshCw } = FiIcons;

const PDFGenerator = () => {
  const [books, setBooks] = useState([]);
  const [selectedBookId, setSelectedBookId] = useState('');
  const [isLoadingBooks, setIsLoadingBooks] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState({ step: '', message: '' });
  const [error, setError] = useState(null);

  // Fetch books on component mount
  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    setIsLoadingBooks(true);
    setError(null);
    
    try {
      const response = await fetch('https://ebooktest.ilearn.guru/wp-json/wp/v2/book?_fields=id%2Ctitle');
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const booksData = await response.json();
      
      if (!Array.isArray(booksData)) {
        throw new Error('Invalid response format - expected array of books');
      }
      
      // Sort books by title for better UX
      const sortedBooks = booksData
        .filter(book => book.id && book.title?.rendered) // Filter out invalid books
        .sort((a, b) => a.title.rendered.localeCompare(b.title.rendered));
      
      setBooks(sortedBooks);
      console.log(`Fetched ${sortedBooks.length} books successfully`);
      
      if (sortedBooks.length === 0) {
        setError('No books found in the WordPress site');
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      setError(`Failed to fetch books: ${error.message}`);
      setBooks([]);
    } finally {
      setIsLoadingBooks(false);
    }
  };

  const fetchWithRetry = async (url, retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        return await response.json();
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  };

  const fetchBookContent = async (bookId) => {
    const baseUrl = 'https://ebooktest.ilearn.guru/wp-json/wp/v2';
    
    setProgress({ step: 'chapters', message: 'Fetching chapters...' });
    
    // Step 1: Fetch chapters
    const chaptersResponse = await fetchWithRetry(
      `${baseUrl}/chapter?_fields=id,title,content,acf.chapter_parent_book&per_page=100`
    );
    
    const chapters = chaptersResponse
      .filter(chapter => chapter.acf?.chapter_parent_book == bookId)
      .sort((a, b) => a.id - b.id);

    console.log(`Found ${chapters.length} chapters for book ${bookId}`);

    const bookStructure = {
      bookId: parseInt(bookId),
      chapters: []
    };

    // Step 2: For each chapter, fetch topics
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      setProgress({ 
        step: 'topics', 
        message: `Fetching topics for chapter ${i + 1}/${chapters.length}...` 
      });

      const topicsResponse = await fetchWithRetry(
        `${baseUrl}/chaptertopic?_fields=id,title,content,acf.topic_parent_chapter&per_page=100`
      );

      const chapterTopics = topicsResponse
        .filter(topic => topic.acf?.topic_parent_chapter == chapter.id)
        .sort((a, b) => a.id - b.id);

      console.log(`Found ${chapterTopics.length} topics for chapter ${chapter.id}`);

      const chapterData = {
        id: chapter.id,
        title: chapter.title?.rendered || `Chapter ${chapter.id}`,
        content: chapter.content?.rendered || '',
        topics: []
      };

      // Step 3: For each topic, fetch sections
      for (let j = 0; j < chapterTopics.length; j++) {
        const topic = chapterTopics[j];
        setProgress({ 
          step: 'sections', 
          message: `Fetching sections for topic ${j + 1}/${chapterTopics.length} in chapter ${i + 1}...` 
        });

        const sectionsResponse = await fetchWithRetry(
          `${baseUrl}/topicsection?_fields=id,title,content,acf.section_parent_topic&per_page=100`
        );

        const topicSections = sectionsResponse
          .filter(section => section.acf?.section_parent_topic == topic.id)
          .sort((a, b) => a.id - b.id);

        console.log(`Found ${topicSections.length} sections for topic ${topic.id}`);

        const topicData = {
          id: topic.id,
          title: topic.title?.rendered || `Topic ${topic.id}`,
          content: topic.content?.rendered || '',
          sections: topicSections.map(section => ({
            id: section.id,
            title: section.title?.rendered || `Section ${section.id}`,
            content: section.content?.rendered || ''
          }))
        };

        chapterData.topics.push(topicData);
      }

      bookStructure.chapters.push(chapterData);
    }

    return bookStructure;
  };

  const generatePDF = async (bookStructure) => {
    setProgress({ step: 'pdf', message: 'Generating PDF...' });

    // Get the selected book title for the PDF
    const selectedBook = books.find(book => book.id == bookStructure.bookId);
    const bookTitle = selectedBook?.title?.rendered || `Book ${bookStructure.bookId}`;

    // Create PDF content as HTML
    let pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${bookTitle} - Complete Content</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            margin: 40px;
            color: #333;
        }
        h1 { 
            color: #2c3e50; 
            border-bottom: 3px solid #3498db; 
            padding-bottom: 10px;
            page-break-before: always;
        }
        h2 { 
            color: #34495e; 
            border-bottom: 2px solid #95a5a6; 
            padding-bottom: 5px;
            margin-top: 30px;
        }
        h3 { 
            color: #7f8c8d; 
            border-bottom: 1px solid #bdc3c7; 
            padding-bottom: 3px;
            margin-top: 25px;
        }
        .book-header {
            text-align: center;
            margin-bottom: 40px;
            page-break-after: always;
        }
        .book-title {
            font-size: 2.5em;
            color: #2c3e50;
            margin-bottom: 20px;
        }
        .chapter-id, .topic-id, .section-id {
            font-size: 0.9em;
            color: #7f8c8d;
            font-weight: normal;
        }
        .content {
            margin: 20px 0;
            text-align: justify;
        }
        .structure-info {
            background: #ecf0f1;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
        }
        @media print {
            body { margin: 20px; }
            h1 { page-break-before: always; }
        }
    </style>
</head>
<body>
    <div class="book-header">
        <h1 class="book-title">${bookTitle}</h1>
        <h2>Complete Book Content</h2>
        <div class="structure-info">
            <strong>Content Structure:</strong><br>
            Book ID: ${bookStructure.bookId}<br>
            ${bookStructure.chapters.length} Chapters<br>
            ${bookStructure.chapters.reduce((sum, ch) => sum + ch.topics.length, 0)} Topics<br>
            ${bookStructure.chapters.reduce((sum, ch) => sum + ch.topics.reduce((topicSum, topic) => topicSum + topic.sections.length, 0), 0)} Sections
        </div>
        <p><em>Generated on: ${new Date().toLocaleString()}</em></p>
    </div>
`;

    bookStructure.chapters.forEach(chapter => {
      pdfContent += `
    <h1>Chapter: ${chapter.id} <span class="chapter-id">(ID: ${chapter.id})</span></h1>
    <h2>${chapter.title}</h2>
    <div class="content">${chapter.content || '<p><em>No content available</em></p>'}</div>
`;

      chapter.topics.forEach(topic => {
        pdfContent += `
        <h2>Topic: ${topic.id} <span class="topic-id">(ID: ${topic.id})</span></h2>
        <h3>${topic.title}</h3>
        <div class="content">${topic.content || '<p><em>No content available</em></p>'}</div>
`;

        topic.sections.forEach(section => {
          pdfContent += `
            <h3>Section: ${section.id} <span class="section-id">(ID: ${section.id})</span></h3>
            <h4>${section.title}</h4>
            <div class="content">${section.content || '<p><em>No content available</em></p>'}</div>
`;
        });
      });
    });

    pdfContent += `
</body>
</html>`;

    // Create and download HTML file (can be converted to PDF by browser)
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${bookTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-complete.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    // Also trigger browser print for PDF conversion
    const printWindow = window.open('', '_blank');
    printWindow.document.write(pdfContent);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 1000);
  };

  const handleGeneratePDF = async () => {
    if (!selectedBookId) {
      setError('Please select a book from the dropdown');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      console.log(`Starting PDF generation for book ID: ${selectedBookId}`);
      
      const bookStructure = await fetchBookContent(parseInt(selectedBookId));
      
      if (bookStructure.chapters.length === 0) {
        throw new Error(`No chapters found for the selected book. Please verify the book has content.`);
      }

      await generatePDF(bookStructure);
      
      setProgress({ step: 'complete', message: 'PDF generated successfully!' });
      
    } catch (error) {
      console.error('PDF Generation Error:', error);
      setError(error.message || 'Failed to generate PDF');
    } finally {
      setIsGenerating(false);
      setTimeout(() => {
        setProgress({ step: '', message: '' });
      }, 3000);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WordPress PDF Generator</h1>
        <p className="text-gray-600">
          Select a book and generate a structured PDF containing all chapters, topics, and sections.
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      >
        <div className="flex items-center space-x-3 mb-6">
          <SafeIcon icon={FiBook} className="text-xl text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">Book PDF Generator</h2>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Book *
              </label>
              <button
                onClick={fetchBooks}
                disabled={isLoadingBooks}
                className="text-xs text-primary-600 hover:text-primary-700 flex items-center space-x-1"
              >
                <SafeIcon 
                  icon={FiRefreshCw} 
                  className={`text-xs ${isLoadingBooks ? 'animate-spin' : ''}`} 
                />
                <span>Refresh</span>
              </button>
            </div>
            
            {isLoadingBooks ? (
              <div className="flex items-center space-x-2 p-3 border border-gray-300 rounded-md bg-gray-50">
                <SafeIcon icon={FiLoader} className="animate-spin text-primary-600" />
                <span className="text-sm text-gray-600">Loading books...</span>
              </div>
            ) : (
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                disabled={isGenerating}
              >
                <option value="">Choose a book...</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title.rendered} (ID: {book.id})
                  </option>
                ))}
              </select>
            )}
            
            <p className="text-xs text-gray-500 mt-1">
              {books.length > 0 
                ? `${books.length} books available` 
                : 'No books found or failed to load'
              }
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center space-x-2">
                <SafeIcon icon={FiAlertCircle} className="text-red-600" />
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          )}

          {progress.message && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center space-x-2">
                <SafeIcon 
                  icon={progress.step === 'complete' ? FiFileText : FiLoader} 
                  className={`${progress.step === 'complete' ? 'text-green-600' : 'text-blue-600 animate-spin'}`} 
                />
                <p className="text-sm text-blue-800">{progress.message}</p>
              </div>
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGeneratePDF}
            disabled={isGenerating || !selectedBookId || isLoadingBooks}
            className="w-full flex items-center justify-center space-x-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGenerating ? (
              <>
                <SafeIcon icon={FiLoader} className="animate-spin" />
                <span>Generating PDF...</span>
              </>
            ) : (
              <>
                <SafeIcon icon={FiDownload} />
                <span>Generate PDF</span>
              </>
            )}
          </motion.button>
        </div>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-900 mb-3">How it works:</h3>
          <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
            <li>Automatically fetches all available books from WordPress</li>
            <li>Select a book from the dropdown to see its title and ID</li>
            <li>For the selected book, fetches all associated chapters</li>
            <li>For each chapter, fetches all associated chapter topics</li>
            <li>For each topic, fetches all associated topic sections</li>
            <li>Generates a structured PDF with the hierarchical content</li>
            <li>Downloads the PDF and opens print dialog for saving</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <p className="text-xs text-blue-800">
              <strong>Data Source:</strong> https://ebooktest.ilearn.guru/wp-json/wp/v2/<br/>
              <strong>Structure:</strong> Book → Chapters → Topics → Sections<br/>
              <strong>Sorting:</strong> All content sorted by post ID (ascending)<br/>
              <strong>Books:</strong> Automatically loaded and sorted alphabetically
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PDFGenerator;