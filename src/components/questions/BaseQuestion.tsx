import React from 'react';
import { motion } from 'framer-motion';
import { TooltipText } from '../ui/tooltip-text';

interface BaseQuestionProps {
  title: string;
  description?: string;
  questionNumber: number;
  totalQuestions: number;
  children: React.ReactNode;
  error?: string;
  required?: boolean;
  onSkip?: () => void;
  questionId?: string; // New: question ID for tooltip tracking
}

export const BaseQuestion: React.FC<BaseQuestionProps> = ({
  title,
  description,
  questionNumber,
  totalQuestions,
  children,
  error,
  required = true,
  onSkip,
  questionId,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex items-center justify-center p-4"
    >
      <div className="w-full max-w-2xl">
        {/* Question Number */}
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium" style={{ color: 'var(--text)', opacity: 0.7 }}>
            {questionNumber} → {totalQuestions}
          </div>
          {!required && (
            <div className="flex items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text)', opacity: 0.6 }}>
                Optional
              </span>
              {onSkip && (
                <button
                  onClick={onSkip}
                  className="px-4 py-2 text-sm font-medium border-2 rounded-lg hover:bg-gray-50 transition-colors"
                  style={{ 
                    color: 'var(--text)',
                    borderColor: 'var(--text)',
                    opacity: 0.7,
                    minHeight: '36px', // Better touch target for mobile
                    minWidth: '60px'
                  }}
                >
                  Skip
                </button>
              )}
            </div>
          )}
        </div>

        {/* Question Title */}
        <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4 leading-tight" style={{ color: 'var(--text)' }}>
          <TooltipText text={title} questionId={questionId} />
        </h1>

        {/* Question Description */}
        {description && (
          <p className="text-lg mb-8 leading-relaxed" style={{ color: 'var(--text)', opacity: 0.8 }}>
            {description}
          </p>
        )}

        {/* Question Input */}
        <div className="mb-6">
          {children}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--navy)' }}>
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </div>
        )}

        {/* Helper Text */}
        <div className="flex items-center justify-between">
          <div className="text-sm flex items-center gap-2" style={{ color: 'var(--text)', opacity: 0.6 }}>
            <span>Press Enter ↵ to continue</span>
          </div>
          <div className="text-xs flex items-center gap-1" style={{ color: 'var(--text)', opacity: 0.4 }}>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>Progress saved automatically</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}; 