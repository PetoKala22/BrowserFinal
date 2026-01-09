import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '@/app/App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
// Disable StrictMode in production to avoid double renders
root.render(<App />);
