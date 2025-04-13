import React from "react";
import Footer from "./components/Footer";
import Header from "./components/Header";
import { WalletProvider, WalletConnectModal } from "./contexts/WalletContext";
import { Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SwapTokenPage from "./pages/SwapTokenPage";
import LiquidityPage from "./pages/LiquidityPage";
import LimitOrderPage from "./pages/LimitOrderPage";
import StakingPage from "./pages/StakingPage";
import GovernancePage from "./pages/GovernancePage";

function App() {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-gray-900">
      {/* Background gradient blobs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-500 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute top-1/4 -right-40 w-96 h-96 bg-pink-600 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-green-400 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute -bottom-40 right-20 w-72 h-72 bg-yellow-500 rounded-full opacity-10 blur-3xl"></div>
      <div className="absolute top-1/2 left-1/3 w-64 h-64 bg-purple-500 rounded-full opacity-10 blur-3xl"></div>

      {/* Content */}
      <Header />

      <main className="flex-grow">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/swap" element={<SwapTokenPage />} />
          <Route path="/liquidity" element={<LiquidityPage />} />
          <Route path="/limit-order" element={<LimitOrderPage />} />
          <Route path="/staking" element={<StakingPage />} />
          <Route path="/governance" element={<GovernancePage />} />
        </Routes>
      </main>

      <Footer />
    </div>
  );
}

export default App;
