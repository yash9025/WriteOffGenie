import React from "react";
import { 
  Loader2, 
  Eye, 
  UserPlus, 
  Users as LucideUsers,
  DollarSign as LucideDollarSign,
  TrendingUp as LucideTrendingUp,
  Percent as LucidePercent,
  Activity as LucideActivity,
  Wallet as LucideWallet,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  X as LucideX,
  Plus,
  Trash2,
  Star,
  Edit2,
  Camera,
  Save,
  Link as LucideLinkIcon,
  Mail,
  ShieldAlert,
  Menu,
  LogOut,
  Sparkles,
  User,
  Building2,
  Calendar as LucideCalendar,
  ShieldCheck,
  Clock as LucideClock,
  Search,
  Download,
  PieChart
} from "lucide-react";

// =====================================================
// COMMON UI ICONS (Lucide React)
// Use these for consistent styling across the app
// =====================================================

export { 
  Loader2,         // Loading spinner
  Eye,             // View/preview action
  UserPlus,        // Add user/invite
  ArrowLeft,       // Back navigation
  ChevronDown,     // Dropdown indicator
  ChevronRight,    // Expand/collapse
  Copy,            // Copy to clipboard
  Check,           // Success/confirmed state
  Plus,            // Add new item
  Trash2,          // Delete action
  Star,            // Favorite/default marker
  Edit2,           // Edit action
  Camera,          // Photo/upload
  Save,            // Save action
  Mail,            // Email related
  ShieldAlert,     // Warning/security
  Menu,            // Mobile menu toggle
  LogOut,          // Sign out action
  Sparkles,        // Special/premium feature
  User,            // User profile
  Building2,       // Building/company
  ShieldCheck,     // Verified/secure
  Search,          // Search functionality
  Download,        // Download action
  PieChart         // Chart/analytics
};

export const X = LucideX;  // Close/dismiss action

// =====================================================
// STAT CARD ICONS
// Consistent sizes for dashboard statistics
// =====================================================

export const Users = LucideUsers;
export const DollarSign = LucideDollarSign;
export const TrendingUp = LucideTrendingUp;
export const Percent = LucidePercent;
export const Activity = LucideActivity;
export const Wallet = LucideWallet;
export const Calendar = LucideCalendar;
export const Clock = LucideClock;
export const Link = LucideLinkIcon;

// =====================================================
// CUSTOM SVG ICONS
// Branded icons with specific styling
// =====================================================

// Revenue Icon - Dollar with circular arrow (Admin/Agent)
export const RevenueIcon = ({ size = 24, color = "#011C39" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.05 16.25H11.17C9.84 16.25 8.75 15.13 8.75 13.75C8.75 13.34 9.09 13 9.5 13C9.91 13 10.25 13.34 10.25 13.75C10.25 14.3 10.66 14.75 11.17 14.75H13.05C13.44 14.75 13.75 14.4 13.75 13.97C13.75 13.43 13.6 13.35 13.26 13.23L10.25 12.18C9.61 11.96 8.75 11.49 8.75 10.02C8.75 8.77 9.74 7.74 10.95 7.74H12.83C14.16 7.74 15.25 8.86 15.25 10.24C15.25 10.65 14.91 10.99 14.5 10.99C14.09 10.99 13.75 10.65 13.75 10.24C13.75 9.69 13.34 9.24 12.83 9.24H10.95C10.56 9.24 10.25 9.59 10.25 10.02C10.25 10.56 10.4 10.64 10.74 10.76L13.75 11.81C14.39 12.03 15.25 12.5 15.25 13.97C15.25 15.23 14.26 16.25 13.05 16.25Z" fill={color}/>
    <path d="M12 17.25C11.59 17.25 11.25 16.91 11.25 16.5V7.5C11.25 7.09 11.59 6.75 12 6.75C12.41 6.75 12.75 7.09 12.75 7.5V16.5C12.75 16.91 12.41 17.25 12 17.25Z" fill={color}/>
    <path d="M12 22.75C6.07 22.75 1.25 17.93 1.25 12C1.25 6.07 6.07 1.25 12 1.25C12.41 1.25 12.75 1.59 12.75 2C12.75 2.41 12.41 2.75 12 2.75C6.9 2.75 2.75 6.9 2.75 12C2.75 17.1 6.9 21.25 12 21.25C17.1 21.25 21.25 17.1 21.25 12C21.25 11.59 21.59 11.25 22 11.25C22.41 11.25 22.75 11.59 22.75 12C22.75 17.93 17.93 22.75 12 22.75Z" fill={color}/>
    <path d="M21 7.75H17C16.59 7.75 16.25 7.41 16.25 7V3C16.25 2.59 16.59 2.25 17 2.25C17.41 2.25 17.75 2.59 17.75 3V6.25H21C21.41 6.25 21.75 6.59 21.75 7C21.75 7.41 21.41 7.75 21 7.75Z" fill={color}/>
    <path d="M17 7.75C16.81 7.75 16.62 7.68 16.47 7.53C16.18 7.24 16.18 6.76 16.47 6.47L21.47 1.47C21.76 1.18 22.24 1.18 22.53 1.47C22.82 1.76 22.82 2.24 22.53 2.53L17.53 7.53C17.38 7.68 17.19 7.75 17 7.75Z" fill={color}/>
  </svg>
);

// Commission Icon - Percentage symbol
export const CommissionIcon = ({ size = 24, color = "#011C39" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.5 10C9.32843 10 10 9.32843 10 8.5C10 7.67157 9.32843 7 8.5 7C7.67157 7 7 7.67157 7 8.5C7 9.32843 7.67157 10 8.5 10Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M15.5 17C16.3284 17 17 16.3284 17 15.5C17 14.6716 16.3284 14 15.5 14C14.6716 14 14 14.6716 14 15.5C14 16.3284 14.6716 17 15.5 17Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M16 8L8 16" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Withdrawal/Wallet Icon with card
export const WithdrawalIcon = ({ size = 24, color = "#011C39" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18.04 13.55C17.62 13.96 17.38 14.55 17.44 15.18C17.53 16.26 18.52 17.05 19.6 17.05H21.5V18.24C21.5 20.31 19.81 22 17.74 22H6.26C4.19 22 2.5 20.31 2.5 18.24V11.51C2.5 9.44 4.19 7.75 6.26 7.75H17.74C19.81 7.75 21.5 9.44 21.5 11.51V12.95H19.48C18.92 12.95 18.41 13.17 18.04 13.55Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M2.5 12.41V7.84C2.5 6.65 3.23 5.59 4.34 5.17L12.28 2.17C13.52 1.7 14.85 2.62 14.85 3.95V7.75" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22.56 13.97V16.03C22.56 16.58 22.12 17.03 21.56 17.05H19.6C18.52 17.05 17.53 16.26 17.44 15.18C17.38 14.55 17.62 13.96 18.04 13.55C18.41 13.17 18.92 12.95 19.48 12.95H21.56C22.12 12.97 22.56 13.42 22.56 13.97Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 12H14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Net Revenue Icon (same as Withdrawal)
export const NetRevenueIcon = WithdrawalIcon;

// Subscription Icon - Crown
export const SubscriptionIcon = ({ size = 24, color = "#011C39" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M16.7 18.98H7.30002C6.88002 18.98 6.41002 18.65 6.27002 18.25L2.13002 6.66999C1.54002 5.00999 2.23002 4.49999 3.65002 5.51999L7.55002 8.30999C8.20002 8.75999 8.94002 8.52999 9.22002 7.79999L10.98 3.10999C11.54 1.60999 12.47 1.60999 13.03 3.10999L14.79 7.79999C15.07 8.52999 15.81 8.75999 16.45 8.30999L20.11 5.69999C21.67 4.57999 22.42 5.14999 21.78 6.95999L17.74 18.27C17.59 18.65 17.12 18.98 16.7 18.98Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M6.5 22H17.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M9.5 14H14.5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Pending Icon - Clock (for Payouts)
export const PendingIcon = ({ size = 24, color = "#011C39" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5"/>
    <path d="M12 6V12L16 14" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Total Paid Icon - Wallet with checkmark
export const TotalPaidIcon = ({ size = 24, color = "#011C39" }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 19C9 19.75 8.79 20.46 8.42 21.06C7.73 22.22 6.46 23 5 23C3.54 23 2.27 22.22 1.58 21.06C1.21 20.46 1 19.75 1 19C1 16.79 2.79 15 5 15C7.21 15 9 16.79 9 19Z" stroke={color} strokeWidth="1.5" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3.44 19L4.43 19.99L6.56 18.02" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M17.75 7.05C17.51 7.01 17.26 7 17 7H7C6.72 7 6.45 7.02 6.19 7.06C6.33 6.78 6.53 6.52 6.77 6.28L10.02 3.02C11.39 1.66 13.61 1.66 14.98 3.02L16.73 4.79C17.37 5.42 17.71 6.22 17.75 7.05Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 12V17C22 20 20 22 17 22H7.63C7.94 21.74 8.21 21.42 8.42 21.06C8.79 20.46 9 19.75 9 19C9 16.79 7.21 15 5 15C3.8 15 2.73 15.53 2 16.36V12C2 9.28 3.64 7.38 6.19 7.06C6.45 7.02 6.72 7 7 7H17C17.26 7 17.51 7.01 17.75 7.05C20.33 7.35 22 9.26 22 12Z" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 12.5H19C17.9 12.5 17 13.4 17 14.5C17 15.6 17.9 16.5 19 16.5H22" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// =====================================================
// CPA/AGENT DASHBOARD ICONS (Larger, themed colors)
// =====================================================

// Dollar Icon (36x36, Teal)
export const DollarIconLarge = ({ size = 36, color = "#00D1A0" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.05 21.33C13.05 23.22 14.535 24.75 16.365 24.75H20.1C21.69 24.75 22.98 23.415 22.98 21.765C22.98 19.98 22.2 19.35 21.06 18.945L14.97 16.845C13.83 16.44 13.05 15.81 13.05 14.025C13.05 12.375 14.34 11.04 15.93 11.04H19.665C21.495 11.04 22.98 12.57 22.98 14.46" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 9V27" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18 33C26.2843 33 33 26.2843 33 18C33 9.71573 26.2843 3 18 3C9.71573 3 3 9.71573 3 18C3 26.2843 9.71573 33 18 33Z" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Wallet Icon (36x36, Teal)
export const WalletIconLarge = ({ size = 36, color = "#00D1A0" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M32.25 18V24C32.25 30 30 32.25 24 32.25H12C6 32.25 3.75 30 3.75 24V12C3.75 6 6 3.75 12 3.75H24C30 3.75 32.25 6 32.25 12" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M32.25 18H26.25C24.6 18 23.25 19.35 23.25 21C23.25 22.65 24.6 24 26.25 24H32.25" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Users Icon (36x36, Teal) - Team icon
export const UsersIconLarge = ({ size = 36, color = "#00D1A0" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M27.0001 10.695C26.9101 10.68 26.8051 10.68 26.7151 10.695C24.5551 10.62 22.8301 8.84998 22.8301 6.65998C22.8301 4.42498 24.6301 2.60998 26.8801 2.60998C29.1151 2.60998 30.9301 4.40998 30.9301 6.65998C30.9151 8.84998 29.1901 10.62 27.0001 10.695Z" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M25.4699 21.675C27.6149 22.035 29.9699 21.66 31.6199 20.49C33.8249 19.02 33.8249 16.575 31.6199 15.105C29.9549 13.935 27.5699 13.56 25.4249 13.935" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M8.95504 10.695C9.04504 10.68 9.15004 10.68 9.24004 10.695C11.4 10.62 13.125 8.84998 13.125 6.65998C13.125 4.42498 11.325 2.60998 9.07504 2.60998C6.84004 2.60998 5.02504 4.40998 5.02504 6.65998C5.04004 8.84998 6.76504 10.62 8.95504 10.695Z" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10.485 21.675C8.34003 22.035 5.98503 21.66 4.33503 20.49C2.13003 19.02 2.13003 16.575 4.33503 15.105C6.00003 13.935 8.38503 13.56 10.53 13.935" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M18.0001 22.005C17.9101 21.99 17.8051 21.99 17.7151 22.005C15.5551 21.93 13.8301 20.16 13.8301 17.97C13.8301 15.735 15.6301 13.92 17.8801 13.92C20.1151 13.92 21.9301 15.72 21.9301 17.97C21.9151 20.16 20.1901 21.945 18.0001 22.005Z" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.635 26.43C11.43 27.9 11.43 30.345 13.635 31.815C16.14 33.495 20.265 33.495 22.77 31.815C24.975 30.345 24.975 27.9 22.77 26.43C20.28 24.765 16.14 24.765 13.635 26.43Z" stroke={color} strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Calendar Icon (36x36, Teal)
export const CalendarIconLarge = ({ size = 36, color = "#00D1A0" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 3V7.5" stroke={color} strokeWidth="2.25" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M24 3V7.5" stroke={color} strokeWidth="2.25" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M5.25 13.635H30.75" stroke={color} strokeWidth="2.25" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M31.5 12.75V25.5C31.5 30 29.25 33 24 33H12C6.75 33 4.5 30 4.5 25.5V12.75C4.5 7.5 6.75 4.5 12 4.5H24C29.25 4.5 31.5 7.5 31.5 12.75Z" stroke={color} strokeWidth="2.25" strokeMiterlimit="10" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Clock Icon Large (36x36, Teal)
export const ClockIconLarge = ({ size = 36, color = "#00D1A0" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="18" cy="18" r="13.5" stroke={color} strokeWidth="2"/>
    <path d="M18 9V18L24 21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Link Icon (28x28, Teal) - For referral links
export const LinkIconLarge = ({ size = 28, color = "#00D1A0" }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14.7 19.8333H15.75C18.6667 19.8333 21 17.5 21 14.5833C21 11.6667 18.6667 9.33334 15.75 9.33334H14.7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M13.3 9.33334H12.25C9.33334 9.33334 7 11.6667 7 14.5833C7 17.5 9.33334 19.8333 12.25 19.8333H13.3" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M11.6667 14.5833H16.3333" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Check Circle Icon (36x36, Teal) - Success states
export const CheckCircleIcon = ({ size = 36, color = "#00D1A0" }) => (
  <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 33C26.2843 33 33 26.2843 33 18C33 9.71573 26.2843 3 18 3C9.71573 3 3 9.71573 3 18C3 26.2843 9.71573 33 18 33Z" stroke={color} strokeWidth="2"/>
    <path d="M12 18L16.5 22.5L25.5 13.5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// =====================================================
// EMPTY STATE ILLUSTRATIONS
// =====================================================

// Empty Payout Illustration
export const EmptyPayoutIllustration = () => (
  <svg width="200" height="180" viewBox="0 0 200 180" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="100" cy="165" rx="60" ry="8" fill="#E3E6EA" fillOpacity="0.5"/>
    <rect x="60" y="50" width="80" height="100" rx="8" fill="#F7F9FC" stroke="#E3E6EA" strokeWidth="2"/>
    <rect x="75" y="70" width="50" height="6" rx="3" fill="#E3E6EA"/>
    <rect x="75" y="85" width="35" height="6" rx="3" fill="#E3E6EA"/>
    <rect x="75" y="100" width="42" height="6" rx="3" fill="#E3E6EA"/>
    <circle cx="100" cy="130" r="12" fill="#F7F9FC" stroke="#00D1A0" strokeWidth="2"/>
    <path d="M96 130L99 133L105 127" stroke="#00D1A0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// Empty Performance Illustration
export const EmptyPerformanceIllustration = () => (
  <svg width="300" height="257" viewBox="0 0 300 257" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="150" cy="240" rx="80" ry="10" fill="#E3E6EA" fillOpacity="0.5"/>
    <path d="M150 40C120 40 95 65 95 95C95 110 100 123 110 133L90 200H210L190 133C200 123 205 110 205 95C205 65 180 40 150 40Z" fill="#F7F9FC" stroke="#E3E6EA" strokeWidth="2"/>
    <circle cx="130" cy="85" r="8" fill="#00D1A0"/>
    <circle cx="150" cy="75" r="8" fill="#00D1A0"/>
    <circle cx="170" cy="85" r="8" fill="#00D1A0"/>
    <ellipse cx="150" cy="50" rx="30" ry="15" fill="#F7F9FC" stroke="#E3E6EA" strokeWidth="2"/>
    <line x1="150" y1="200" x2="150" y2="220" stroke="#E3E6EA" strokeWidth="2" strokeDasharray="4 4"/>
    <path d="M120 220L150 240L180 220" stroke="#E3E6EA" strokeWidth="2"/>
  </svg>
);
