import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/app.css";
import { App } from "./App";

const host = document.getElementById("root");
if (host) {
  document.getElementById("boot")?.remove();
  createRoot(host).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}
