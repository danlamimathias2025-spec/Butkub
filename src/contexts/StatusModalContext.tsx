import React, { createContext, useContext, useState, ReactNode } from 'react';
import StatusOverlay from '../components/StatusOverlay';

export interface StatusModalOptions {
  type: 'success' | 'error';
  title: string;
  message?: string;
  autoCloseDuration?: number;
  onClose?: () => void;
}

interface StatusModalContextType {
  showStatusModal: (options: StatusModalOptions) => void;
  closeStatusModal: () => void;
}

const StatusModalContext = createContext<StatusModalContextType | undefined>(undefined);

export const StatusModalProvider = ({ children }: { children: ReactNode }) => {
  const [modalState, setModalState] = useState<StatusModalOptions & { isOpen: boolean }>({
    isOpen: false,
    type: 'success',
    title: '',
    message: '',
    autoCloseDuration: 3000,
  });

  const showStatusModal = (options: StatusModalOptions) => {
    setModalState({
      ...options,
      isOpen: true,
    });
  };

  const closeStatusModal = () => {
    if (modalState.isOpen && modalState.onClose) {
      modalState.onClose();
    }
    setModalState((prev) => ({ ...prev, isOpen: false }));
  };

  return (
    <StatusModalContext.Provider value={{ showStatusModal, closeStatusModal }}>
      {children}
      <StatusOverlay
        isOpen={modalState.isOpen}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        autoCloseDuration={modalState.autoCloseDuration}
        onClose={closeStatusModal}
      />
    </StatusModalContext.Provider>
  );
};

export const useStatusModal = () => {
  const context = useContext(StatusModalContext);
  if (!context) {
    throw new Error('useStatusModal must be used within a StatusModalProvider');
  }
  return context;
};
