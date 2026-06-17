import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ChatWindow } from "./components/Chat/ChatWindow";
import { SettingsWindow } from "./components/Settings/SettingsWindow";
import "./index.css";

const params = new URLSearchParams(window.location.search);
const windowType = params.get("window");

const root = ReactDOM.createRoot(document.getElementById("root")!);

if (windowType === "chat") {
  root.render(<ChatWindow />);
} else if (windowType === "settings") {
  root.render(<SettingsWindow />);
} else {
  root.render(<App />);
}
