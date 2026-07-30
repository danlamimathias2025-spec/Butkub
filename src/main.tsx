import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { LanguageProvider } from './contexts/LanguageContext';
import { CurrencyProvider } from './contexts/CurrencyContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { StatusModalProvider } from './contexts/StatusModalContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <LanguageProvider>
        <CurrencyProvider>
          <StatusModalProvider>
            <App />
          </StatusModalProvider>
        </CurrencyProvider>
      </LanguageProvider>
    </ThemeProvider>
  </StrictMode>,
);
