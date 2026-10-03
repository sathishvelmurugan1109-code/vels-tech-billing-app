import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import MasterAdminApp from './master-admin/MasterAdminApp.tsx'
import './index.css'

// Global error catcher for initial script load errors
window.addEventListener("error", (event) => {
  const root = document.getElementById("root");
  if (root && (!root.innerHTML || root.innerHTML.trim() === "")) {
    root.innerHTML = `<div style="padding:24px;color:#dc2626;font-family:sans-serif;background:#fef2f2;min-height:100vh">
      <h2 style="font-weight:bold;margin-bottom:8px">Application Startup Error</h2>
      <pre style="background:#fff;padding:12px;border:1px solid #fca5a5;border-radius:6px;overflow:auto">${event.message}\n${event.filename}:${event.lineno}:${event.colno}</pre>
    </div>`;
  }
});

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
    this.setState({ error, errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "32px", fontFamily: "system-ui, sans-serif", color: "#991b1b", backgroundColor: "#fef2f2", minHeight: "100vh" }}>
          <div style={{ maxWidth: "800px", margin: "0 auto", background: "#ffffff", padding: "24px", borderRadius: "12px", boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)", border: "1px solid #fecaca" }}>
            <h2 style={{ fontSize: "22px", fontWeight: "700", marginBottom: "12px", color: "#b91c1c" }}>Application Error</h2>
            <p style={{ marginBottom: "16px", color: "#4b5563", fontSize: "14px" }}>The application encountered an error while rendering:</p>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-all", background: "#f8fafc", padding: "16px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "13px", color: "#1e293b", marginBottom: "16px" }}>
              {this.state.error?.toString()}
              {"\n\nStack:\n"}
              {this.state.error?.stack}
              {"\n\nComponent Stack:\n"}
              {this.state.errorInfo?.componentStack}
            </pre>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ padding: "10px 20px", background: "#ef4444", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer", marginRight: "12px" }}
            >
              Reset Storage & Reload
            </button>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: "10px 20px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "600", cursor: "pointer" }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// /master-admin is a separate Master Admin dashboard. Everything else is the billing app.
const isMasterAdminRoute = window.location.pathname === "/master-admin" || window.location.pathname.startsWith("/master-admin/");
const rootEl = document.getElementById('root')!;
if (isMasterAdminRoute) {
  document.title = "Vels Master Admin";
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <MasterAdminApp />
      </ErrorBoundary>
    </React.StrictMode>,
  )
} else {
  ReactDOM.createRoot(rootEl).render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>,
  )
}

// Register SW
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
  })
}
