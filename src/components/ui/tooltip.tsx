import React, { useState, useRef, useEffect } from 'react';

interface TooltipProps {
  children: React.ReactNode;
  imagePath: string;
  className?: string;
  questionId?: string; // New: question ID to track which question the tooltip belongs to
}

export const Tooltip: React.FC<TooltipProps> = ({ children, imagePath, className, questionId }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768 || 'ontouchstart' in window);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(true);
    
    // Dispatch custom event to show mascot in the fixed container
    window.dispatchEvent(new CustomEvent('showTooltip', { 
      detail: { imagePath, questionId } 
    }));
  };

  const hideTooltip = () => {
    if (isMobile) {
      // On mobile, hide after 2 seconds
      timeoutRef.current = setTimeout(() => {
        setIsVisible(false);
        window.dispatchEvent(new CustomEvent('hideTooltip'));
      }, 2000);
    } else {
      setIsVisible(false);
      window.dispatchEvent(new CustomEvent('hideTooltip'));
    }
  };

  const handleTouch = () => {
    if (isVisible) {
      hideTooltip();
    } else {
      showTooltip();
    }
  };

  return (
    <span
      className={`cursor-pointer border-b border-dotted border-blue-500 text-blue-600 hover:text-blue-800 transition-colors ${className}`}
      onMouseEnter={!isMobile ? showTooltip : undefined}
      onMouseLeave={!isMobile ? hideTooltip : undefined}
      onTouchStart={isMobile ? handleTouch : undefined}
    >
      {children}
    </span>
  );
};