import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

const Header = () => {
  const location = useLocation();
  const [isHovering, setIsHovering] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  // Kiểm tra đường dẫn hiện tại để hiển thị active state
  const isActive = (path) => {
    return location.pathname === path;
  };

  // Hàm kết nối ví
  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        // Yêu cầu quyền truy cập vào ví MetaMask
        const accounts = await window.ethereum.request({
          method: "eth_requestAccounts",
        });
        setWalletAddress(accounts[0]);
        setIsWalletConnected(true);

        // Lắng nghe sự kiện thay đổi tài khoản
        window.ethereum.on("accountsChanged", function (accounts) {
          if (accounts.length === 0) {
            // Người dùng đã ngắt kết nối
            disconnectWallet();
          } else {
            // Người dùng đã chuyển tài khoản
            setWalletAddress(accounts[0]);
          }
        });
      } catch (error) {
        console.error("Lỗi khi kết nối ví:", error);
      }
    } else {
      alert("Vui lòng cài đặt MetaMask!");
    }
  };

  // Hàm ngắt kết nối ví
  const disconnectWallet = () => {
    setIsWalletConnected(false);
    setWalletAddress("");
    setIsDropdownOpen(false);
  };

  // Kiểm tra xem ví đã được kết nối chưa khi component mount
  useEffect(() => {
    const checkIfWalletIsConnected = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setIsWalletConnected(true);
          }
        } catch (error) {
          console.error("Lỗi khi kiểm tra trạng thái ví:", error);
        }
      }
    };

    checkIfWalletIsConnected();
  }, []);

  // Format địa chỉ ví để hiển thị
  const formatAddress = (address) => {
    if (!address) return "";
    return `${address.substring(0, 6)}...${address.substring(
      address.length - 4
    )}`;
  };

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (isDropdownOpen && !event.target.closest(".wallet-dropdown")) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  return (
    <div
      className="flex justify-between items-center
        px-8 py-4 bg-gradient-to-r from-gray-900 to-gray-800 shadow-lg fixed top-0 left-0 right-0 z-50 border-b border-gray-700"
    >
      <div className="flex space-x-6 items-center">
        <Link
          to="/"
          className="flex justify-start items-center
            text-xl text-pink-500 font-bold hover:text-pink-400 transition-colors duration-300"
        >
          <span className="mr-1">DraSwap</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z"
              clipRule="evenodd"
            />
          </svg>
        </Link>

        <div className="flex space-x-1">
          <Link
            to="/swap"
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              isActive("/swap")
                ? "bg-pink-200 bg-opacity-20 text-pink-400"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onMouseEnter={() => setIsHovering("swap")}
            onMouseLeave={() => setIsHovering("")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path d="M8 5a1 1 0 100 2h5.586l-1.293 1.293a1 1 0 001.414 1.414l3-3a1 1 0 000-1.414l-3-3a1 1 0 10-1.414 1.414L13.586 5H8zM12 15a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 15H12z" />
            </svg>
            <span>Swap</span>
            {isHovering === "swap" && !isActive("/swap") && (
              <div className="absolute h-0.5 bg-pink-500 bottom-0 left-0 right-0 mx-auto w-full mt-1"></div>
            )}
          </Link>

          <Link
            to="/liquidity"
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              isActive("/liquidity")
                ? "bg-pink-200 bg-opacity-20 text-pink-400"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onMouseEnter={() => setIsHovering("liquidity")}
            onMouseLeave={() => setIsHovering("")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z"
                clipRule="evenodd"
              />
            </svg>
            <span>Liquidity</span>
            {isHovering === "liquidity" && !isActive("/liquidity") && (
              <div className="absolute h-0.5 bg-pink-500 bottom-0 left-0 right-0 mx-auto w-full mt-1"></div>
            )}
          </Link>

          <Link
            to="/limit-order"
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              isActive("/limit-order")
                ? "bg-pink-200 bg-opacity-20 text-pink-400"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onMouseEnter={() => setIsHovering("limit-order")}
            onMouseLeave={() => setIsHovering("")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                clipRule="evenodd"
              />
            </svg>
            <span>Limit Order</span>
            {isHovering === "limit-order" && !isActive("/limit-order") && (
              <div className="absolute h-0.5 bg-pink-500 bottom-0 left-0 right-0 mx-auto w-full mt-1"></div>
            )}
          </Link>

          {/* Staking Menu Item */}
          <Link
            to="/staking"
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              isActive("/staking")
                ? "bg-pink-200 bg-opacity-20 text-pink-400"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onMouseEnter={() => setIsHovering("staking")}
            onMouseLeave={() => setIsHovering("")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {/* Biểu tượng Staking - Coins stack */}
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM7.5 8.5a2.5 2.5 0 115 0 2.5 2.5 0 01-5 0zM10 6a1 1 0 100-2 1 1 0 000 2zm-2 9.4a6 6 0 118-3.4.75.75 0 00-1 1.1 4.5 4.5 0 00-6 0 .75.75 0 00-1-1.1z"
                clipRule="evenodd"
              />
            </svg>
            <span>Staking</span>
            {isHovering === "staking" && !isActive("/staking") && (
              <div className="absolute h-0.5 bg-pink-500 bottom-0 left-0 right-0 mx-auto w-full mt-1"></div>
            )}
          </Link>

          {/* Governance DAO Menu Item */}
          <Link
            to="/governance"
            className={`flex items-center px-4 py-2 rounded-lg font-medium transition-all duration-300 ${
              isActive("/governance")
                ? "bg-pink-200 bg-opacity-20 text-pink-400"
                : "text-gray-300 hover:bg-gray-700 hover:text-white"
            }`}
            onMouseEnter={() => setIsHovering("governance")}
            onMouseLeave={() => setIsHovering("")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-1"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              {/* Biểu tượng Governance - Building/Structure */}
              <path
                fillRule="evenodd"
                d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2zm0 6a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1v-2z"
                clipRule="evenodd"
              />
            </svg>
            <span>Governance</span>
            {isHovering === "governance" && !isActive("/governance") && (
              <div className="absolute h-0.5 bg-pink-500 bottom-0 left-0 right-0 mx-auto w-full mt-1"></div>
            )}
          </Link>
        </div>
      </div>

      <div className="flex space-x-2 justify-center">
        {!isWalletConnected ? (
          <button
            type="button"
            onClick={connectWallet}
            className="cursor-pointer
              inline-flex items-center px-6 py-2 bg-gradient-to-r from-pink-600 to-purple-600
              text-white font-medium text-sm leading-tight
              rounded-full shadow-lg hover:from-pink-700 hover:to-purple-700 
              transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-opacity-50"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 mr-2"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            Connect Wallet
          </button>
        ) : (
          <div className="relative wallet-dropdown">
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="cursor-pointer
                inline-flex items-center px-6 py-2 bg-gradient-to-r from-green-600 to-green-700
                text-white font-medium text-sm leading-tight
                rounded-full shadow-lg hover:from-green-700 hover:to-green-800
                transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
              {formatAddress(walletAddress)}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 ml-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isDropdownOpen ? "M5 15l7-7 7 7" : "M19 9l-7 7-7-7"}
                />
              </svg>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-50">
                <div className="py-1" role="menu" aria-orientation="vertical">
                  <div className="px-4 py-2 border-b border-gray-700">
                    <p className="text-sm text-gray-400">Connected as</p>
                    <p className="text-sm font-bold text-white truncate">
                      {walletAddress}
                    </p>
                  </div>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(walletAddress);
                      alert("Địa chỉ đã được sao chép!");
                    }}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200"
                    role="menuitem"
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                        />
                      </svg>
                      Copy Address
                    </div>
                  </button>

                  <Link
                    to="/my-portfolio"
                    className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200"
                    role="menuitem"
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                        />
                      </svg>
                      My Portfolio
                    </div>
                  </Link>

                  <Link
                    to="/transactions"
                    className="w-full text-left block px-4 py-2 text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors duration-200"
                    role="menuitem"
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                        />
                      </svg>
                      Transaction History
                    </div>
                  </Link>

                  <button
                    onClick={disconnectWallet}
                    className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 transition-colors duration-200 border-t border-gray-700"
                    role="menuitem"
                  >
                    <div className="flex items-center">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4 mr-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Disconnect
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Header;
