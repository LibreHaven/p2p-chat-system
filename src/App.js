import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import ConnectionScreen from './components/ConnectionScreen';
import ChatScreen from './components/ChatScreen';
import ErrorScreen from './components/ErrorScreen';

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
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // disconnected, connecting, connected, failed
  const [errorMessage, setErrorMessage] = useState('');
  const [messages, setMessages] = useState([]);

  // Reset to connection screen
  const resetConnection = () => {
    setScreen('connection');
    setTargetId('');
    setConnectionStatus('disconnected');
    setErrorMessage('');
    if (connection) {
      connection.close();
      setConnection(null);
    }
  };

  return (
    <AppContainer>
      {screen === 'connection' && (
        <ConnectionScreen 
          peerId={peerId}
          setPeerId={setPeerId}
          targetId={targetId}
          setTargetId={setTargetId}
          connectionStatus={connectionStatus}
          setConnectionStatus={setConnectionStatus}
          setConnection={setConnection}
          setScreen={setScreen}
          setErrorMessage={setErrorMessage}
          setMessages={setMessages}
        />
      )}
      
      {screen === 'chat' && (
        <ChatScreen 
          peerId={peerId}
          targetId={targetId}
          connection={connection}
          messages={messages}
          setMessages={setMessages}
          resetConnection={resetConnection}
        />
      )}
      
      {screen === 'error' && (
        <ErrorScreen 
          errorMessage={errorMessage}
          resetConnection={resetConnection}
          targetId={targetId}
          setConnectionStatus={setConnectionStatus}
          setConnection={setConnection}
          setScreen={setScreen}
          setErrorMessage={setErrorMessage}
        />
      )}
    </AppContainer>
  );
}

export default App;
