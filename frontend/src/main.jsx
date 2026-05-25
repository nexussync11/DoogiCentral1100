import React from "react";
import { createRoot } from "react-dom/client";
import DoogiCentral from "./DoogiCentral.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <DoogiCentral />
  </React.StrictMode>
);
