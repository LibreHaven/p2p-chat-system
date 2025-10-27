import React from 'react';
import styled from 'styled-components';
import { Typography, message } from 'antd';
import { FiCopy } from 'react-icons/fi';

const { Text } = Typography;

const Container = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 20px;
  background-color: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  border: 1px dashed #ccc;
`;

// 移除未使用的样式组件，保留 Container 和内置 antd 的拷贝能力

const CopyableId = ({ id, onCopy }) => {
  const handleCopy = () => {
    message.success('已复制到剪贴板!');
    if (onCopy) onCopy();
  };
  
  return (
    <Container>
      <Text 
        copyable={{
          text: id,
          onCopy: handleCopy,
          icon: <FiCopy />,
          tooltips: ['复制到剪贴板', '已复制!']
        }}
        style={{
          fontFamily: 'monospace',
          fontSize: '16px',
          flex: 1
        }}
      >
        {id}
      </Text>
    </Container>
  );
};

export default CopyableId;
