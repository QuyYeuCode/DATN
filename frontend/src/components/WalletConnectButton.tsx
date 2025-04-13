// src/components/WalletConnectButton.tsx
import React from "react";
import { useWallet } from "../contexts/WalletContext";

const WalletConnectButton: React.FC = () => {
  const {
    isConnected,
    account,
    balance,
    networkInfo,
    isConnecting,
    connectWallet,
    disconnectWallet,
    error,
  } = useWallet();

  // Định dạng địa chỉ ví
  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  return (
    <div className="flex flex-col items-center">
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-2 rounded mb-3 text-sm">
          {error}
        </div>
      )}

      {isConnected && account ? (
        <div className="bg-white shadow-md rounded-lg p-4 w-full max-w-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              <div className="bg-green-500 h-2 w-2 rounded-full mr-2"></div>
              <span className="font-medium">
                {networkInfo?.name || "Unknown Network"}
              </span>
            </div>
            <span className="text-sm bg-gray-100 px-2 py-1 rounded">
              {networkInfo?.symbol || "ETH"}: {parseFloat(balance).toFixed(4)}
            </span>
          </div>

          <div className="bg-gray-100 p-3 rounded-md mb-3 flex items-center justify-between">
            <span className="text-gray-800 font-mono text-sm">
              {formatAddress(account)}
            </span>
            <button
              className="text-blue-600 text-sm hover:text-blue-800"
              onClick={() => navigator.clipboard.writeText(account)}
            >
              Copy
            </button>
          </div>

          <button
            onClick={disconnectWallet}
            className="w-full bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg transition duration-200"
          >
            Ngắt kết nối
          </button>
        </div>
      ) : (
        <button
          onClick={connectWallet}
          disabled={isConnecting}
          className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-lg transition duration-200 flex items-center disabled:opacity-50"
        >
          {isConnecting ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Đang kết nối...
            </>
          ) : (
            "Kết nối với MetaMask"
          )}
        </button>
      )}
    </div>
  );
};

export default WalletConnectButton;
