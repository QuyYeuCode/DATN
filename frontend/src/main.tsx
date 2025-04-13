import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { BrowserRouter } from "react-router-dom";
import { WalletProvider, WalletConnectModal } from "./contexts/WalletContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <WalletProvider autoConnect={true}>
        <App />
      </WalletProvider>
    </BrowserRouter>
  </StrictMode>
);
