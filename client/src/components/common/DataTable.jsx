import React from "react";
import { Search, Loader2 } from "lucide-react";

/**
 * Reusable Data Table Component
 * Used for displaying Partners, Agents, CPAs, Clients, Transactions, etc.
 * Maintains Figma design system
 */
const DataTable = ({ 
  columns, 
  data, 
  isLoading, 
  emptyMessage = "No data found",
  searchPlaceholder,
  searchValue,
  onSearchChange,
  renderRow
}) => {
  return (
    <div className="bg-white border border-[#E3E6EA] rounded-[20px] overflow-hidden shadow-sm">
      {/* Search Header (Optional) */}
      {onSearchChange && (
        <div className="p-4 border-b border-[#E3E6EA]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9499A1]" size={20} />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder || "Search..."}
              className="w-full pl-10 pr-4 py-2.5 border border-[#E3E6EA] rounded-xl text-[#111111] placeholder:text-[#9499A1] focus:outline-none focus:ring-2 focus:ring-[#4D7CFE] focus:border-transparent"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-[#F7F9FC] border-b border-[#E3E6EA]">
              {columns.map((column, index) => (
                <th
                  key={index}
                  className="px-6 py-4 text-left text-sm font-semibold text-[#111111] whitespace-nowrap"
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <Loader2 className="animate-spin text-[#4D7CFE]" size={32} />
                    <p className="text-[#9499A1] text-sm">Loading data...</p>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-12">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <p className="text-[#111111] font-medium">{emptyMessage}</p>
                    <p className="text-[#9499A1] text-sm">Try adjusting your search or filters</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => renderRow(row, rowIndex))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
