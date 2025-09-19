# RAG Document Chat Application

A full-stack RAG (Retrieval-Augmented Generation) application that allows users to upload PDF documents and chat with them using AI. Built with React, Express, LangChain, and ChromaDB.

## Features

- 📄 PDF document upload and processing
- 🤖 AI-powered document Q&A using OpenAI GPT models
- 💬 Real-time streaming chat interface
- 🔍 Vector-based document search and retrieval
- 📊 Document chunking and embedding generation
- 🎨 Modern, responsive UI with Tailwind CSS

## Tech Stack

### Backend
- **Express.js** - Web framework
- **Multer** - File upload handling
- **LangChain** - Document processing and AI chains
- **ChromaDB** - Vector database for embeddings
- **OpenAI** - Embeddings and chat models
- **pdf-parse** - PDF text extraction

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons

## Prerequisites

Before running the application, make sure you have:

1. **Node.js** (v16 or higher)
2. **ChromaDB** running locally
3. **OpenAI API key**

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd ai-RAG2
```

### 2. Install ChromaDB
```bash
# Using pip
pip install chromadb

# Or using Docker
docker run -p 8000:8000 chromadb/chroma
```

### 3. Set up the backend
```bash
cd server
npm install
```

Create a `.env` file in the server directory:
```env
OPENAI_API_KEY=your_openai_api_key_here
PORT=3001
NODE_ENV=development
CHROMA_PERSIST_DIRECTORY=./chroma_db
```

### 4. Set up the frontend
```bash
cd ../client
npm install
```

## Running the Application

### 1. Start ChromaDB
Make sure ChromaDB is running on `http://localhost:8000`

### 2. Start the backend server
```bash
cd server
npm run dev
```
The server will start on `http://localhost:3001`

### 3. Start the frontend
```bash
cd client
npm run dev
```
The frontend will start on `http://localhost:3000`

## Usage

1. **Upload Document**: Go to the upload page and select a PDF file (max 10MB)
2. **Wait for Processing**: The document will be processed, chunked, and embedded
3. **Start Chatting**: Once processed, you can ask questions about the document
4. **Get AI Responses**: The AI will provide answers based on the document content

## API Endpoints

### Backend API

- `GET /health` - Health check
- `POST /upload` - Upload and process PDF document
- `POST /chat` - Send message and get AI response (streaming)
- `GET /collection/:id` - Get collection information

### Example API Usage

```javascript
// Upload document
const formData = new FormData();
formData.append('document', file);
const response = await fetch('http://localhost:3001/upload', {
  method: 'POST',
  body: formData
});

// Send chat message
const response = await fetch('http://localhost:3001/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    question: 'What is this document about?',
    collectionId: 'your-collection-id'
  })
});
```

## Configuration

### Environment Variables

#### Backend (.env)
- `OPENAI_API_KEY` - Your OpenAI API key
- `PORT` - Server port (default: 3001)
- `NODE_ENV` - Environment (development/production)
- `CHROMA_PERSIST_DIRECTORY` - ChromaDB storage directory

### Model Configuration

The application uses:
- **Embeddings**: `text-embedding-3-small` (OpenAI)
- **Chat Model**: `gpt-4o-mini` (OpenAI)
- **Chunk Size**: 1000 tokens with 200 token overlap

## Project Structure

```
ai-RAG2/
├── server/                 # Backend Express server
│   ├── server.js          # Main server file
│   ├── package.json       # Backend dependencies
│   └── .env.example       # Environment variables template
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── services/      # API services
│   │   └── App.jsx        # Main app component
│   ├── package.json       # Frontend dependencies
│   └── vite.config.js     # Vite configuration
└── README.md              # This file
```

## Troubleshooting

### Common Issues

1. **ChromaDB Connection Error**
   - Ensure ChromaDB is running on port 8000
   - Check if the service is accessible

2. **OpenAI API Errors**
   - Verify your API key is correct
   - Check your OpenAI account credits

3. **File Upload Issues**
   - Ensure file is PDF format
   - Check file size (max 10MB)
   - Verify server is running

4. **CORS Errors**
   - Make sure both frontend and backend are running
   - Check if ports are correct (3000 for frontend, 3001 for backend)

## Development

### Adding New Features

1. **Backend**: Add new routes in `server.js`
2. **Frontend**: Create components in `client/src/components/`
3. **API**: Update services in `client/src/services/api.js`

### Code Style

- Use ES6+ features
- Follow React best practices
- Use Tailwind CSS for styling
- Add proper error handling

## License

This project is licensed under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the API documentation
3. Create an issue in the repository
