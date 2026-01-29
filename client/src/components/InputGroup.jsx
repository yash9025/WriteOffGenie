import React from "react";

function InputGroup({ icon: Icon, required = true, ...props }) {
  return (
    <div className="relative group">
      <Icon 
        className="absolute left-3.5 top-3.5 text-gray-400 group-focus-within:text-blue-600 transition-colors" 
        size={20} 
      />
      <input 
        {...props}
        required={required}
        className="w-full pl-11 pr-4 py-3 bg-white border border-gray-200 rounded-xl outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all text-slate-800 placeholder:text-gray-400 font-medium" 
      />
    </div>
  );
}

export default InputGroup;