import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import App from "./App";
import FlyoutApp from "./FlyoutApp";

// The flyout window loads the same bundle with #flyout (see flyout-window.ts).
const isFlyout = window.location.hash === "#flyout";

// The flyout lives in a transparent window: only its card should paint.
if (isFlyout) document.body.classList.add("flyout-window");

createRoot(document.getElementById("root")!).render(
  <StrictMode>{isFlyout ? <FlyoutApp /> : <App />}</StrictMode>,
);
