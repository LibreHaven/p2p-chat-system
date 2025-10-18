import { useCallback, useRef, useState } from 'react';

const DEFAULT_STATUS = {
  isFile: false,
  isFileReceiving: false,
};

const mergeMessageFields = (base, extra) => ({ ...base, ...extra });

export default function useMessageLog(peerId) {
  const idCounterRef = useRef(Date.now());
  const [messages, setMessages] = useState([]);

  const nextId = useCallback(() => {
    idCounterRef.current += 1;
    return idCounterRef.current;
  }, []);

  const buildMessage = useCallback(
    (payload) => {
      const { sender, content, timestamp = Date.now(), ...rest } = payload;
      return mergeMessageFields(
        {
          id: nextId(),
          sender,
          content,
          timestamp,
          isSelf: sender === peerId,
          ...DEFAULT_STATUS,
        },
        rest,
      );
    },
    [nextId, peerId],
  );

  const appendMessage = useCallback(
    (payload) => {
      setMessages((prev) => [...prev, buildMessage(payload)]);
    },
    [buildMessage],
  );

  const updateMessageByTransferId = useCallback((transferId, updater) => {
    setMessages((prev) =>
      prev.map((message) => (message.transferId === transferId ? updater({ ...message }) : message)),
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    idCounterRef.current = Date.now();
  }, []);

  return {
    messages,
    appendMessage,
    updateMessageByTransferId,
    clearMessages,
  };
}
