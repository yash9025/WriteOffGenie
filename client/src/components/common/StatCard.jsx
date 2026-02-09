import React from "react";
import { Loader2 } from "../Icons";

/**
 * Reusable Stat Card Component
 * Used across all dashboards (Super Admin, Agent, CPA)
 * Maintains Figma design system
 */
const StatCard = ({ title, value, description, icon: Icon, isLoading }) => (
  <div className="bg-white border border-[#E3E6EA] rounded-[20px] px-6 py-5 flex flex-col gap-1 shadow-sm hover:shadow-md transition-shadow">
    <div className="flex items-center justify-between">
      <p className="text-[#9499A1] text-base font-normal">{title}</p>
      {Icon && (
        <div className="rounded-full p-2.5 flex items-center justify-center bg-[#4D7CFE1A]">
          <Icon size={24} />
        </div>
      )}
    </div>
    <div className="flex flex-col gap-1 mt-2">
      {isLoading ? (
        <div className="flex items-center gap-2">
          <Loader2 className="animate-spin text-[#9499A1]" size={20} />
          <span className="text-[#9499A1] text-sm">Loading...</span>
        </div>
      ) : (
        <>
          <h3 className="text-[#111111] text-[32px] font-semibold leading-[1.2]">
            {value}
          </h3>
          {description && (
            <p className="text-[#9499A1] text-[11px] font-normal">{description}</p>
          )}
        </>
      )}
    </div>
  </div>
);

export default StatCard;
