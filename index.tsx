
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Initialize Cloud Function URL
if (typeof window !== 'undefined') {
  const cloudFunctionURL = 
    'https://us-central1-axilam.cloudfunctions.net/auction';
  (window as any).__CLOUD_FUNCTION_URL__ = cloudFunctionURL;
  console.log('🔗 Cloud Function URL initialized:', cloudFunctionURL);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
