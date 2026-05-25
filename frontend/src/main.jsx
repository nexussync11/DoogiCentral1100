import React from "react";
import { createRoot } from "react-dom/client";
import DoogiCentral from "./DoogiCentral.jsx";
import "./styles.css";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-[#020711] px-4 text-white">
          <section className="max-w-xl rounded-3xl border border-red-300/30 bg-red-400/10 p-6">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-200">Doogi Central</p>
            <h1 className="mt-3 text-3xl font-black">Something stopped the game UI from loading.</h1>
            <p className="mt-4 text-gray-200">Please refresh once. If it continues, send this message to support:</p>
            <pre className="mt-4 overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-red-100">{String(this.state.error?.message || this.state.error)}</pre>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <DoogiCentral />
    </AppErrorBoundary>
  </React.StrictMode>
);
