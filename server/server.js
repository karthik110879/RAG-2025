import express from 'express';
import multer from 'multer';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Document } from 'langchain/document';
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { ChromaClient } from 'chromadb';
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from '@langchain/openai';
import { Ollama } from '@langchain/community/llms/ollama';
// pdf-parse will be imported dynamically to avoid test file issues
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'), false);
    }
  }
});

// Global variables for vector store
let vectorStore = null;
let chromaClient = null;
let currentCollection = null;

// Initialize ChromaDB
const initializeChroma = async () => {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });

    // Initialize direct ChromaDB client
    chromaClient = new ChromaClient({
      path: 'http://localhost:8000'
    });

    // Test the connection
    await chromaClient.heartbeat();
    console.log('ChromaDB client initialized successfully');
    
    return chromaClient;
  } catch (error) {
    console.error('Error initializing ChromaDB:', error);
    console.log('Make sure ChromaDB is running on http://localhost:8000');
    console.log('ChromaDB is running in Docker - check Docker Desktop');
    console.log('Note: ChromaDB v2 API is being used');
    throw error;
  }
};

// Parse PDF document
const parsePDF = async (filePath) => {
  try {
    // Dynamic import to avoid test file issues during startup
    const pdf = (await import('pdf-parse')).default;
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw error;
  }
};

// Chunk text and create embeddings
const processDocument = async (text, collectionId) => {
  try {
    // Split text into chunks
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const docs = await textSplitter.createDocuments([text]);
    
    // Add metadata to documents
    const documentsWithMetadata = docs.map(doc => ({
      ...doc,
      metadata: {
        ...doc.metadata,
        collectionId: collectionId,
        timestamp: new Date().toISOString()
      }
    }));

    // Create embeddings
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });

    // Create or get collection
    const collectionName = `collection_${collectionId}`;
    
    // Create collection using direct ChromaDB client
    let collection;
    try {
      // Try to get existing collection first
      collection = await chromaClient.getCollection({ name: collectionName });
      console.log(`Using existing collection: ${collectionName}`);
    } catch (error) {
      // Collection doesn't exist, create it
      console.log(`Creating new collection: ${collectionName}`);
      collection = await chromaClient.createCollection({
        name: collectionName
      });
      console.log(`Successfully created collection: ${collectionName}`);
    }

    // Prepare documents for ChromaDB
    const documents = documentsWithMetadata.map(doc => doc.pageContent);
    const metadatas = documentsWithMetadata.map(doc => doc.metadata);
    const ids = documentsWithMetadata.map((_, index) => `${collectionId}_${index}`);

    console.log(`Processing ${documents.length} document chunks...`);
    
    // Validate data before processing
    if (documents.length === 0) {
      throw new Error('No documents to process');
    }
    
    // Filter valid documents and corresponding metadata/ids
    const validIndices = [];
    const validDocuments = [];
    const validMetadatas = [];
    const validIds = [];
    
    documents.forEach((doc, index) => {
      if (typeof doc === 'string' && doc.trim().length > 0) {
        validDocuments.push(doc);
        validMetadatas.push(metadatas[index]);
        validIds.push(ids[index]);
        validIndices.push(index);
      }
    });
    
    if (validDocuments.length === 0) {
      throw new Error('No valid documents found');
    }
    
    console.log(`Valid documents: ${validDocuments.length}/${documents.length}`);

    // Generate embeddings and add documents (reliable approach)
    console.log('Generating embeddings and processing documents...');
    
    const embeddingsList = await embeddings.embedDocuments(validDocuments);
    console.log(`Generated ${embeddingsList.length} embeddings`);
    
    // Add documents without metadata (this approach works reliably)
    console.log('Adding documents to ChromaDB...');
    
    for (let i = 0; i < validDocuments.length; i++) {
      console.log(`Processing document ${i + 1}/${validDocuments.length}...`);
      
      await collection.add({
        ids: [validIds[i]],
        documents: [validDocuments[i]],
        embeddings: [embeddingsList[i]]
      });
      
      console.log(`✅ Successfully added document ${i + 1}`);
    }

    // Store collection reference for later use
    currentCollection = collection;

    return {
      success: true,
      message: 'Document processed successfully',
      collectionId: collectionId,
      chunksCount: documentsWithMetadata.length
    };
  } catch (error) {
    console.error('Error processing document:', error);
    throw error;
  }
};

// Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'RAG Server is running' });
});

// Upload and process document
app.post('/upload', upload.single('document'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const collectionId = uuidv4();
    const filePath = req.file.path;

    // Parse PDF
    const text = await parsePDF(filePath);
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text content found in PDF' });
    }

    // Process document
    const result = await processDocument(text, collectionId);
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json(result);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process document' });
  }
});

// Chat endpoint with streaming
app.post('/chat', async (req, res) => {
  try {
    const { question, collectionId } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    if (!currentCollection) {
      return res.status(400).json({ error: 'No document loaded. Please upload a document first.' });
    }

    // Set response headers for streaming
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Create a readable stream for the response
    const stream = new ReadableStream({
      start(controller) {
        // Send initial response
        controller.enqueue(`data: ${JSON.stringify({ type: 'start', message: 'Processing your question...' })}\n\n`);
      },
      async pull(controller) {
        try {
          // Create LLM instance
          const llm = new ChatOpenAI({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'gpt-4o-mini',
            temperature: 0.7,
            streaming: true
          });

          // Create embeddings instance
          const embeddings = new OpenAIEmbeddings({
            openAIApiKey: process.env.OPENAI_API_KEY,
            modelName: 'text-embedding-3-small'
          });

          // Generate embedding for the question
          const questionEmbedding = await embeddings.embedQuery(question);
          
          // Query the collection directly
          const results = await currentCollection.query({
            queryEmbeddings: [questionEmbedding],
            nResults: 4
          });
          
          // Convert results to document format
          const docs = results.documents[0].map((doc, index) => ({
            pageContent: doc,
            metadata: results.metadatas?.[0]?.[index] || { source: 'document' }
          }));
          
          if (docs.length === 0) {
            controller.enqueue(`data: ${JSON.stringify({ 
              type: 'answer', 
              answer: 'I couldn\'t find any relevant information in the uploaded document to answer your question. Please make sure you have uploaded a document and try asking a different question.',
              sources: []
            })}\n\n`);
            controller.enqueue(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
            controller.close();
            return;
          }

          // Create context from retrieved documents
          const context = docs.map(doc => doc.pageContent).join('\n\n');
          
          // Create prompt
          const prompt = `Based on the following context from the uploaded document, please answer the user's question. If the answer cannot be found in the context, say so.

Context:
${context}

Question: ${question}

Answer:`;

          // Get response from LLM
          const response = await llm.invoke(prompt);

          // Send the answer
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'answer', 
            answer: response.content,
            sources: docs.map(doc => ({
              content: doc.pageContent.substring(0, 200) + '...',
              metadata: doc.metadata
            }))
          })}\n\n`);

          // Send end signal
          controller.enqueue(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
          controller.close();
        } catch (error) {
          console.error('Chat error:', error);
          let errorMessage = 'Failed to process question';
          
          if (error.message.includes('Invalid where clause')) {
            errorMessage = 'Database query error. Please try uploading the document again.';
          } else if (error.message.includes('collection')) {
            errorMessage = 'No document found. Please upload a document first.';
          } else if (error.message.includes('embedding')) {
            errorMessage = 'Embedding error. Please try again.';
          }
          
          controller.enqueue(`data: ${JSON.stringify({ type: 'error', error: errorMessage })}\n\n`);
          controller.close();
        }
      }
    });

    // Pipe the stream to response
    const reader = stream.getReader();
    const pump = () => {
      return reader.read().then(({ done, value }) => {
        if (done) {
          res.end();
          return;
        }
        res.write(value);
        return pump();
      });
    };

    pump().catch(error => {
      console.error('Streaming error:', error);
      res.status(500).end();
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get collection info
app.get('/collection/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!vectorStore) {
      return res.status(404).json({ error: 'No collection found' });
    }

    // Get collection stats
    const collection = await vectorStore.collection.get();
    const count = await collection.count();

    res.json({
      collectionId: id,
      documentCount: count,
      status: 'active'
    });
  } catch (error) {
    console.error('Collection info error:', error);
    res.status(500).json({ error: 'Failed to get collection info' });
  }
});

// Debug endpoint to check ChromaDB status
app.get('/debug/chromadb', async (req, res) => {
  try {
    if (!chromaClient) {
      return res.json({ 
        status: 'ChromaDB client not initialized',
        collections: []
      });
    }

    if (!currentCollection) {
      return res.json({ 
        status: 'ChromaDB connected but no collection loaded',
        message: 'Upload a document first'
      });
    }

    // Try to get collection info
    const count = await currentCollection.count();
    
    res.json({
      status: 'ChromaDB connected',
      collectionName: currentCollection.name,
      documentCount: count,
      message: count > 0 ? 'Ready for queries' : 'No documents uploaded yet'
    });
  } catch (error) {
    res.json({
      status: 'ChromaDB error',
      error: error.message
    });
  }
});

// Test endpoint to verify ChromaDB functionality
app.get('/test/chromadb', async (req, res) => {
  try {
    if (!chromaClient) {
      return res.status(500).json({ error: 'ChromaDB client not initialized' });
    }

    // Test creating a simple collection
    const testCollectionName = 'test_collection_' + Date.now();
    const testCollection = await chromaClient.createCollection({
      name: testCollectionName
    });

    // Test adding a simple document
    await testCollection.add({
      ids: ['test1'],
      documents: ['This is a test document'],
      metadatas: [{ test: true }],
      embeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]] // Simple test embedding
    });

    // Test querying
    const results = await testCollection.query({
      queryEmbeddings: [[0.1, 0.2, 0.3, 0.4, 0.5]],
      nResults: 1
    });

    // Clean up test collection
    await chromaClient.deleteCollection({ name: testCollectionName });

    res.json({
      status: 'ChromaDB test successful',
      message: 'ChromaDB is working correctly',
      testResults: {
        collectionCreated: true,
        documentAdded: true,
        querySuccessful: results.documents.length > 0
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'ChromaDB test failed',
      error: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`RAG Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  
  // Initialize ChromaDB in the background
  initializeChroma().catch(error => {
    console.error('Failed to initialize ChromaDB:', error);
    console.log('The server will continue running, but document processing will not work until ChromaDB is available.');
  });
});

export default app;
