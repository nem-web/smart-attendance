// frontend/src/main.jsx
import React, { Suspense } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./i18n";
import { ThemeProvider } from "./theme/ThemeContext";
import { initializeKeepAlive } from "./utils/keepAlive";
import { Toaster } from "react-hot-toast";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
const queryClient = new QueryClient();

// Initialize keep-alive mechanism to ping Render backend on startup.
// This prevents cold starts and reduces latency for users.
// Use a global guard to avoid re-initializing during hot module reload in development.
if (typeof window !== "undefined" && !window.__keepAliveInitialized) {
  window.__keepAliveInitialized = true;
  initializeKeepAlive();
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <BrowserRouter>
        <QueryClientProvider client={queryClient}>
          <Suspense fallback={<div>Loading...</div>}>
            <App />
            <Toaster position="top-right" />
          </Suspense>
        </QueryClientProvider>
      </BrowserRouter>
    </ThemeProvider>
  </React.StrictMode>
);
