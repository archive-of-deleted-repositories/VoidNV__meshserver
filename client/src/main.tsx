import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthGate } from "./components/AuthGate";
import "./styles/globals.css";
import "@xterm/xterm/css/xterm.css";
import { applyTheme } from "./state/theme";

applyTheme();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <AuthGate>
    <App />
  </AuthGate>,
);
