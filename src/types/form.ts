export interface FormQuestion {
  id: string;
  type: 'text' | 'email' | 'phone' | 'select' | 'multiselect' | 'radio' | 'checkbox' | 'textarea' | 'number' | 'date' | 'contact' | 'file';
  title: string;
  description?: string;
  placeholder?: string;
  placeholderTooltip?: string; // New: tooltip for placeholder/helper text
  required?: boolean;
  options?: Array<{
    value: string;
    label: string;
    tooltip?: string; // New: tooltip for individual options
    linkTo?: string; // Optional: URL to open in modal or new tab
    linkLabel?: string; // Optional: specific substring in label to render as hyperlink
  }>;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
  conditionalLogic?: {
    dependsOn: string; // question ID
    operator: 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than' | 'is_empty' | 'is_not_empty';
    value: string | number | boolean;
  }[];
}

export interface FormData {
  [questionId: string]: string | string[] | number | boolean;
}

export interface FormState {
  currentQuestionIndex: number;
  answers: FormData;
  visibleQuestions: string[];
  isCompleted: boolean;
  isSubmitting: boolean;
}

export interface FormConfig {
  title: string;
  description?: string;
  questions: FormQuestion[];
  submitEndpoint?: string;
  successMessage?: string;
  brandColor?: string;
} 