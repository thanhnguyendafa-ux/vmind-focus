import React from 'react';
import { CloseIcon } from './Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  position?: 'center' | 'bottom';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  zIndex?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, position = 'center', size = 'md', zIndex = 'z-50' }) => {
  if (!isOpen) return null;

  const isBottomSheet = position === 'bottom';

  const sizeClasses: Record<NonNullable<ModalProps['size']>, string> = {
    sm: 'max-w-lg',  // For simple confirms
    md: 'max-w-2xl',  // Default
    lg: 'max-w-4xl',  // For detailed views
    xl: 'max-w-6xl',  // For complex editors/tools
  };

  const containerClasses = isBottomSheet
    ? "flex justify-center items-end"
    : "flex justify-center items-center";
  
  const modalClasses = isBottomSheet
    ? "w-full max-w-full rounded-b-none rounded-t-lg h-[85vh] animate-slide-in-up"
    : `w-full ${sizeClasses[size]} max-h-[90vh] rounded-lg animate-scale-in`;

  return (
    <div 
      className={`fixed inset-0 bg-black bg-opacity-60 p-4 transition-opacity duration-300 ${containerClasses} ${zIndex}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        className={`bg-white shadow-xl flex flex-col transform transition-all duration-300 ${modalClasses}`}
        onClick={e => e.stopPropagation()}
      >
        <header className="flex justify-between items-center p-4 border-b border-slate-200 sticky top-0 bg-white z-10">
          <h2 id="modal-title" className="text-xl font-bold text-slate-800">{title}</h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close modal"
          >
            <CloseIcon />
          </button>
        </header>
        <main className="p-6 overflow-y-auto bg-white flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Modal;