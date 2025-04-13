import React, { useState } from "react";

const Staking = () => {
  const [cakeAmount, setCakeAmount] = useState("0.00");
  const [lockDuration, setLockDuration] = useState("26");
  const [selectedDuration, setSelectedDuration] = useState("6M");

  const handleDurationSelect = (duration) => {
    setSelectedDuration(duration);

    // Set weeks based on duration selection
    switch (duration) {
      case "1W":
        setLockDuration("1");
        break;
      case "1M":
        setLockDuration("4");
        break;
      case "6M":
        setLockDuration("26");
        break;
      case "1Y":
        setLockDuration("52");
        break;
      case "4Y":
        setLockDuration("208");
        break;
      default:
        setLockDuration("26");
    }
  };

  return (
    <div className="min-h-screen bg-indigo-900 p-4 flex flex-col items-center">
      <div className="w-full max-w-3xl space-y-6">
        {/* Lock CAKE Section */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h1 className="text-2xl font-bold text-white mb-6">
            Lock CAKE to get veCAKE
          </h1>

          <div className="grid md:grid-cols-2 gap-6">
            {/* CAKE Amount */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-300">CAKE Amount</span>
                <button className="bg-gray-800 text-gray-400 p-1 rounded">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 flex items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-cyan-400 rounded-full p-2">
                    <span className="text-orange-500 text-lg">🐰</span>
                  </div>
                  <span className="text-white text-lg font-bold">CAKE</span>
                </div>
                <input
                  type="text"
                  value={cakeAmount}
                  onChange={(e) => setCakeAmount(e.target.value)}
                  className="ml-auto bg-transparent text-white text-right text-xl font-bold w-1/2 outline-none"
                />
              </div>
            </div>

            {/* Lock Duration */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-purple-300">Lock Duration</span>
                <div className="flex gap-1">
                  {["1W", "1M", "6M", "1Y", "4Y"].map((duration) => (
                    <button
                      key={duration}
                      className={`px-2 py-1 text-sm rounded ${
                        selectedDuration === duration
                          ? "bg-cyan-500 text-white"
                          : "bg-gray-800 text-gray-400"
                      }`}
                      onClick={() => handleDurationSelect(duration)}
                    >
                      {duration}
                    </button>
                  ))}
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 flex items-center">
                <div className="flex items-center gap-2">
                  <div className="bg-yellow-500 rounded-full p-2">
                    <span className="text-white text-lg">⏰</span>
                  </div>
                  <span className="text-white text-lg font-bold">Weeks</span>
                </div>
                <input
                  type="text"
                  value={lockDuration}
                  onChange={(e) => setLockDuration(e.target.value)}
                  className="ml-auto bg-transparent text-white text-right text-xl font-bold w-1/2 outline-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lock Overview Section */}
        <div className="bg-gray-900 rounded-lg p-6">
          <h2 className="text-gray-400 font-bold mb-4">LOCK OVERVIEW</h2>

          {/* veCAKE Banner */}
          <div className="bg-gradient-to-r from-purple-600 via-blue-500 to-cyan-400 rounded-lg p-4 mb-6 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="bg-cyan-400 p-2 rounded-md">
                <span className="text-orange-500 text-xl">🐰</span>
              </div>
              <span className="text-white text-xl font-bold">MY veCAKE</span>
            </div>
            <span className="text-white text-2xl font-bold">0</span>
          </div>

          {/* APR Information */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400 underline">Total APR</span>
              <span className="text-cyan-400">Up to 78.95%</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400 underline">veCAKE Pool APR</span>
              <span className="text-white">Up to 0.00%</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400 underline">
                Revenue Sharing APR
              </span>
              <span className="text-white">Up to 58.95%</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400 underline">Bribe APR</span>
              <span className="text-cyan-400">Up to 20.00%</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400">CAKE to be locked</span>
              <span className="text-white">0</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400">Factor</span>
              <span className="text-white">0x</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400">Duration</span>
              <span className="text-white">26 weeks</span>
            </div>
            <div className="flex justify-between items-center border-b border-gray-800 pb-2">
              <span className="text-gray-400">Unlock on</span>
              <span className="text-white">Oct 9 2025 07:00</span>
            </div>
          </div>

          {/* Lock CAKE Button */}
          <button className="w-full bg-gray-700 text-gray-400 rounded-lg py-4 mt-6 font-bold text-lg">
            Lock CAKE
          </button>
        </div>
      </div>
    </div>
  );
};

export default Staking;
