import React from 'react';

export const ToastContainer = () => <div id="toast-container" />;
export const ConfirmRoot = () => <div id="confirm-root" />;

export const toast = {
  success: (msg: string, ...args: any[]) => console.log('SUCCESS:', msg, ...args),
  error: (msg: string, ...args: any[]) => console.error('ERROR:', msg, ...args),
  info: (msg: string, ...args: any[]) => console.log('INFO:', msg, ...args),
  warning: (msg: string, ...args: any[]) => console.warn('WARN:', msg, ...args),
  warn: (msg: string, ...args: any[]) => console.warn('WARN:', msg, ...args),
  dismiss: () => {}
};

export const confirm = async (options: any) => window.confirm(options?.title || options?.message || "Are you sure?");

export const useConfirm = () => {
    return { confirm, ConfirmModal: () => null };
};
