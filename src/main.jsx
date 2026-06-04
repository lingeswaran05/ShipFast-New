import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './print.css'
import App from './App.jsx'
import { Toaster } from 'sonner'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Toaster position="top-right" richColors duration={4000} />
  </StrictMode>,
)


