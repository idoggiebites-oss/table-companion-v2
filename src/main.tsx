import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./design/tokens.css";
import { App } from "./ui/App";

const el = document.getElementById("root");
if (!el) throw new Error("no #root");
createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
