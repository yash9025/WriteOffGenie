import React from "react";

const Loader = () => (
  <div className="fixed inset-0 bg-white flex flex-col items-center justify-center z-[9999]">
    
    {/* Bouncing Dots Animation */}
    <div className="flex space-x-2 mb-4">
      <div className="w-3 h-3 bg-[#011C39] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
      <div className="w-3 h-3 bg-[#011C39] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
      <div className="w-3 h-3 bg-[#011C39] rounded-full animate-bounce"></div>
    </div>

    {/* Text */}
    <p className="text-[#9499A1] font-medium text-sm tracking-wide animate-pulse">
      Loading...
    </p>
  </div>
);

export default Loader;