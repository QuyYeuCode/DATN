// src/contexts/WalletContext.tsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { ethers } from "ethers";
import { BrowserProvider, JsonRpcSigner } from "ethers";

// Định nghĩa các networks phổ biến
interface NetworkInfo {
  chainId: string;
  name: string;
  symbol: string;
}

const NETWORKS: { [chainId: string]: NetworkInfo } = {
  "0x1": { chainId: "0x1", name: "Ethereum Mainnet", symbol: "ETH" },
  "0x5": { chainId: "0x5", name: "Goerli Testnet", symbol: "ETH" },
  "0xaa36a7": { chainId: "0xaa36a7", name: "Sepolia Testnet", symbol: "ETH" },
  "0x11155111": {
    chainId: "0x11155111",
    name: "Holesky Testnet",
    symbol: "ETH",
  },
  "0x89": { chainId: "0x89", name: "Polygon", symbol: "MATIC" },
  "0xa86a": { chainId: "0xa86a", name: "Avalanche C-Chain", symbol: "AVAX" },
  "0x38": { chainId: "0x38", name: "BNB Smart Chain", symbol: "BNB" },
  "0xa4b1": { chainId: "0xa4b1", name: "Arbitrum One", symbol: "ETH" },
  "0xa": { chainId: "0xa", name: "Optimism", symbol: "ETH" },
  "0x13a": { chainId: "0x13a", name: "Filecoin", symbol: "FIL" },
  "0x144": { chainId: "0x144", name: "zkSync Era Mainnet", symbol: "ETH" },
  "0x14a33": { chainId: "0x14a33", name: "Base", symbol: "ETH" },
  "0x2105": { chainId: "0x2105", name: "Base Sepolia Testnet", symbol: "ETH" },
};

// Định nghĩa interface cho context
interface WalletContextType {
  provider: BrowserProvider | null;
  signer: JsonRpcSigner | null;
  account: string | null;
  chainId: string | null;
  networkInfo: NetworkInfo | null;
  balance: string;
  isConnecting: boolean;
  isConnected: boolean;
  error: string | null;
  connectWallet: () => Promise<boolean>;
  disconnectWallet: () => void;
  switchNetwork: (chainId: string) => Promise<boolean>;
}

// Tạo context với giá trị mặc định
const WalletContext = createContext<WalletContextType>({
  provider: null,
  signer: null,
  account: null,
  chainId: null,
  networkInfo: null,
  balance: "0",
  isConnecting: false,
  isConnected: false,
  error: null,
  connectWallet: async () => false,
  disconnectWallet: () => {},
  switchNetwork: async () => false,
});

// Props cho WalletProvider
interface WalletProviderProps {
  children: ReactNode;
  autoConnect?: boolean;
}

export const WalletProvider: React.FC<WalletProviderProps> = ({
  children,
  autoConnect = true,
}) => {
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Kiểm tra xem Ethereum provider có tồn tại không
  const checkIfEthereumExists = (): boolean => {
    if (!window.ethereum) {
      setError("Không tìm thấy Ethereum provider. Vui lòng cài đặt MetaMask!");
      return false;
    }
    return true;
  };

  // Khởi tạo provider
  const initializeProvider = async (): Promise<BrowserProvider | null> => {
    try {
      if (!checkIfEthereumExists()) {
        return null;
      }

      const ethersProvider = new ethers.BrowserProvider(window.ethereum);
      setProvider(ethersProvider);
      return ethersProvider;
    } catch (error) {
      console.error("Lỗi khi khởi tạo provider:", error);
      setError("Không thể khởi tạo Ethereum provider");
      return null;
    }
  };

  // Cập nhật thông tin network
  const updateNetworkInfo = async (
    provider: BrowserProvider
  ): Promise<void> => {
    try {
      const { chainId } = await provider.getNetwork();
      const chainIdHex = "0x" + chainId.toString(16);
      setChainId(chainIdHex);

      // Lấy thông tin network từ danh sách đã định nghĩa
      const network = NETWORKS[chainIdHex] || {
        chainId: chainIdHex,
        name: `Unknown Network (${chainIdHex})`,
        symbol: "ETH",
      };

      setNetworkInfo(network);
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin mạng:", error);
      setNetworkInfo(null);
    }
  };

  // Cập nhật thông tin tài khoản
  const updateAccountInfo = async (
    provider: BrowserProvider
  ): Promise<boolean> => {
    try {
      const accounts = await provider.send("eth_accounts", []);

      if (accounts.length === 0) {
        return false;
      }

      const userAddress = accounts[0];
      setAccount(userAddress);

      // Lấy signer
      const userSigner = await provider.getSigner();
      setSigner(userSigner);

      // Lấy số dư
      const userBalance = await provider.getBalance(userAddress);
      setBalance(ethers.formatEther(userBalance));

      // Cập nhật thông tin mạng
      await updateNetworkInfo(provider);

      setIsConnected(true);
      localStorage.setItem("walletConnected", "true");

      return true;
    } catch (error) {
      console.error("Lỗi khi cập nhật thông tin tài khoản:", error);
      resetWalletState();
      return false;
    }
  };

  // Reset trạng thái ví
  const resetWalletState = (): void => {
    setSigner(null);
    setAccount(null);
    setBalance("0");
    setChainId(null);
    setNetworkInfo(null);
    setIsConnected(false);
    localStorage.removeItem("walletConnected");
  };

  // Khởi tạo ban đầu
  useEffect(() => {
    const initialize = async () => {
      try {
        const shouldAutoConnect =
          autoConnect && localStorage.getItem("walletConnected") === "true";

        // Luôn khởi tạo provider nếu có thể
        const ethersProvider = await initializeProvider();

        if (ethersProvider && shouldAutoConnect) {
          // Thử kết nối lại nếu trước đó đã kết nối
          setIsConnecting(true);
          await updateAccountInfo(ethersProvider);
        }
      } catch (error) {
        console.error("Lỗi khi khởi tạo ví:", error);
        resetWalletState();
      } finally {
        setIsConnecting(false);
      }
    };

    initialize();
  }, [autoConnect]);

  // Lắng nghe sự kiện thay đổi tài khoản
  useEffect(() => {
    if (!window.ethereum) return;

    const handleAccountsChanged = async (accounts: string[]) => {
      if (accounts.length === 0) {
        // Người dùng đã ngắt kết nối
        resetWalletState();
      } else if (account !== accounts[0] && provider) {
        // Tài khoản đã thay đổi
        await updateAccountInfo(provider);
      }
    };

    const handleChainChanged = async (chainId: string) => {
      // Khởi tạo lại provider và cập nhật thông tin
      const newProvider = await initializeProvider();
      if (newProvider) {
        await updateNetworkInfo(newProvider);
        await updateAccountInfo(newProvider);
      }
    };

    const handleDisconnect = (error: { code: number; message: string }) => {
      console.log("MetaMask disconnect event:", error);
      resetWalletState();
    };

    window.ethereum.on("accountsChanged", handleAccountsChanged);
    window.ethereum.on("chainChanged", handleChainChanged);
    window.ethereum.on("disconnect", handleDisconnect);

    // Cleanup listeners
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
        window.ethereum.removeListener("disconnect", handleDisconnect);
      }
    };
  }, [provider, account]);

  // Kết nối ví
  const connectWallet = async (): Promise<boolean> => {
    setError(null);
    setIsConnecting(true);

    try {
      if (!checkIfEthereumExists()) {
        setIsConnecting(false);
        return false;
      }

      // Khởi tạo provider nếu chưa có
      const ethersProvider = provider || (await initializeProvider());

      if (!ethersProvider) {
        setIsConnecting(false);
        return false;
      }

      // Yêu cầu kết nối ví
      await ethersProvider.send("eth_requestAccounts", []);

      // Cập nhật thông tin tài khoản
      const connected = await updateAccountInfo(ethersProvider);

      if (!connected) {
        setError("Không thể kết nối với ví");
      }

      return connected;
    } catch (error) {
      console.error("Lỗi khi kết nối ví:", error);

      // Xử lý lỗi người dùng từ chối kết nối
      if (error instanceof Error && error.message.includes("user rejected")) {
        setError("Người dùng đã từ chối kết nối ví");
      } else {
        setError("Lỗi khi kết nối với ví MetaMask");
      }

      resetWalletState();
      return false;
    } finally {
      setIsConnecting(false);
    }
  };

  // Ngắt kết nối ví
  const disconnectWallet = (): void => {
    resetWalletState();
  };

  // Chuyển đổi mạng
  const switchNetwork = async (chainId: string): Promise<boolean> => {
    try {
      if (!window.ethereum || !provider) {
        return false;
      }

      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId }],
      });

      // Network change sẽ được xử lý bởi sự kiện chainChanged
      return true;
    } catch (switchError: any) {
      // Trường hợp mạng chưa được thêm vào MetaMask
      if (switchError.code === 4902) {
        try {
          // Thêm mạng mới vào MetaMask (cần thông tin chi tiết về mạng)
          // Bạn có thể mở rộng hàm này để hỗ trợ thêm mạng mới
          console.error("Mạng không tồn tại trong MetaMask, cần thêm mạng mới");
          return false;
        } catch (addError) {
          console.error("Lỗi khi thêm mạng mới:", addError);
          return false;
        }
      }
      console.error("Lỗi khi chuyển đổi mạng:", switchError);
      return false;
    }
  };

  // Giá trị context
  const value: WalletContextType = {
    provider,
    signer,
    account,
    chainId,
    networkInfo,
    balance,
    isConnecting,
    isConnected,
    error,
    connectWallet,
    disconnectWallet,
    switchNetwork,
  };

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
};

// Hook để sử dụng wallet context
export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return context;
};

// Thêm modal kết nối tự động
export const WalletConnectModal: React.FC = () => {
  const { isConnected, isConnecting, connectWallet, error } = useWallet();
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    // Hiển thị modal nếu chưa kết nối và chưa từ chối trước đó
    const hasDeclined =
      localStorage.getItem("hasDeclinedConnection") === "true";

    if (!isConnected && !hasDeclined) {
      // Đợi một lúc để tránh hiển thị ngay lập tức
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [isConnected]);

  const handleConnect = async () => {
    await connectWallet();
    // Modal sẽ tự đóng khi isConnected = true
  };

  const handleDecline = () => {
    setShowModal(false);
    localStorage.setItem("hasDeclinedConnection", "true");
  };

  // Đóng modal nếu đã kết nối
  useEffect(() => {
    if (isConnected) {
      setShowModal(false);
    }
  }, [isConnected]);

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Kết nối với ví MetaMask</h2>
        <p className="mb-4">
          Để sử dụng đầy đủ tính năng của ứng dụng, vui lòng kết nối ví của bạn.
        </p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col space-y-3">
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-200 disabled:opacity-50"
          >
            {isConnecting ? "Đang kết nối..." : "Kết nối với MetaMask"}
          </button>

          <button
            onClick={handleDecline}
            className="text-gray-600 py-2 px-4 hover:text-gray-800 transition duration-200"
          >
            Để sau
          </button>
        </div>
      </div>
    </div>
  );
};

// Định nghĩa window.ethereum
declare global {
  interface Window {
    ethereum: any;
  }
}
