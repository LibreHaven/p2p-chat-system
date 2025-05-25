import React from 'react';
import styled, { keyframes } from 'styled-components';
import { FiAlertCircle } from 'react-icons/fi';

const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const Container = styled.div`
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: white;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  padding: 15px 20px;
  display: flex;
  align-items: center;
  z-index: 1000;
  animation: ${fadeIn} 0.3s ease;
  max-width: 90%;
  width: auto;
`;

const IconWrapper = styled.div`
  color: ${props => props.$type === 'error' ? '#e74c3c' : '#f39c12'};
  margin-right: 12px;
  font-size: 20px;
`;

const Message = styled.div`
  font-size: 14px;
  color: #333;
`;

const Toast = ({ message, type = 'warning', visible = false }) => {
  if (!visible) return null;
  
  return (
    <Container>
      <IconWrapper $type={type}>
        <FiAlertCircle />
      </IconWrapper>
      <Message>{message}</Message>
    </Container>
  );
};

export default Toast;
