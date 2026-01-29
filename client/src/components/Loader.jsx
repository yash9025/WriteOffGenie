import { Sparkles, Loader2 } from "lucide-react";

const Loader = () => (
  <div className="fixed inset-0 bg-[#0e2b4a] flex flex-col items-center justify-center z-[9999]">
    <div className="flex items-center gap-3 mb-4 animate-pulse">
      <Sparkles className="text-white h-10 w-10" />
      <span className="text-3xl font-bold text-white tracking-tight">WriteOffGenie</span>
    </div>
    <Loader2 className="animate-spin h-8 w-8 text-blue-300" />
    <p className="text-blue-200 mt-4 font-medium animate-bounce">Verifying Session...</p>
  </div>
);

export default Loader;