import React, { useState, useRef } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { uploadDocument } from '../services/api';

const FileUpload = ({ onDocumentUploaded, onProcessingStart, isProcessing, documentLoaded }) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file) => {
    if (file.type !== 'application/pdf') {
      setError('Please select a PDF file');
      return;
    }
    
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      setError('File size must be less than 10MB');
      return;
    }

    setSelectedFile(file);
    setError(null);
    setUploadStatus(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setError(null);
    setUploadStatus('uploading');
    onProcessingStart();

    try {
      const formData = new FormData();
      formData.append('document', selectedFile);

      const response = await uploadDocument(formData);
      
      setUploadStatus('success');
      onDocumentUploaded(response.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed');
      setUploadStatus('error');
    }
  };

  const handleReset = () => {
    setSelectedFile(null);
    setUploadStatus(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">
          Upload Your Document
        </h2>
        <p className="text-lg text-gray-600">
          Upload a PDF document to start chatting with it using AI
        </p>
      </div>

      <div className="card p-8">
        {/* Upload Area */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors duration-200 ${
            dragActive
              ? 'border-primary-500 bg-primary-50'
              : selectedFile
              ? 'border-green-500 bg-green-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileInput}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            disabled={isProcessing}
          />
          
          <div className="space-y-4">
            {selectedFile ? (
              <div className="flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <Upload className="w-12 h-12 text-gray-400" />
              </div>
            )}
            
            <div>
              {selectedFile ? (
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    Drop your PDF here, or click to browse
                  </p>
                  <p className="text-sm text-gray-500">
                    Supports PDF files up to 10MB
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Upload Status */}
        {uploadStatus === 'uploading' && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-blue-500 mr-2 animate-spin" />
              <p className="text-blue-700">Processing document...</p>
            </div>
          </div>
        )}

        {uploadStatus === 'success' && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <p className="text-green-700">Document processed successfully!</p>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex justify-center space-x-4">
          {selectedFile && uploadStatus !== 'success' && (
            <button
              onClick={handleReset}
              className="btn-secondary"
              disabled={isProcessing}
            >
              Clear
            </button>
          )}
          
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isProcessing}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4 mr-2" />
                Upload & Process
              </>
            )}
          </button>
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">
          How it works:
        </h3>
        <ol className="list-decimal list-inside space-y-2 text-blue-800">
          <li>Upload a PDF document (max 10MB)</li>
          <li>The document is processed and split into chunks</li>
          <li>Chunks are converted to embeddings and stored in a vector database</li>
          <li>You can then chat with the document using AI</li>
        </ol>
      </div>
    </div>
  );
};

export default FileUpload;
