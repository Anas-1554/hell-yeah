import React, { useState, useCallback, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useFormState } from '../hooks/useFormState';
import { TextQuestion } from './questions/TextQuestion';
import { MultipleChoiceQuestion } from './questions/MultipleChoiceQuestion';
import { ContactQuestion } from './questions/ContactQuestion';
import { FileUploadQuestion } from './questions/FileUploadQuestion';
import { PartyParticles } from './ui/party-particles';
import type { FormConfig } from '../types/form';

interface DynamicFormProps {
  config: FormConfig;
  onComplete?: (answers: Record<string, any>) => void;
}

export const DynamicForm: React.FC<DynamicFormProps> = ({ config, onComplete }) => {
  const [showThankYou, setShowThankYou] = useState(false);
  const [triggerValidation, setTriggerValidation] = useState(false);
  const [showMilestoneToast, setShowMilestoneToast] = useState(false);
  const [milestoneMessage, setMilestoneMessage] = useState('');
  const [celebratedMilestones, setCelebratedMilestones] = useState<Set<number>>(new Set());
  
  // Check if we should show progress notification immediately
  const shouldShowProgressNotification = (() => {
    try {
      const saved = localStorage.getItem('naf_form_progress');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.currentQuestionIndex && parsed.currentQuestionIndex > 0;
      }
    } catch (error) {
      // Ignore errors
    }
    return false;
  })();
  
  const [showProgressNotification, setShowProgressNotification] = useState(shouldShowProgressNotification);
  
  const {
    state,
    setAnswer,
    nextQuestion,
    prevQuestion,
    submitForm,
    getCurrentQuestion,
    getProgress,
    canGoNext,
    canGoPrev,
    totalQuestions,
  } = useFormState(config);

  const currentQuestion = getCurrentQuestion();
  const progress = getProgress();
  const enableMilestoneToasts = totalQuestions > 4;

  // Notify when question changes to hide any active tooltips
  useEffect(() => {
    if (currentQuestion) {
      window.dispatchEvent(new CustomEvent('questionChanged', { 
        detail: { questionId: currentQuestion.id } 
      }));
    }
  }, [currentQuestion?.id]);

  // Auto-hide progress notification after 2.5 seconds
  useEffect(() => {
    if (showProgressNotification) {
      const timer = setTimeout(() => {
        setShowProgressNotification(false);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [showProgressNotification]);

  // Check for milestone celebrations (disabled for short forms)
  useEffect(() => {
    if (!enableMilestoneToasts) return;
    const currentProgress = Math.round(progress);
    const milestones = [25, 50, 75];
    for (const milestone of milestones) {
      if (currentProgress >= milestone && !celebratedMilestones.has(milestone)) {
        setCelebratedMilestones(prev => new Set(prev).add(milestone));
        let message = '';
        switch (milestone) {
          case 25:
            message = "Great start! You're 25% done 🚀";
            break;
          case 50:
            message = "Nice! You're halfway there 🎉";
            break;
          case 75:
            message = "Amazing! You're almost done 💪";
            break;
        }
        setMilestoneMessage(message);
        setShowMilestoneToast(true);
        setTimeout(() => setShowMilestoneToast(false), 3000);
        break; // Only show one milestone at a time
      }
    }
  }, [progress, celebratedMilestones, enableMilestoneToasts]);

  const handleNext = () => {
    if (state.currentQuestionIndex >= totalQuestions - 1) {
      // User has answered all questions, submit automatically
      handleSubmit();
    } else {
      // Check if current question is properly answered before proceeding
      if (canGoNext) {
        setTriggerValidation(false); // Reset validation trigger
        nextQuestion();
      } else {
        // Trigger validation display in components
        setTriggerValidation(true);
      }
    }
  };

  const handleAutoAdvance = () => {
    if (state.currentQuestionIndex >= totalQuestions - 1) {
      // User has answered all questions, submit automatically
      handleSubmit();
    } else {
      // Auto-advance bypasses validation since user just made a valid selection
      setTriggerValidation(false);
      nextQuestion();
    }
  };

  const handleSkip = () => {
    if (state.currentQuestionIndex >= totalQuestions - 1) {
      // User has answered all questions, submit automatically
      handleSubmit();
    } else {
      // Skip bypasses validation and doesn't set an answer
      setTriggerValidation(false);
      nextQuestion();
    }
  };

  const handleSubmit = async () => {
    await submitForm();
    setShowThankYou(true);
    onComplete?.(state.answers);
  };

  const handleAnswerChange = useCallback((value: string | string[] | number | boolean) => {
    if (currentQuestion) {
      setAnswer(currentQuestion.id, value);
    }
  }, [currentQuestion, setAnswer]);

  const renderQuestion = () => {
    if (!currentQuestion) return null;

    const commonProps = {
      question: currentQuestion,
      questionNumber: state.currentQuestionIndex + 1,
      totalQuestions,
      onNext: handleNext,
      required: currentQuestion.required !== false, // default to true unless explicitly false
      onSkip: currentQuestion.required === false ? handleSkip : undefined,
    };

    switch (currentQuestion.type) {
      case 'contact':
        return (
          <ContactQuestion
            {...commonProps}
            value={state.answers[currentQuestion.id] || {}}
            onChange={handleAnswerChange}
            triggerValidation={triggerValidation}
          />
        );

      case 'file':
        return (
          <FileUploadQuestion
            {...commonProps}
            value={state.answers[currentQuestion.id] || null}
            onChange={handleAnswerChange}
          />
        );

      case 'text':
      case 'email':
      case 'phone':
      case 'number':
      case 'date':
      case 'textarea':
        return (
          <TextQuestion
            {...commonProps}
            value={state.answers[currentQuestion.id] as string || ''}
            onChange={handleAnswerChange}
            triggerValidation={triggerValidation}
          />
        );

      case 'radio':
      case 'select':
      case 'checkbox':
      case 'multiselect':
        return (
          <MultipleChoiceQuestion
            {...commonProps}
            value={state.answers[currentQuestion.id] as string | string[] || []}
            onChange={handleAnswerChange}
            onAutoAdvance={handleAutoAdvance}
          />
        );

      default:
        return null;
    }
  };

  if (showThankYou) {
    return (
      <>
        <PartyParticles count={60} duration={4000} />
        
        <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
          {/* Logo */}
          <div className="fixed top-4 left-4 z-50">
            <a href="https://www.newamericanfunding.com?utm_source=naf-hellyeah-form" rel="noopener noreferrer">
            <img 
              src="/naf-logo.svg" 
              alt="Naf" 
              className="h-8 w-auto"
              style={{ maxHeight: '32px' }}
            />
            </a>
          </div>

          <div className="container mx-auto px-4 py-8">
            {/* Thank You Section */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center mb-12 pt-16"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.4, type: "spring", stiffness: 300 }}
                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-8"
                style={{ backgroundColor: 'var(--navy)' }}
              >
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="text-4xl md:text-5xl font-bold mb-4"
                style={{ color: 'var(--text)' }}
              >
                🎉 Awesome!
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="text-xl md:text-2xl mb-6 max-w-2xl mx-auto"
                style={{ color: 'var(--text)', opacity: 0.8 }}
              >
                {config.successMessage || 'Your brand discovery form has been submitted successfully!'}
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 1 }}
                className="text-lg mb-8"
                style={{ color: 'var(--text)', opacity: 0.7 }}
              >
                <p className="mb-2">
                  <strong>What happens next?</strong>
                </p>
                <p>
                  Our team will review your submission and reach out within <strong>1 business day</strong>.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg)' }}>
      {/* Top Header Bar */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-100">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Logo */}
          <a href="https://www.newamericanfunding.com?utm_source=naf-hellyeah-form" target="_blank" rel="noopener noreferrer">
            <img 
              src="/naf-logo.svg" 
              alt="Naf" 
              className="h-48 sm:h-48 w-auto"
              style={{ maxHeight: '32px' }}
            />
          </a>
          
          {/* Time Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium shadow-sm"
               style={{ 
                 backgroundColor: 'var(--navy)',
                 color: '#FFFFFF'
               }}>
            <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="hidden sm:inline">
              {totalQuestions - state.currentQuestionIndex <= 5 
                ? "Take less then 2 minutes"
                : "Takes less than 5 minutes"
              }
            </span>
            <span className="sm:hidden">
              &lt;2 min
            </span>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="fixed left-0 right-0 z-40" style={{ top: '57px' }}>
        <div className="h-1 bg-gray-200">
          <motion.div
            className="h-full"
            style={{ backgroundColor: 'var(--navy)' }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Progress Restoration Notification - Top Right */}
      <AnimatePresence>
        {showProgressNotification && (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 50 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg text-sm font-medium"
                 style={{ 
                   backgroundColor: 'var(--navy)',
                   color: 'var(--accent)'
                 }}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Welcome back! Your progress has been restored.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Milestone Celebration Toast (only for longer forms) */}
      <AnimatePresence>
        {enableMilestoneToasts && showMilestoneToast && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50"
          >
            <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg shadow-xl text-base font-bold"
                 style={{ 
                   backgroundColor: 'var(--navy)',
                   color: '#FFFFFF'
                 }}>
              {milestoneMessage}
            </div>
          </motion.div>
        )}
      </AnimatePresence>



      {/* Form Content */}
      <div className="relative flex items-center justify-center min-h-screen pt-32 pb-40 md:pb-48">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion?.id || 'loading'}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl px-4"
          >
            {renderQuestion()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Controls */}
      <div className="fixed left-1/2 -translate-x-1/2 z-50 mobile-edge-padding" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)', width: 'min(640px, 100vw - 24px)' }}>
        <div className="mx-auto flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={prevQuestion}
            disabled={!canGoPrev}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-black bg-white text-black hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ fontSize: '16px', minHeight: '44px' }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2 text-sm font-medium text-black">
            <span className="font-bold">{state.currentQuestionIndex + 1}</span>
            <span>/</span>
            <span>{totalQuestions}</span>
          </div>

          {/* Next/Submit Button */}
          <button
            onClick={handleNext}
            disabled={!canGoNext}
            className="flex items-center gap-2 px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            style={{ 
              backgroundColor: 'var(--navy)',
              color: '#FFFFFF',
              fontSize: '16px', 
              minHeight: '44px'
            }}
          >
            {state.currentQuestionIndex >= totalQuestions - 1 ? (
              <>
                {state.isSubmitting ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                {state.isSubmitting ? 'Submitting...' : 'Submit'}
              </>
            ) : (
              <>
                Next
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}; 