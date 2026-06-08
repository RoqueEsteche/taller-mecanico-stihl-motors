import React from 'react';

type IconProps = React.SVGProps<SVGSVGElement>;

function createIcon(path: React.ReactNode) {
  return React.forwardRef<SVGSVGElement, IconProps>(function Icon({ className, ...props }, ref) {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        {...props}
      >
        {path}
      </svg>
    );
  });
}

export const Search = createIcon(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>);
export const Edit2 = createIcon(<><path d="M4 20h4l10-10-4-4L4 16v4Z" /><path d="m13.5 6.5 4 4" /></>);
export const Trash2 = createIcon(<><path d="M3 6h18" /><path d="M8 6V4h8v2" /><path d="M19 6l-1 14H6L5 6" /></>);
export const X = createIcon(<><path d="M18 6 6 18" /><path d="m6 6 12 12" /></>);
export const Phone = createIcon(<><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.08 4.18 2 2 0 0 1 4.06 2h3a2 2 0 0 1 2 1.72c.12.9.33 1.77.64 2.61a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l1.47-1.25a2 2 0 0 1 2.11-.45c.84.31 1.71.52 2.61.64A2 2 0 0 1 22 16.92Z" /></>);
export const MapPin = createIcon(<><path d="M12 21s-6-5.33-6-11a6 6 0 1 1 12 0c0 5.67-6 11-6 11Z" /><circle cx="12" cy="10" r="2" /></>);
export const ShoppingCart = createIcon(<><circle cx="9" cy="20" r="1" /><circle cx="17" cy="20" r="1" /><path d="M3 4h2l2.4 10.5a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L21 7H7" /></>);
export const Wrench = createIcon(<><path d="M14.7 6.3a4 4 0 0 0 5 5l-9.4 9.4a2 2 0 1 1-2.8-2.8l9.4-9.4a4 4 0 0 1-5-5l2.2 2.2 2.6-.6.6-2.6-2.2-2.2Z" /></>);
export const AlertTriangle = createIcon(<><path d="M12 3 2 21h20L12 3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>);
export const Users = createIcon(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>);
export const ClipboardList = createIcon(<><rect x="8" y="2" width="8" height="4" rx="1" /><path d="M9 4H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /><path d="M9 12h6" /><path d="M9 16h6" /></>);
export const Package = createIcon(<><path d="m12 3 8 4.5-8 4.5L4 7.5 12 3Z" /><path d="M4 7.5V16.5L12 21l8-4.5V7.5" /><path d="M12 12v9" /></>);
export const ArrowRight = createIcon(<><path d="M5 12h14" /><path d="m13 5 7 7-7 7" /></>);
export const Plus = createIcon(<><path d="M12 5v14" /><path d="M5 12h14" /></>);
export const Minus = createIcon(<path d="M5 12h14" />);
export const User = createIcon(<><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="7" r="4" /></>);
export const CreditCard = createIcon(<><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20" /></>);
export const ChevronRight = createIcon(<path d="m9 18 6-6-6-6" />);
export const Truck = createIcon(<><path d="M10 17h4" /><path d="M1 3h15v10H1z" /><path d="M16 8h4l3 3v2h-7Z" /><circle cx="5.5" cy="18.5" r="2.5" /><circle cx="18.5" cy="18.5" r="2.5" /></>);
export const Mail = createIcon(<><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></>);
export const TrendingUp = createIcon(<><path d="M3 17 9 11l4 4 8-8" /><path d="M14 7h7v7" /></>);
export const DollarSign = createIcon(<><path d="M12 2v20" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>);
export const FileSpreadsheet = createIcon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h1" /><path d="M12 9h1" /><path d="M16 9h1" /></>);
export const FileText = createIcon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h3" /></>);
export const Shield = createIcon(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></>);
export const Power = createIcon(<><path d="M12 2v10" /><path d="M18.4 6.6a8 8 0 1 1-12.8 0" /></>);
export const UserPlus = createIcon(<><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><path d="M20 8v6" /><path d="M17 11h6" /></>);
export const KeyRound = createIcon(<><circle cx="7.5" cy="15.5" r="4.5" /><path d="m11 12 9-9" /><path d="m15 7 2 2" /><path d="m17 5 2 2" /></>);
export const Settings = createIcon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01A1.65 1.65 0 0 0 10 3.09V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>);
export const LayoutDashboard = createIcon(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="4" rx="1" /><rect x="14" y="10" width="7" height="11" rx="1" /><rect x="3" y="13" width="7" height="8" rx="1" /></>);
export const LogOut = createIcon(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></>);
export const HardHat = createIcon(<><path d="M4 13a8 8 0 0 1 16 0" /><path d="M2 13h20v5a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-5Z" /><path d="M12 5v8" /></>);
export const ShieldCheck = createIcon(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>);
export const Bell = createIcon(<><path d="M15 17H5l1.4-1.4A2 2 0 0 0 7 14.17V11a5 5 0 1 1 10 0v3.17a2 2 0 0 0 .6 1.43L19 17h-4" /><path d="M10 17a2 2 0 0 0 4 0" /></>);
export const ChevronLeft = createIcon(<path d="m15 18-6-6 6-6" />);
export const Clock = createIcon(<><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>);
export const XCircle = createIcon(<><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></>);
export const CheckCircle = createIcon(<><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>);
export const Eye = createIcon(<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeOff = createIcon(<><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" y1="2" x2="22" y2="22" /></>);
export const Tag = createIcon(<><path d="M12 2H2v10l9.29 9.29a1 1 0 0 0 1.42 0l7.29-7.29a1 1 0 0 0 0-1.42L12 2Z" /><path d="M7 7h.01" /></>);
export const Filter = createIcon(<><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" /></>);
export const MessageSquare = createIcon(<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>);
