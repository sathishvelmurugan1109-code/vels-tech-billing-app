import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import MasterAdminApp from './master-admin/MasterAdminApp.tsx'
import './index.css'

// /master-admin is a separate Master Admin dashboard. Everything else is the billing app.
const isMasterAdminRoute = window.location.pathname === "/master-admin" || window.location.pathname.startsWith("/master-admin/");
const rootEl = document.getElementById('root')!;
if (isMasterAdminRoute) {
  document.title = "Vels Master Admin";
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <MasterAdminApp />
    </React.StrictMode>,
  )
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  )
}

// Register SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
