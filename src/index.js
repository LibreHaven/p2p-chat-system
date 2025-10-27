import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './styles/global.css';
import { startTelemetryCollector } from './observability/telemetryCollector';
import { config } from './config';

const root = createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Initialize lightweight telemetry in development
if (config?.isDevelopment) {
  startTelemetryCollector();
}
