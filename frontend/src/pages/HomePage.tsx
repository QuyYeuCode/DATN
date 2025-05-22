import React from "react";
import SwapToken from "../components/SwapToken";
import SwapTokenHomepage from "../components/SwapTokenHomepage";

const HomePage = () => {
  return (
    <div>
      <main className="flex-grow flex flex-col items-center justify-center py-20 px-4 relative z-10 mt-5">
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white mb-4">
            Swap anytime,
            <br />
            anywhere.
          </h1>
          <p className="text-gray-400 mt-8 max-w-xl mx-auto">
            The newest, most reputable and trusted on-chain marketplace. Buy and
            sell crypto on multichains.
          </p>
        </div>

        <div className="w-full max-w-md">
          <SwapTokenHomepage />
        </div>
      </main>
    </div>
  );
};

export default HomePage;
