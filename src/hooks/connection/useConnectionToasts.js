import { useCallback, useState } from 'react';

const TOAST_DURATION = 3000;

export default function useConnectionToasts() {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const displayToast = useCallback((message) => {
    if (!message) return;
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), TOAST_DURATION);
  }, []);

  return {
    showToast,
    toastMessage,
    displayToast,
  };
}
