import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, RefreshCw } from 'lucide-react';
import { sendMessage } from '../services/api';

const ChatInterface = ({ collectionId, onReset }) => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef(null);
  const eventSourceRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Add welcome message
    setMessages([{
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m ready to help you with questions about your document. What would you like to know?',
      timestamp: new Date()
    }]);
  }, []);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading || isStreaming) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setIsStreaming(true);

    try {
      // Create a new message for the bot response
      const botMessage = {
        id: Date.now() + 1,
        type: 'bot',
        content: '',
        timestamp: new Date(),
        sources: []
      };

      setMessages(prev => [...prev, botMessage]);

      // Send message to backend
      const response = await sendMessage(inputMessage.trim(), collectionId);
      
      // Handle streaming response
      if (response.body) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;
            
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const data = JSON.parse(line.slice(6));
                  
                  if (data.type === 'answer') {
                    setMessages(prev => prev.map(msg => 
                      msg.id === botMessage.id 
                        ? { ...msg, content: data.answer, sources: data.sources || [] }
                        : msg
                    ));
                  } else if (data.type === 'error') {
                    setMessages(prev => prev.map(msg => 
                      msg.id === botMessage.id 
                        ? { ...msg, content: 'Sorry, I encountered an error processing your question.' }
                        : msg
                    ));
                  }
                } catch (parseError) {
                  console.error('Error parsing SSE data:', parseError);
                }
              }
            }
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === botMessage.id 
          ? { ...msg, content: 'Sorry, I encountered an error. Please try again.' }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: 1,
      type: 'bot',
      content: 'Hello! I\'m ready to help you with questions about your document. What would you like to know?',
      timestamp: new Date()
    }]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Chat with your document
          </h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={clearChat}
              className="btn-secondary text-sm"
              disabled={isLoading || isStreaming}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Clear Chat
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg px-4 py-2 ${
                  message.type === 'user'
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="flex items-start space-x-2">
                  {message.type === 'bot' && (
                    <Bot className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  {message.type === 'user' && (
                    <User className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-gray-300">
                        <p className="text-xs font-medium text-gray-600 mb-1">Sources:</p>
                        {message.sources.map((source, index) => (
                          <div key={index} className="text-xs text-gray-500 bg-gray-50 p-2 rounded mb-1">
                            {source.content}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {(isLoading || isStreaming) && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-lg px-4 py-2">
                <div className="flex items-center space-x-2">
                  <Bot className="w-5 h-5" />
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-200">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask a question about your document..."
              className="flex-1 input-field"
              disabled={isLoading || isStreaming}
            />
            <button
              type="submit"
              disabled={!inputMessage.trim() || isLoading || isStreaming}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-2">Tips for better results:</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Ask specific questions about the content</li>
          <li>• Reference specific sections or topics from the document</li>
          <li>• Try different phrasings if you don't get the answer you expect</li>
          <li>• The AI can summarize, explain, or find specific information</li>
        </ul>
      </div>
    </div>
  );
};

export default ChatInterface;
