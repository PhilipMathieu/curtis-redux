import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '../index.css'
import LeagueApp from './LeagueApp.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <LeagueApp />
  </StrictMode>,
)
