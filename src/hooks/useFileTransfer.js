import { useState, useCallback, useRef } from 'react';

const useFileTransfer = (sendFileFunction, isConnectionReady, connectionLost, encryptionReady) => {
  // 文件传输相关状态
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState(null);
  const [fileTransferProgress, setFileTransferProgress] = useState(0);
  const [isTransferringFile, setIsTransferringFile] = useState(false);
  const [fileTransferProgressMap, setFileTransferProgressMap] = useState({});
  
  // 文件输入引用
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  
  // 处理文件选择
  const handleFileSelect = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    // 清理之前的预览URL
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    
    setSelectedFile(file);
    
    // 为图片和视频创建预览URL
    if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
      const previewUrl = URL.createObjectURL(file);
      setFilePreviewUrl(previewUrl);
    } else {
      setFilePreviewUrl(null);
    }
    
    // 清空input值，允许重复选择同一文件
    e.target.value = null;
  }, [filePreviewUrl]);
  
  // 清除选中的文件
  const clearSelectedFile = useCallback(() => {
    if (filePreviewUrl) {
      URL.revokeObjectURL(filePreviewUrl);
    }
    setSelectedFile(null);
    setFilePreviewUrl(null);
    setFileTransferProgress(0);
  }, [filePreviewUrl]);
  
  // 发送文件
  const handleSendFile = useCallback(() => {
    if (!selectedFile || !isConnectionReady || connectionLost || !encryptionReady || !sendFileFunction) {
      return;
    }
    
    setIsTransferringFile(true);
    
    sendFileFunction(selectedFile, {
      onProgress: (transferId, progress) => {
        setFileTransferProgress(progress);
        // 更新特定文件传输的进度
        setFileTransferProgressMap(prev => ({
          ...prev,
          [transferId]: progress
        }));
      },
      onComplete: (transferId) => {
        clearSelectedFile();
        setIsTransferringFile(false);
        // 传输完成后移除进度记录
        setFileTransferProgressMap(prev => {
          const newState = { ...prev };
          delete newState[transferId];
          return newState;
        });
      },
      onError: (error, transferId) => {
        console.error('发送文件失败:', error);
        setIsTransferringFile(false);
        // 传输失败后移除进度记录
        if (transferId) {
          setFileTransferProgressMap(prev => {
            const newState = { ...prev };
            delete newState[transferId];
            return newState;
          });
        }
      }
    });
  }, [selectedFile, isConnectionReady, connectionLost, encryptionReady, sendFileFunction, clearSelectedFile]);
  
  // 获取特定文件的传输进度
  const getFileProgress = useCallback((transferId) => {
    return fileTransferProgressMap[transferId] || 0;
  }, [fileTransferProgressMap]);
  
  // 格式化文件大小
  const formatFileSize = useCallback((bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }, []);
  
  return {
    // 状态
    selectedFile,
    filePreviewUrl,
    fileTransferProgress,
    isTransferringFile,
    fileTransferProgressMap,
    
    // 引用
    fileInputRef,
    imageInputRef,
    videoInputRef,
    
    // 方法
    handleFileSelect,
    clearSelectedFile,
    handleSendFile,
    getFileProgress,
    formatFileSize
  };
};

export default useFileTransfer;