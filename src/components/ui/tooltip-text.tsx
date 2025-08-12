import React from 'react';
import { parseTooltipText, hasTooltips } from '../../lib/tooltipParser';
import { Tooltip } from './tooltip';

interface TooltipTextProps {
  text: string;
  className?: string;
  tooltip?: string; // New: direct tooltip text support
  questionId?: string; // New: question ID for tracking
}

export const TooltipText: React.FC<TooltipTextProps> = ({ text, className, tooltip, questionId }) => {
  // If direct tooltip is provided, use it
  if (tooltip) {
    return (
      <Tooltip imagePath={tooltip} questionId={questionId}>
        <span className={className}>{text}</span>
      </Tooltip>
    );
  }

  // If no tooltips found in text, return plain text
  if (!hasTooltips(text)) {
    return <span className={className}>{text}</span>;
  }

  // Parse the text into segments
  const segments = parseTooltipText(text);

  return (
    <span className={className}>
      {segments.map((segment, index) => {
        if (segment.type === 'tooltip' && segment.imagePath) {
          return (
            <Tooltip 
              key={index} 
              imagePath={segment.imagePath}
              questionId={questionId}
            >
              {segment.content}
            </Tooltip>
          );
        }
        
        return (
          <span key={index}>{segment.content}</span>
        );
      })}
    </span>
  );
}; 