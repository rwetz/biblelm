import "@fontsource/unifrakturmaguntia/400.css";
import "@fontsource/im-fell-english/400.css";
import "@fontsource/im-fell-english/400-italic.css";
import "@fontsource-variable/eb-garamond/index.css";
import "@fontsource-variable/eb-garamond/wght-italic.css";
import "@fontsource-variable/grenze-gotisch/index.css";
import "./styles.css";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { domAnimation, LazyMotion } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { IN_TAURI, ThemeProvider, Toaster, TooltipProvider, USE_CUSTOM_WINDOW_CONTROLS } from "@nexis/design";
import App from "./app/App";
import { SCRIPTORIUM_ID, scriptorium, subRosa, tenebrae } from "./app/theme";

// Windows/Linux: the OS hands us a transparent, undecorated window and the
// stylesheet paints the corners onto #root under this flag.
if (USE_CUSTOM_WINDOW_CONTROLS) document.documentElement.dataset.chrome = "borderless";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <LazyMotion features={domAnimation} strict>
      <ThemeProvider storageKey="biblelm" defaultThemeId={SCRIPTORIUM_ID} customThemes={[scriptorium, tenebrae, subRosa]}>
        <TooltipProvider delayDuration={300}>
          <App />
          <Toaster position="bottom-right" />
        </TooltipProvider>
      </ThemeProvider>
    </LazyMotion>
  </StrictMode>,
);

// The window starts hidden (tauri.conf.json "visible": false) and is shown
// after React has painted. setTimeout, not rAF: rAF does not fire hidden.
if (IN_TAURI) {
  const show = () => getCurrentWindow().show().catch(console.error);
  setTimeout(show, 50);
  setTimeout(show, 500);
}
