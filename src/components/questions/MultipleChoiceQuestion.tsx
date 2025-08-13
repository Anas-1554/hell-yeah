import React, { useEffect, useState } from 'react';
import { BaseQuestion } from './BaseQuestion';
import type { FormQuestion } from '../../types/form';
import { TooltipText } from '../ui/tooltip-text';

interface MultipleChoiceQuestionProps {
  question: FormQuestion;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  onNext: () => void;
  questionNumber: number;
  totalQuestions: number;
  error?: string;
  onAutoAdvance?: () => void;
  required?: boolean;
  onSkip?: () => void;
}

export const MultipleChoiceQuestion: React.FC<MultipleChoiceQuestionProps> = ({
  question,
  value,
  onChange,
  onNext,
  questionNumber,
  totalQuestions,
  error,
  onAutoAdvance,
  required = true,
  onSkip,
}) => {
  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    if (Array.isArray(value)) {
      return value;
    }
    return value ? [value] : [];
  });

  const isMultiSelect = question.type === 'checkbox' || question.type === 'multiselect';
  const minSelections = question.validation?.min ?? (question.required && isMultiSelect ? 1 : 0);

  // Update parent when selection changes
  useEffect(() => {
    if (isMultiSelect) {
      onChange(selectedValues);
    } else {
      onChange(selectedValues[0] || '');
    }
  }, [selectedValues, isMultiSelect, onChange]);

  const handleSelect = (optionValue: string) => {
    if (isMultiSelect) {
      setSelectedValues((prev: string[]) => {
        const isSelected = prev.includes(optionValue);
        if (isSelected) {
          return prev.filter((v: string) => v !== optionValue);
        } else {
          return [...prev, optionValue];
        }
      });
    } else {
      setSelectedValues([optionValue]);
      // Auto-advance for single-select questions
      setTimeout(() => {
        onAutoAdvance?.();
      }, 300);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, optionValue: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(optionValue);
    }
  };

  const isSelected = (optionValue: string) => selectedValues.includes(optionValue);

  const getOptionStyles = (optionValue: string) => ({
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    margin: '12px 0',
    backgroundColor: isSelected(optionValue) ? 'var(--navy)' : '#FFFFFF',
    color: isSelected(optionValue) ? '#FFFFFF' : 'var(--text)',
    border: `2px solid ${isSelected(optionValue) ? 'var(--navy)' : 'var(--text)'}`,
    borderRadius: '12px',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    minHeight: '64px', // Better touch target for mobile
    transition: 'all 0.2s ease',
    textAlign: 'left' as const,
    outline: 'none',
  });

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
        {question.options?.map((option) => {
          const selected = isSelected(option.value);
          const anchorColor = selected ? 'var(--accent)' : 'var(--navy)';
          const renderLabel = () => {
            if (option.tooltip) {
              return <TooltipText text={option.label} tooltip={option.tooltip} questionId={question.id} />;
            }
            if (option.linkTo) {
              const full = option.label;
              const linkText = option.linkLabel || option.label;
              // If linkLabel provided and is a substring, split around it for inline anchor
              if (option.linkLabel && full.includes(option.linkLabel)) {
                const parts = full.split(option.linkLabel);
                return (
                  <>
                    {parts[0]}
                    <a
                      href={option.linkTo}
                      onClick={(e) => {
                        e.preventDefault();
                        window.open(option.linkTo, '_blank', 'noopener,noreferrer');
                      }}
                      className="underline"
                      style={{ color: anchorColor }}
                    >
                      {option.linkLabel}
                    </a>
                    {parts[1]}
                  </>
                );
              }
              // Fallback: entire label as a link
              return (
                <a
                  href={option.linkTo}
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(option.linkTo, '_blank', 'noopener,noreferrer');
                  }}
                  className="underline"
                  style={{ color: anchorColor }}
                >
                  {linkText}
                </a>
              );
            }
            return option.label;
          };

          return (
          <button
              key={option.value}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(e) => handleKeyDown(e, option.value)}
              style={getOptionStyles(option.value)}
              tabIndex={0}
              aria-pressed={isSelected(option.value)}
              role={isMultiSelect ? 'checkbox' : 'radio'}
            >
              <div className="flex items-center gap-3 w-full">
                {/* Selection Indicator */}
                <div className="flex-shrink-0">
                  {isMultiSelect ? (
                    <div className={`w-5 h-5 border-2 rounded ${
                      isSelected(option.value) 
                        ? 'bg-white border-white' 
                        : 'border-current bg-transparent'
                    } flex items-center justify-center`}>
                      {isSelected(option.value) && (
                        <svg className="w-3 h-3" style={{ color: 'var(--navy)' }} fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ) : (
                    <div className={`w-5 h-5 border-2 rounded-full ${
                      isSelected(option.value)
                        ? 'bg-white border-white'
                        : 'border-current bg-transparent'
                    } flex items-center justify-center`}>
                      {isSelected(option.value) && (
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--navy)' }}></div>
                      )}
                    </div>
                  )}
                </div>
                
                {/* Option Label (supports tooltip and inline link) */}
                <span className="flex-grow text-left">
                  {renderLabel()}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Multi-select Continue Button */}
      {isMultiSelect && selectedValues.length >= (minSelections || 0) && (
        <div className="mt-6">
          <button
            onClick={onNext}
            className="w-full py-3 px-6 rounded-lg font-medium transition-colors"
            style={{
              backgroundColor: 'var(--navy)',
              color: '#FFFFFF',
              minHeight: '56px',
            }}
          >
            Continue
          </button>
        </div>
      )}
    </BaseQuestion>
  );
};