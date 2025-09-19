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
import { RetrievalQAChain } from 'langchain/chains';
import { ChatOpenAI } from '@langchain/openai';
import { Ollama } from '@langchain/community/llms/ollama';
import pdf from 'pdf-parse';
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

// Global variables for vector store and chain
let vectorStore = null;
let qaChain = null;
let currentCollection = null;

// Initialize ChromaDB
const initializeChroma = async () => {
  try {
    const embeddings = new OpenAIEmbeddings({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'text-embedding-3-small'
    });

    const chromaClient = new Chroma({
      collectionName: 'documents',
      url: 'http://localhost:8000', // Default ChromaDB URL
      embeddingFunction: embeddings
    });

    return chromaClient;
  } catch (error) {
    console.error('Error initializing ChromaDB:', error);
    throw error;
  }
};

// Parse PDF document
const parsePDF = async (filePath) => {
  try {
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
    
    // Initialize vector store with the collection
    vectorStore = new Chroma({
      collectionName: collectionName,
      url: 'http://localhost:8000',
      embeddingFunction: embeddings
    });

    // Add documents to vector store
    await vectorStore.addDocuments(documentsWithMetadata);

    // Create QA chain
    const llm = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      streaming: true
    });

    qaChain = RetrievalQAChain.fromLLM(llm, vectorStore.asRetriever({
      k: 4
    }));

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

    if (!qaChain) {
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
          // Get response from QA chain
          const response = await qaChain.call({
            query: question,
            returnSourceDocuments: true
          });

          // Send the answer
          controller.enqueue(`data: ${JSON.stringify({ 
            type: 'answer', 
            answer: response.text,
            sources: response.sourceDocuments?.map(doc => ({
              content: doc.pageContent.substring(0, 200) + '...',
              metadata: doc.metadata
            })) || []
          })}\n\n`);

          // Send end signal
          controller.enqueue(`data: ${JSON.stringify({ type: 'end' })}\n\n`);
          controller.close();
        } catch (error) {
          console.error('Chat error:', error);
          controller.enqueue(`data: ${JSON.stringify({ type: 'error', error: 'Failed to process question' })}\n\n`);
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

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(PORT, async () => {
  console.log(`RAG Server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  
  try {
    await initializeChroma();
    console.log('ChromaDB initialized successfully');
  } catch (error) {
    console.error('Failed to initialize ChromaDB:', error);
    console.log('Make sure ChromaDB is running on http://localhost:8000');
  }
});

export default app;
