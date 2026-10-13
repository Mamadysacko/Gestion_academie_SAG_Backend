import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { LanguageProvider } from './i18n/LanguageProvider.jsx'
import { ConfirmProvider } from './composant/ConfirmDialog.jsx'
import { ToastProvider } from './composant/ToastProvider.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LanguageProvider>
      <ToastProvider>
      <ConfirmProvider>
        <App />
      </ConfirmProvider>
      </ToastProvider>
    </LanguageProvider>
  </StrictMode>,
)
