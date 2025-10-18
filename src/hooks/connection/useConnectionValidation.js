import { useCallback, useState } from 'react';

const ID_REGEX = /^[a-zA-Z0-9_-]{3,12}$/;

export default function useConnectionValidation() {
  const [customIdError, setCustomIdError] = useState('');
  const [targetIdError, setTargetIdError] = useState('');

  const validateCustomId = useCallback((id) => {
    const isValid = ID_REGEX.test(id);
    setCustomIdError(isValid ? '' : 'ID必须是3-12位的字母、数字、下划线或连字符');
    return isValid;
  }, []);

  const validateTargetId = useCallback((id) => {
    const isValid = ID_REGEX.test(id);
    setTargetIdError(isValid ? '' : '目标ID必须是3-12位的字母、数字、下划线或连字符');
    return isValid;
  }, []);

  const resetErrors = useCallback(() => {
    setCustomIdError('');
    setTargetIdError('');
  }, []);

  return {
    customIdError,
    targetIdError,
    validateCustomId,
    validateTargetId,
    setCustomIdError,
    setTargetIdError,
    resetErrors,
  };
}
