import React from "react";
import { X } from "../Icons";

/**
 * Reusable Modal Component
 * Used for invites, withdrawals, confirmations, etc.
 * Maintains Figma design system
 */
const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  footer,
  size = "md" // sm, md, lg, xl
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className={`relative w-full ${sizeClasses[size]} bg-white rounded-[20px] shadow-2xl border border-[#E3E6EA] max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E3E6EA]">
          <h2 className="text-xl font-semibold text-[#111111]">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 text-[#9499A1] hover:text-[#111111] hover:bg-[#F7F9FC] rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#E3E6EA] bg-[#F7F9FC]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
