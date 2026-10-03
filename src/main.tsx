import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './presentation/styles.css'
import Session from './presentation/Session'

const root = document.getElementById('root');
if (!root) throw new Error('Uygulama kök elementi bulunamadı.');
createRoot(root).render(
  <StrictMode>
    <Session />
  </StrictMode>,
)
