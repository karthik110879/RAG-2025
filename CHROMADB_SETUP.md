# ChromaDB Setup Guide for Node.js/Express

## 🚀 **Quick Start**

### **Method 1: Using the Startup Script (Recommended)**
```bash
# Run this to start both ChromaDB and Express server
start-chromadb-server.bat
```

### **Method 2: Manual Setup**

#### **Step 1: Start ChromaDB**
```bash
# Start ChromaDB server
python -m chromadb run --host localhost --port 8000
```

#### **Step 2: Start Express Server**
```bash
cd server
npm run dev
```

#### **Step 3: Start React Frontend**
```bash
cd client
npm run dev
```

## 🔧 **How ChromaDB Works with Node.js**

### **Architecture**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │  Express Server │    │   ChromaDB      │
│   (Port 3000)   │◄──►│   (Port 3001)   │◄──►│   (Port 8000)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### **ChromaDB Integration**
- **ChromaDB runs as a separate Python service** on port 8000
- **Express server connects to ChromaDB** via HTTP API
- **LangChain handles the integration** between Node.js and ChromaDB

## 📋 **Environment Variables**

Create `server/.env`:
```env
# OpenAI configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server configuration
PORT=3001
NODE_ENV=development

# ChromaDB configuration
CHROMA_PERSIST_DIRECTORY=./chroma_db
```

## 🛠 **Troubleshooting**

### **ChromaDB Not Starting**
```bash
# Check if Python is installed
python --version

# Install ChromaDB
pip install chromadb

# Start ChromaDB
python -m chromadb run --host localhost --port 8000
```

### **Connection Issues**
1. **Check ChromaDB is running**: `curl http://localhost:8000/api/v1/heartbeat`
2. **Check Express server**: `curl http://localhost:3001/health`
3. **Check logs** in both terminal windows

### **Common Errors**

#### **"Cannot read properties of undefined (reading 'numDimensions')"**
- **Cause**: ChromaDB not running or connection failed
- **Solution**: Start ChromaDB first, then restart Express server

#### **"ECONNREFUSED"**
- **Cause**: ChromaDB not running on port 8000
- **Solution**: Start ChromaDB with `python -m chromadb run --host localhost --port 8000`

#### **"Module not found: chromadb"**
- **Cause**: ChromaDB not installed
- **Solution**: `pip install chromadb`

## 🔄 **Development Workflow**

1. **Start ChromaDB**: `python -m chromadb run --host localhost --port 8000`
2. **Start Express**: `cd server && npm run dev`
3. **Start React**: `cd client && npm run dev`
4. **Upload PDF**: Use the React interface
5. **Chat**: Ask questions about your document

## 📚 **ChromaDB API Endpoints**

- **Health Check**: `GET http://localhost:8000/api/v1/heartbeat`
- **Collections**: `GET http://localhost:8000/api/v1/collections`
- **Add Documents**: `POST http://localhost:8000/api/v1/collections/{collection}/add`

## 🎯 **Key Features**

- ✅ **Vector Storage**: Documents stored as embeddings
- ✅ **Similarity Search**: Find relevant document chunks
- ✅ **Metadata Support**: Store document metadata
- ✅ **Collection Management**: Organize documents by collection
- ✅ **HTTP API**: Easy integration with Node.js

## 🔍 **Testing the Setup**

1. **Test ChromaDB**: `curl http://localhost:8000/api/v1/heartbeat`
2. **Test Express**: `curl http://localhost:3001/health`
3. **Test Upload**: Upload a PDF via React interface
4. **Test Chat**: Ask questions about the uploaded document

## 📝 **Notes**

- ChromaDB data is persisted in `./chroma_db` directory
- Each document gets its own collection
- Collections are automatically created when documents are uploaded
- The system handles document chunking and embedding automatically
