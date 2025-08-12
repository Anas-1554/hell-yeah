import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export const TooltipContainer: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [imagePath, setImagePath] = useState<string>('');
  const [activeTooltipQuestionId, setActiveTooltipQuestionId] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const handleShowTooltip = (event: CustomEvent) => {
      setImagePath(event.detail.imagePath);
      setActiveTooltipQuestionId(event.detail.questionId || '');
      setIsVisible(true);
    };

    const handleHideTooltip = () => {
      setIsVisible(false);
      setActiveTooltipQuestionId('');
    };

    const handleQuestionChanged = (event: CustomEvent) => {
      const newQuestionId = event.detail.questionId;
      
      // Hide tooltip if it belongs to a different question
      if (isVisible && activeTooltipQuestionId && activeTooltipQuestionId !== newQuestionId) {
        setIsVisible(false);
        setActiveTooltipQuestionId('');
      }
    };

    window.addEventListener('showTooltip', handleShowTooltip as EventListener);
    window.addEventListener('hideTooltip', handleHideTooltip);
    window.addEventListener('questionChanged', handleQuestionChanged as EventListener);

    return () => {
      window.removeEventListener('showTooltip', handleShowTooltip as EventListener);
      window.removeEventListener('hideTooltip', handleHideTooltip);
      window.removeEventListener('questionChanged', handleQuestionChanged as EventListener);
    };
  }, [isVisible, activeTooltipQuestionId]);

  return (
    <div className={`fixed z-50 pointer-events-none ${
      isMobile 
        ? 'bottom-4 right-4' 
        : 'bottom-8 right-8'
    }`}>
      {/* Container for mascot - no border, positioned in bottom-right corner */}
      <div 
        className={`flex items-center justify-center ${
          isMobile ? 'w-64 h-64' : 'w-100 h-100'
        }`}
      >
        <AnimatePresence>
          {isVisible && imagePath && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="flex items-center justify-center w-full h-full"
            >
              <img 
                src={imagePath} 
                alt="Mascot explanation" 
                className="max-w-full max-h-full object-contain drop-shadow-lg"
                onError={() => {
                  console.warn(`Tooltip image failed to load: ${imagePath}`);
                  setIsVisible(false);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};