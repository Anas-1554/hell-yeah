import React, { useState, useEffect, useRef } from 'react';
import { BaseQuestion } from './BaseQuestion';
import type { FormQuestion } from '../../types/form';
import { TooltipText } from '../ui/tooltip-text';

interface TextQuestionProps {
  question: FormQuestion;
  value: string;
  onChange: (value: string) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
  triggerValidation?: boolean;
  required?: boolean;
  onSkip?: () => void;
}

export const TextQuestion: React.FC<TextQuestionProps> = ({
  question,
  value,
  onChange,
  onNext,
  questionNumber,
  totalQuestions,
  triggerValidation,
  required = true,
  onSkip,
}) => {
  const [error, setError] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Auto-focus the input when the component mounts
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Clear error when value changes
  useEffect(() => {
    if (value && error) {
      setError('');
    }
  }, [value, error]);

  // Validate when triggerValidation changes
  useEffect(() => {
    if (triggerValidation && required) {
      const validationError = validateInput(value);
      setError(validationError);
    }
  }, [triggerValidation, value, required]);

  const validateInput = (value: string): string => {
    // Skip validation for optional questions
    if (!required && !value) {
      return '';
    }

    if (required && !value.trim()) {
      return 'This field is required';
    }

    if (question.validation) {
      const { min, max, pattern, message } = question.validation;

      if (min && value.length < min) {
        return message || `Minimum ${min} characters required`;
      }

      if (max && value.length > max) {
        return message || `Maximum ${max} characters allowed`;
      }

      if (pattern) {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) {
          return message || 'Invalid format';
        }
      }
    }

    // Type-specific validation
    switch (question.type) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailRegex.test(value)) {
          return 'Please enter a valid email address';
        }
        break;

      case 'phone':
        // Remove all non-digit characters for validation
        const digitsOnly = value.replace(/\D/g, '');
        if (value && (digitsOnly.length < 10 || digitsOnly.length > 15)) {
          return 'Please enter a valid phone number';
        }
        break;

      case 'number':
        const num = parseFloat(value);
        if (value && (isNaN(num) || !isFinite(num))) {
          return 'Please enter a valid number';
        }
        break;

      case 'date':
        const date = new Date(value);
        if (value && isNaN(date.getTime())) {
          return 'Please enter a valid date';
        }
        break;
    }

    return '';
  };

  const getInputType = () => {
    switch (question.type) {
      case 'email':
        return 'email';
      case 'phone':
        return 'tel';
      case 'number':
        return 'number';
      case 'date':
        return 'date';
      default:
        return 'text';
    }
  };

  // Input mode is handled directly in the input element


  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      const validationError = validateInput(value);
      if (validationError && required) {
        setError(validationError);
      } else {
        onNext();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const inputStyles: React.CSSProperties = {
    width: '100%',
    fontSize: '18px',
    padding: '16px 20px',
    border: `2px solid ${error ? 'var(--navy)' : (isFocused ? 'var(--navy)' : 'var(--text)')}`,
    borderRadius: '12px',
    backgroundColor: '#FFFFFF',
    color: 'var(--text)',
    outline: 'none',
    transition: 'border-color 0.2s ease',
    minHeight: '64px', // Better touch target for mobile
    appearance: 'none' as any,
    WebkitAppearance: 'none' as any,
    MozAppearance: 'textfield' as any,
  };

  const textareaStyles: React.CSSProperties = {
    ...inputStyles,
    resize: 'vertical',
    minHeight: '120px',
    fontFamily: 'inherit',
  };

  return (
    <BaseQuestion
      title={question.title}
      description={question.description}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      error={error}
      required={required}
      onSkip={onSkip}
      questionId={question.id}
    >
      <div className="space-y-2">
        {/* Helper text with tooltip support */}
        {question.placeholderTooltip && (
          <div className="text-sm text-gray-600 mb-2">
            <TooltipText text={question.placeholderTooltip} questionId={question.id} />
          </div>
        )}
        
        {question.type === 'textarea' ? (
          <textarea
            ref={inputRef as React.RefObject<HTMLTextAreaElement>}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={question.placeholder || `Type your answer here...`}
            style={textareaStyles}
            rows={4}
          />
        ) : (
          <input
            ref={inputRef as React.RefObject<HTMLInputElement>}
            type={getInputType()}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            placeholder={question.placeholder || `Type your answer here...`}
            style={inputStyles}
            inputMode={question.type === 'phone' ? 'tel' : question.type === 'number' ? 'numeric' : 'text'}
          />
        )}
      </div>
    </BaseQuestion>
  );
};