import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { AuthProvider } from './context/AuthContext.jsx';
import { VaultProvider } from './context/VaultContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LanguageProvider } from './context/LanguageContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <VaultProvider>
            <App />
          </VaultProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  </React.StrictMode>
);
