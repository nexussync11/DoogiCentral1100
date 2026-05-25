import React from "react";
import { createRoot } from "react-dom/client";
import DoogiCentral from "./DoogiCentral.jsx";
import "./styles.css";

function showRuntimeError(error) {
  const root = document.getElementById("root");
  if (!root) return;
  root.innerHTML = `
    <main class="flex min-h-screen items-center justify-center bg-[#020711] px-4 text-white">
      <section class="max-w-xl rounded-3xl border border-red-300/30 bg-red-400/10 p-6">
        <p class="text-sm font-semibold uppercase tracking-[0.24em] text-red-200">Doogi Central</p>
        <h1 class="mt-3 text-3xl font-black">Something stopped the game UI from loading.</h1>
        <p class="mt-4 text-gray-200">Please refresh once. If it continues, send this message to support:</p>
        <pre class="mt-4 overflow-auto rounded-2xl bg-black/40 p-4 text-xs text-red-100">${String(error?.message || error).replace(/[<>]/g, "")}</pre>
      </section>
    </main>`;
}

window.addEventListener("error", (event) => showRuntimeError(event.error || event.message));
window.addEventListener("unhandledrejection", (event) => showRuntimeError(event.reason));

try {
  createRoot(document.getElementById("root")).render(
    <React.StrictMode>
      <DoogiCentral />
    </React.StrictMode>
  );
} catch (error) {
  showRuntimeError(error);
}
