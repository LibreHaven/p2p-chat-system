import React, { useState } from 'react';
import styled from 'styled-components';
import { ConfigProvider } from 'antd';
import ErrorBoundary from './components/ErrorBoundary';
import ConnectionContainer from './containers/ConnectionContainer';
import ChatScreenContainer from './containers/ChatScreenContainer';
import ErrorScreenContainer from './containers/ErrorScreenContainer';

const AppContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
  font-family: 'Roboto', sans-serif;
`;

function App() {
  const [screen, setScreen] = useState('connection'); // connection, chat, error
  const [peerId, setPeerId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [connection, setConnection] = useState(null);
  const [useEncryption, setUseEncryption] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Reset to connection screen
  const resetConnection = () => {
    setScreen('connection');
    setTargetId('');
    setErrorMessage('');
    if (connection) {
      connection.close();
      setConnection(null);
    }
  };

  // Handle successful connection
  const handleConnectionSuccess = (conn, targetPeerId, encryption) => {
    setConnection(conn);
    setTargetId(targetPeerId);
    setUseEncryption(encryption);
    setScreen('chat');
  };

  // Handle connection error
  const handleConnectionError = (error) => {
    setErrorMessage(error);
    setScreen('error');
  };

  const antdTheme = {
    token: {
      colorPrimary: '#4a90e2',
      borderRadius: 4,
      colorBgContainer: '#ffffff',
      colorBgLayout: '#f5f5f5',
    },
  };

  return (
    <ConfigProvider theme={antdTheme}>
      <ErrorBoundary>
        <AppContainer>
          {screen === 'connection' && (
            <ConnectionContainer
              peerId={peerId}
              setPeerId={setPeerId}
              onConnectionSuccess={handleConnectionSuccess}
              onConnectionError={handleConnectionError}
            />
          )}
          
          {screen === 'chat' && (
            <ChatScreenContainer
              peerId={peerId}
              targetId={targetId}
              connection={connection}
              useEncryption={useEncryption}
              onDisconnect={resetConnection}
            />
          )}
          
          {screen === 'error' && (
            <ErrorScreenContainer
              errorMessage={errorMessage}
              targetId={targetId}
              onRetryConnection={() => {
                setScreen('connection');
                setErrorMessage('');
              }}
              setErrorMessage={setErrorMessage}
            />
          )}
        </AppContainer>
      </ErrorBoundary>
    </ConfigProvider>
  );
}

export default App;
