import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { BaseQuestion } from './BaseQuestion';
import type { FormQuestion } from '../../types/form';
import { TooltipText } from '../ui/tooltip-text';

interface FileUploadQuestionProps {
  question: FormQuestion;
  value: any;
  onChange: (value: any) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
  error?: string;
}

export const FileUploadQuestion: React.FC<FileUploadQuestionProps> = ({
  question,
  value,
  onChange,
  onNext,
  questionNumber,
  totalQuestions,
  error,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(value || null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    onChange(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    handleFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && selectedFile) {
      onNext();
    }
  };

  return (
    <BaseQuestion
      title={question.title}
      description={question.description}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      error={error}
      questionId={question.id}
    >
      <div className="space-y-6">
        {/* Helper text with tooltip support */}
        {question.placeholderTooltip && (
          <div className="text-sm text-gray-600 mb-2">
            <TooltipText text={question.placeholderTooltip} questionId={question.id} />
          </div>
        )}

        {/* File Upload Area */}
        <div
          className={`
            relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
            ${isDragOver 
              ? 'border-black bg-white bg-opacity-30' 
              : selectedFile 
                ? 'border-black bg-white bg-opacity-20' 
                : 'border-black border-opacity-30 hover:border-black hover:bg-white hover:bg-opacity-10'
            }
          `}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleUploadClick}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          role="button"
          aria-label="Upload file"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.rar,.7z,.pdf,.ai,.psd,.sketch,.fig"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {selectedFile ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-4"
            >
              {/* Success Icon */}
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto" style={{ backgroundColor: 'var(--navy)' }}>
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>

              {/* File Info */}
              <div>
                <p className="text-lg font-medium mb-1" style={{ color: 'var(--text)' }}>
                  {selectedFile.name}
                </p>
                <p className="text-sm" style={{ color: 'var(--text)', opacity: 0.7 }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveFile();
                }}
                className="text-sm hover:underline transition-colors"
                style={{ color: 'var(--navy)' }}
              >
                Remove file
              </button>
            </motion.div>
          ) : (
            <div className="space-y-4">
              {/* Upload Icon */}
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-colors`}
                style={{ 
                  backgroundColor: isDragOver ? 'var(--navy)' : 'rgba(255, 255, 255, 0.2)',
                }}
              >
                <svg 
                   className={`w-8 h-8 ${isDragOver ? 'text-white' : 'text-black'}`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              {/* Upload Text */}
              <div>
                <p className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>
                  {isDragOver ? 'Drop your file here' : 'Upload your visual brand kit'}
                </p>
                <p className="text-sm" style={{ color: 'var(--text)', opacity: 0.7 }}>
                  Drag & drop or click to browse
                </p>
                <p className="text-xs mt-2" style={{ color: 'var(--text)', opacity: 0.5 }}>
                  Supports ZIP, RAR, PDF, AI, PSD, Sketch, Figma files
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Upload Status */}
        {selectedFile && (
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-sm px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(255, 255, 255, 0.2)', color: 'var(--text)' }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: 'var(--navy)' }}></div>
              Ready to continue
            </div>
          </div>
        )}
      </div>
    </BaseQuestion>
  );
};