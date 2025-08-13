import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BaseQuestion } from './BaseQuestion';
import type { FormQuestion } from '../../types/form';
import { TooltipText } from '../ui/tooltip-text';

interface ContactQuestionProps {
  question: FormQuestion;
  value: any;
  onChange: (value: any) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
  error?: string;
  triggerValidation?: boolean;
}

export const ContactQuestion: React.FC<ContactQuestionProps> = ({
  question,
  value,
  onChange,
  onNext,
  questionNumber,
  totalQuestions,
  error,
  triggerValidation,
}) => {
  const [contactMethods, setContactMethods] = useState<string[]>(value?.methods || []);
  const [email, setEmail] = useState<string>(value?.email || '');
  const [phone, setPhone] = useState<string>(value?.phone || '');
  const [showValidationError, setShowValidationError] = useState(false);

  // Validation functions
  const validateEmail = (email: string): string => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email.trim())) {
      return 'Please enter a valid email address (e.g., you@example.com)';
    }
    return '';
  };

  const validatePhone = (phone: string): string => {
    if (!phone.trim()) return 'Phone number is required';
    // Remove all non-digit characters to check length
    const digitsOnly = phone.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return 'Please enter a complete phone number';
    }
    if (digitsOnly.length > 15) {
      return 'Phone number is too long';
    }
    return '';
  };

  const getValidationErrors = (): string[] => {
    const errors: string[] = [];
    
    if (contactMethods.includes('email')) {
      const emailError = validateEmail(email);
      if (emailError) errors.push(emailError);
    }
    
    if (contactMethods.includes('phone')) {
      const phoneError = validatePhone(phone);
      if (phoneError) errors.push(phoneError);
    }
    
    return errors;
  };

  // Update parent state when any field changes
  useEffect(() => {
    onChange({
      methods: contactMethods,
      email: contactMethods.includes('email') ? email : '',
      phone: contactMethods.includes('phone') ? phone : '',
    });
    // Clear validation error when user starts typing
    if (showValidationError) {
      setShowValidationError(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contactMethods, email, phone]);

  // Trigger validation when parent requests it
  useEffect(() => {
    if (triggerValidation && contactMethods.length > 0) {
      const errors = getValidationErrors();
      if (errors.length > 0) {
        setShowValidationError(true);
      }
    }
  }, [triggerValidation, contactMethods, getValidationErrors]);

  const handleMethodToggle = (method: string) => {
    setContactMethods(prev => 
      prev.includes(method)
        ? prev.filter(m => m !== method)
        : [...prev, method]
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && contactMethods.length > 0) {
      const errors = getValidationErrors();
      if (errors.length === 0) {
        onNext();
      } else {
        setShowValidationError(true);
      }
    }
  };

  const validationErrors = showValidationError ? getValidationErrors() : [];

  return (
    <BaseQuestion
      title={question.title}
      description={question.description}
      questionNumber={questionNumber}
      totalQuestions={totalQuestions}
      error={error}
      required={question.required}
      questionId={question.id}
    >
      <div className="space-y-6">
        {/* Helper text with tooltip support */}
        {question.placeholderTooltip && (
          <div className="text-sm text-gray-600 mb-2">
            <TooltipText text={question.placeholderTooltip} questionId={question.id} />
          </div>
        )}

        {/* Contact Method Selection */}
        <div className="space-y-3">
          {question.options?.map((option, index) => {
            const isSelected = contactMethods.includes(option.value);
            const letter = String.fromCharCode(65 + index); // A, B, C, etc.

            return (
              <motion.div
                key={option.value}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                 className={`
                  relative flex items-center p-5 rounded-lg border-2 cursor-pointer transition-all
                  ${isSelected 
                    ? 'border-black bg-white bg-opacity-20' 
                    : 'border-black border-opacity-30 hover:border-black hover:bg-white hover:bg-opacity-10'
                  }
                `}
                onClick={() => handleMethodToggle(option.value)}
                onKeyDown={handleKeyDown}
                tabIndex={0}
                role="checkbox"
                aria-checked={isSelected}
              >
                {/* Option Letter */}
                 <div className={`
                   flex items-center justify-center w-9 h-9 rounded-md text-sm font-bold mr-4
                  ${isSelected 
                    ? 'text-white' 
                    : 'bg-white bg-opacity-20 text-black'
                  }
                `}
                style={{ backgroundColor: isSelected ? 'var(--navy)' : undefined }}
                >
                  {letter}
                </div>

                {/* Option Content */}
                <div className="flex-1">
                  <span className="text-lg font-medium" style={{ color: 'var(--text)' }}>
                    {option.tooltip ? (
                      <TooltipText text={option.label} tooltip={option.tooltip} />
                    ) : (
                      option.label
                    )}
                  </span>
                </div>

                {/* Checkbox */}
                 <div className={`
                   w-6 h-6 rounded border-2 transition-all
                  ${isSelected 
                    ? 'border-black' 
                    : 'border-black border-opacity-30'
                  }
                `}
                style={{ backgroundColor: isSelected ? 'var(--navy)' : 'transparent' }}
                >
                  {isSelected && (
                    <svg className="w-3.5 h-3.5 text-white mx-auto mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Dynamic Contact Fields */}
        <AnimatePresence>
          {contactMethods.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4 border-t border-slate-200 pt-6"
            >
              {/* Email Field */}
              {contactMethods.includes('email') && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.1 }}
                >
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    Your email address *
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="you@example.com"
                    className="w-full text-lg font-medium bg-transparent border-0 border-b-2 border-black focus:border-black focus:outline-none py-3 px-0 transition-colors"
                    style={{ fontSize: '18px', color: 'var(--text)' }}
                  />
                </motion.div>
              )}

              {/* Phone Field */}
              {contactMethods.includes('phone') && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: 0.2 }}
                >
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text)' }}>
                    Your phone number *
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="+1 (555) 123-4567"
                    className="w-full text-lg font-medium bg-transparent border-0 border-b-2 border-black focus:border-black focus:outline-none py-3 px-0 transition-colors"
                    style={{ fontSize: '18px', color: 'var(--text)' }}
                    inputMode="tel"
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Validation Message */}
        {showValidationError && validationErrors.length > 0 && (
          <div className="space-y-1">
            {validationErrors.map((error, index) => (
              <div key={index} className="text-sm flex items-center gap-2" style={{ color: 'var(--navy)' }}>
                <span style={{ color: 'var(--navy)' }}>●</span>
                {error}
              </div>
            ))}
          </div>
        )}
      </div>
    </BaseQuestion>
  );
};