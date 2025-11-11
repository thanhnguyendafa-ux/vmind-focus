import React from 'react';
import Modal from './Modal';
import Icon from './Icon';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warning?: string;
  confirmText?: string;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warning,
  confirmText = 'Confirm',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="p-6">
        <p className="text-secondary-600 dark:text-secondary-300 mb-4">{message}</p>
        
        {warning && (
          <div className="bg-error-500/10 dark:bg-error-900/20 p-3 rounded-md mb-6">
            <p className="text-sm text-error-700 dark:text-error-300">
              <strong>Warning:</strong> {warning}
            </p>
          </div>
        )}

        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose} 
            className="bg-surface dark:bg-secondary-700 text-text-main dark:text-secondary-100 font-semibold px-4 py-2 rounded-md hover:bg-secondary-50 dark:hover:bg-secondary-600 border border-secondary-300 dark:border-secondary-600 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="bg-error-600 text-white font-semibold px-6 py-2 rounded-md hover:bg-error-700 transition-colors"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmationModal;