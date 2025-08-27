import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VerificationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onVerified: (token: string) => void;
    onError: (error: string) => void;
}

declare global {
    interface Window {
        turnstile: {
            render: (element: string | HTMLElement, options: {
                sitekey: string;
                callback: (token: string) => void;
                'error-callback': (error: string) => void;
                theme?: 'light' | 'dark' | 'auto';
                size?: 'normal' | 'compact';
            }) => string;
            reset: (widgetId?: string) => void;
            remove: (widgetId?: string) => void;
        };
    }
}

const VerificationDialog: React.FC<VerificationDialogProps> = ({
    isOpen,
    onClose,
    onVerified,
    onError
}) => {
    const turnstileRef = useRef<HTMLDivElement>(null);
    const [widgetId, setWidgetId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (isOpen && turnstileRef.current && window.turnstile && !widgetId) {
            setIsLoading(true);

            const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
            console.log('🔑 Turnstile Site Key:', siteKey ? `${siteKey.substring(0, 15)}...` : 'NOT SET');
            console.log('🌐 Current domain:', window.location.hostname);
            console.log('📦 Turnstile loaded:', !!window.turnstile);

            if (!siteKey) {
                onError('Turnstile site key not configured');
                return;
            }

            // Clear any existing content in the container
            if (turnstileRef.current) {
                turnstileRef.current.innerHTML = '';
            }

            try {
                const id = window.turnstile.render(turnstileRef.current, {
                    sitekey: siteKey,
                    callback: (token: string) => {
                        console.log('✅ Turnstile success! Token received:', token.substring(0, 20) + '...');
                        setIsLoading(false);
                        onVerified(token);
                    },
                    'error-callback': (error: string) => {
                        console.error('❌ Turnstile error:', error);
                        setIsLoading(false);
                        onError(error || 'Verification failed');
                    },
                    theme: 'auto',
                    size: 'normal'
                });
                setWidgetId(id);
                console.log('🎯 Turnstile widget rendered with ID:', id);
            } catch (error) {
                console.error('💥 Failed to render Turnstile:', error);
                setIsLoading(false);
                onError('Failed to load verification');
            }
        }

        return () => {
            if (widgetId && window.turnstile) {
                try {
                    console.log('🧹 Cleaning up Turnstile widget:', widgetId);
                    window.turnstile.remove(widgetId);
                    setWidgetId(null);
                } catch (error) {
                    console.warn('Failed to remove Turnstile widget:', error);
                }
            }
        };
    }, [isOpen, widgetId]);

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="bg-white rounded-lg shadow-xl max-w-md w-full p-6"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-2">
                            Verify You're Human
                        </h3>
                        <p className="text-gray-600 text-sm">
                            Please complete the verification below to submit your form
                        </p>
                    </div>

                    <div className="flex justify-center mb-6">
                        {isLoading && (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                <span className="ml-3 text-gray-600">Loading verification...</span>
                            </div>
                        )}
                        <div ref={turnstileRef} className={isLoading ? 'hidden' : 'block'} />
                    </div>

                    <div className="flex justify-end">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

export default VerificationDialog;