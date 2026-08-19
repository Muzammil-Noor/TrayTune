import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App";
import FlyoutApp from "./FlyoutApp";

// The flyout window loads the same bundle with #flyout (see flyout-window.ts).
const isFlyout = window.location.hash === "#flyout";

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isFlyout ? <FlyoutApp /> : <App />}</StrictMode>,
);
