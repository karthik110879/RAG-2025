import React, { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import { Upload, MessageCircle, FileText } from 'lucide-react';

function App() {
  const [currentView, setCurrentView] = useState('upload');
  const [documentLoaded, setDocumentLoaded] = useState(false);
  const [collectionId, setCollectionId] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDocumentUploaded = (data) => {
    setCollectionId(data.collectionId);
    setDocumentLoaded(true);
    setCurrentView('chat');
    setIsProcessing(false);
  };

  const handleProcessingStart = () => {
    setIsProcessing(true);
  };

  const handleReset = () => {
    setDocumentLoaded(false);
    setCollectionId(null);
    setCurrentView('upload');
    setIsProcessing(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-primary-600 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">RAG Document Chat</h1>
                <p className="text-sm text-gray-500">Upload and chat with your documents</p>
              </div>
            </div>
            
            {documentLoaded && (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-600">
                  Document loaded successfully
                </span>
                <button
                  onClick={handleReset}
                  className="btn-secondary text-sm"
                >
                  Upload New Document
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Navigation */}
      {documentLoaded && (
        <nav className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex space-x-8">
              <button
                onClick={() => setCurrentView('upload')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'upload'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Upload className="w-4 h-4 inline mr-2" />
                Upload
              </button>
              <button
                onClick={() => setCurrentView('chat')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  currentView === 'chat'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageCircle className="w-4 h-4 inline mr-2" />
                Chat
              </button>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentView === 'upload' && (
          <FileUpload
            onDocumentUploaded={handleDocumentUploaded}
            onProcessingStart={handleProcessingStart}
            isProcessing={isProcessing}
            documentLoaded={documentLoaded}
          />
        )}
        
        {currentView === 'chat' && documentLoaded && (
          <ChatInterface
            collectionId={collectionId}
            onReset={handleReset}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Powered by LangChain, ChromaDB, and OpenAI
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
