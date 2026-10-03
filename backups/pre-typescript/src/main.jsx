import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './presentation/styles.css'
import App from './presentation/App.jsx'
import { currentUser, requestService } from './bootstrap/services.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App service={requestService} user={currentUser} />
  </StrictMode>,
)
