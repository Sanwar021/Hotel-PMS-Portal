import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'md',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthStyles = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6">
      {/* Dark backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hotel-modal-title"
        className={`relative flex max-h-[calc(100dvh-1rem)] w-full ${maxWidthStyles[maxWidth]} flex-col overflow-hidden rounded-2xl border border-hotel-line bg-hotel-panel shadow-[0_25px_70px_rgba(0,0,0,0.45)] transition-all sm:max-h-[calc(100dvh-3rem)]`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-hotel-line px-6 py-4">
          <div>
            {subtitle && <span className="kicker">{subtitle}</span>}
            <h3 id="hotel-modal-title" className="font-serif text-xl font-medium tracking-tight text-hotel-text">
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label={`Close ${title}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-hotel-muted hover:bg-hotel-surface hover:text-hotel-text transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
};

