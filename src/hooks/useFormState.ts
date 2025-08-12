import { useState, useEffect, useCallback, useMemo } from 'react';
import type { FormQuestion, FormData, FormState, FormConfig } from '../types/form';

const STORAGE_KEY = 'zigzy_form_progress';

// Helper functions for localStorage
const saveProgress = (state: FormState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      currentQuestionIndex: state.currentQuestionIndex,
      answers: state.answers,
      timestamp: Date.now()
    }));
  } catch (error) {
    console.warn('Failed to save form progress:', error);
  }
};

const loadProgress = (): Partial<FormState> | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const parsed = JSON.parse(saved);
    const dayInMs = 24 * 60 * 60 * 1000;
    
    // Clear progress if it's older than 24 hours
    if (Date.now() - parsed.timestamp > dayInMs) {
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    return {
      currentQuestionIndex: parsed.currentQuestionIndex || 0,
      answers: parsed.answers || {}
    };
  } catch (error) {
    console.warn('Failed to load form progress:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
};

const clearProgress = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('Failed to clear form progress:', error);
  }
};

// Helper function to clean question titles (remove tooltip markup)
const cleanQuestionTitle = (title: string): string => {
  // Remove {{text[id:X]}} markup and replace with just the text
  return title.replace(/\{\{([^[]+)\[id:\d+\]\}\}/g, '$1');
};

// Helper function to get option label by value
const getOptionLabel = (question: FormQuestion, value: string): string => {
  if (!question.options) return value;
  const option = question.options.find(opt => opt.value === value);
  return option ? option.label : value;
};

// Helper function to format answer values with proper labels
const formatAnswerValue = (question: FormQuestion, value: any): any => {
  if (!value) return null;
  
  // Handle contact question type
  if (question.type === 'contact' && typeof value === 'object' && 'methods' in value) {
    const contact = value as { methods?: string[], email?: string, phone?: string };
    return {
      methods: contact.methods?.map(method => getOptionLabel(question, method)) || [],
      email: contact.email || null,
      phone: contact.phone || null
    };
  }
  
  // Handle multiple choice questions (checkbox, multiselect)
  if ((question.type === 'checkbox' || question.type === 'multiselect') && Array.isArray(value)) {
    return value.map(val => getOptionLabel(question, val));
  }
  
  // Handle single choice questions (radio, select)
  if ((question.type === 'radio' || question.type === 'select') && question.options) {
    return getOptionLabel(question, String(value));
  }
  
  // Handle file uploads
  if (question.type === 'file' && value instanceof File) {
    return {
      name: value.name,
      size: value.size,
      type: value.type
    };
  }
  
  // Return as-is for text, textarea, number, email, phone, date
  return value;
};

export const useFormState = (config: FormConfig) => {
  const [state, setState] = useState<FormState>(() => {
    // Try to restore saved progress
    const savedProgress = loadProgress();
    return {
      currentQuestionIndex: savedProgress?.currentQuestionIndex || 0,
      answers: savedProgress?.answers || {},
      visibleQuestions: [],
      isCompleted: false,
      isSubmitting: false,
    };
  });

  // Evaluate conditional logic
  const evaluateCondition = useCallback((
    condition: NonNullable<FormQuestion['conditionalLogic']>[0],
    answers: FormData
  ): boolean => {
    const dependentValue = answers[condition.dependsOn];
    
    // Special handling for contact question type
    if (dependentValue && typeof dependentValue === 'object' && 'methods' in dependentValue) {
      const contactData = dependentValue as { methods?: string[], email?: string, phone?: string };
      
      switch (condition.operator) {
        case 'contains':
          return contactData.methods?.includes(String(condition.value)) || false;
        case 'equals':
          return contactData.methods?.join(',') === condition.value;
        case 'not_equals':
          return contactData.methods?.join(',') !== condition.value;
        case 'is_empty':
          return !contactData.methods || contactData.methods.length === 0;
        case 'is_not_empty':
          return Boolean(contactData.methods && contactData.methods.length > 0);
        default:
          return true;
      }
    }
    
    // Regular conditional logic for other question types
    switch (condition.operator) {
      case 'equals':
        return dependentValue === condition.value;
      case 'not_equals':
        return dependentValue !== condition.value;
      case 'contains':
        return String(dependentValue).includes(String(condition.value));
      case 'greater_than':
        return Number(dependentValue) > Number(condition.value);
      case 'less_than':
        return Number(dependentValue) < Number(condition.value);
      case 'is_empty':
        return !dependentValue || dependentValue === '';
      case 'is_not_empty':
        return Boolean(dependentValue) && dependentValue !== '';
      default:
        return true;
    }
  }, []);

  // Check if question should be visible
  const isQuestionVisible = useCallback((question: FormQuestion, answers: FormData): boolean => {
    if (!question.conditionalLogic || question.conditionalLogic.length === 0) {
      return true;
    }

    // All conditions must be true (AND logic)
    return question.conditionalLogic.every(condition => 
      evaluateCondition(condition, answers)
    );
  }, [evaluateCondition]);

  // Calculate visible questions using useMemo to avoid infinite loops
  const visibleQuestions = useMemo(() => {
    return config.questions
      .filter(question => isQuestionVisible(question, state.answers))
      .map(question => question.id);
  }, [config.questions, state.answers, isQuestionVisible]);

  // Update visible questions in state when they change
  useEffect(() => {
    setState(prev => {
      // Only update if the visible questions actually changed
      const questionsChanged = 
        prev.visibleQuestions.length !== visibleQuestions.length ||
        prev.visibleQuestions.some((id, index) => id !== visibleQuestions[index]);
      
      if (questionsChanged) {
        return {
          ...prev,
          visibleQuestions,
          // Adjust current index if current question is no longer visible
          currentQuestionIndex: Math.min(prev.currentQuestionIndex, visibleQuestions.length - 1)
        };
      }
      return prev;
    });
  }, [visibleQuestions]);

  // Save progress to localStorage whenever state changes
  useEffect(() => {
    if (state.answers && Object.keys(state.answers).length > 0) {
      saveProgress(state);
    }
  }, [state.currentQuestionIndex, state.answers]);

  // Set answer for a question
  const setAnswer = useCallback((questionId: string, value: string | string[] | number | boolean) => {
    setState(prev => ({
      ...prev,
      answers: {
        ...prev.answers,
        [questionId]: value
      }
    }));
  }, []);

  // Navigate to next question
  const nextQuestion = useCallback(() => {
    setState(prev => {
      const newIndex = prev.currentQuestionIndex + 1;
      const isCompleted = newIndex >= prev.visibleQuestions.length;
      
      return {
        ...prev,
        currentQuestionIndex: newIndex,
        isCompleted
      };
    });
  }, []);

  // Navigate to previous question
  const prevQuestion = useCallback(() => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: Math.max(0, prev.currentQuestionIndex - 1),
      isCompleted: false
    }));
  }, []);

  // Go to specific question
  const goToQuestion = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentQuestionIndex: Math.max(0, Math.min(index, prev.visibleQuestions.length - 1)),
      isCompleted: false
    }));
  }, []);

  // Submit form
  const submitForm = useCallback(async () => {
    setState(prev => ({ ...prev, isSubmitting: true }));
    
    try {
      // N8N webhook URL from environment variable
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL || 'https://your-n8n-instance.com/webhook/form-submission';
      
      // Create complete form data with ALL questions
      const formData: Record<string, any> = {};
      
      // Process each question in the config
      config.questions.forEach(question => {
        const questionKey = question.id;
        const questionTitle = cleanQuestionTitle(question.title);
        const answer = state.answers[question.id];
        const formattedAnswer = formatAnswerValue(question, answer);
        
        formData[questionKey] = {
          question: questionTitle,
          type: question.type,
          answer: formattedAnswer,
          required: question.required || false,
          answered: answer !== undefined && answer !== null && answer !== ''
        };
      });

      // Prepare payload for N8N
      const n8nPayload = {
        formTitle: config.title,
        submissionDate: new Date().toISOString(),
        totalQuestions: config.questions.length,
        answeredQuestions: Object.values(formData).filter(q => q.answered).length,
        data: formData
      };

      // Send to N8N webhook
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(n8nPayload)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Also send to custom endpoint if provided (for backward compatibility)
      if (config.submitEndpoint) {
        await fetch(config.submitEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(n8nPayload)
        });
      }
      
      // Clear saved progress after successful submission
      clearProgress();
      
    } catch (error) {
      console.error('Form submission error:', error);
      // You might want to show an error message to the user here
    } finally {
      setState(prev => ({ ...prev, isSubmitting: false, isCompleted: true }));
    }
  }, [config.title, config.questions, config.submitEndpoint, state.answers]);

  // Get current question
  const getCurrentQuestion = useCallback(() => {
    if (state.visibleQuestions.length === 0) return null;
    const currentQuestionId = state.visibleQuestions[state.currentQuestionIndex];
    return config.questions.find(q => q.id === currentQuestionId) || null;
  }, [state.visibleQuestions, state.currentQuestionIndex, config.questions]);

  // Get progress percentage
  const getProgress = useCallback(() => {
    if (state.visibleQuestions.length === 0) return 0;
    return Math.round(((state.currentQuestionIndex + 1) / state.visibleQuestions.length) * 100);
  }, [state.currentQuestionIndex, state.visibleQuestions.length]);

  // Check if current question is answered
  const isCurrentQuestionAnswered = useCallback(() => {
    const currentQuestion = getCurrentQuestion();
    if (!currentQuestion) return false;
    
    const answer = state.answers[currentQuestion.id];
    
    if (currentQuestion.required) {
      // Special handling for contact question type
      if (currentQuestion.type === 'contact') {
        if (!answer || typeof answer !== 'object') return false;
        const contactData = answer as { methods?: string[], email?: string, phone?: string };
        
        // Must have at least one contact method selected
        if (!contactData.methods || contactData.methods.length === 0) return false;
        
        // If email is selected, email must be provided AND valid
        if (contactData.methods.includes('email')) {
          if (!contactData.email || !contactData.email.trim()) return false;
          // Validate email format
          const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
          if (!emailRegex.test(contactData.email.trim())) return false;
        }
        
        // If phone is selected, phone must be provided AND valid
        if (contactData.methods.includes('phone')) {
          if (!contactData.phone || !contactData.phone.trim()) return false;
          // Validate phone format (at least 10 digits)
          const digitsOnly = contactData.phone.replace(/\D/g, '');
          if (digitsOnly.length < 10 || digitsOnly.length > 15) return false;
        }
        
        return true;
      }
      
      // Special handling for file question type
      if (currentQuestion.type === 'file') {
        return answer instanceof File;
      }
      
      // Special handling for number question type
      if (currentQuestion.type === 'number') {
        if (!answer || answer === '') return false;
        const numValue = parseFloat(String(answer));
        return !isNaN(numValue) && numValue > 0;
      }
      
      // URL validation for website and social profile questions
      if ((currentQuestion.id === 'website' || currentQuestion.id === 'social_profile') && answer) {
        const value = String(answer).trim();
        if (!value) return false;
        
        const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
        const socialRegex = /^(https?:\/\/)?(www\.)?(instagram\.com|tiktok\.com|youtube\.com|linkedin\.com|facebook\.com|twitter\.com|x\.com|snapchat\.com|pinterest\.com)/i;
        
        if (currentQuestion.id === 'website') {
          return urlRegex.test(value);
        } else if (currentQuestion.id === 'social_profile') {
          return socialRegex.test(value) || urlRegex.test(value);
        }
      }
      
      // Regular validation for other question types
      if (Array.isArray(answer)) {
        // Respect min/max selection rules for multi-select questions
        if (currentQuestion.validation) {
          const { min, max } = currentQuestion.validation;
          if (typeof min === 'number' && answer.length < min) return false;
          if (typeof max === 'number' && answer.length > max) return false;
        }
        return answer.length > 0;
      }
      return answer !== undefined && answer !== null && answer !== '';
    }
    
    return true;
  }, [getCurrentQuestion, state.answers]);

  return {
    state,
    setAnswer,
    nextQuestion,
    prevQuestion,
    goToQuestion,
    submitForm,
    getCurrentQuestion,
    getProgress,
    isCurrentQuestionAnswered,
    canGoNext: !state.isCompleted && isCurrentQuestionAnswered(),
    canGoPrev: state.currentQuestionIndex > 0,
    totalQuestions: state.visibleQuestions.length,
  };
}; 