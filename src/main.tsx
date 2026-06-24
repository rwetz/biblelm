import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import ReactDOM from "react-dom/client";
import { getCurrentWindow } from "@tauri-apps/api/window";
import App from "./app/App";
import { USE_CUSTOM_WINDOW_CONTROLS } from "./lib/platform";
import "./styles/globals.css";

if (USE_CUSTOM_WINDOW_CONTROLS) {
  document.documentElement.dataset.chrome = "borderless";
}

ReactDOM.createRoot(document.getElementById("root")!).render(<App />);

// Window starts hidden (tauri.conf.json: visible:false) to avoid the transparent
// shadow-only frame that briefly shows before React paints on Windows/Linux.
const showWindow = () => {
  getCurrentWindow()
    .show()
    .catch((e) => console.error("window.show failed:", e));
};
setTimeout(showWindow, 50);
setTimeout(showWindow, 500); // safety net
