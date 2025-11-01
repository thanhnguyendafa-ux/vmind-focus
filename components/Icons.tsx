

import React from 'react';

const iconProps = {
  className: "w-6 h-6",
  strokeWidth: 1.5
};

export const YouTubeIcon = (props: { className?: string }) => (
    <svg {...props} viewBox="0 0 28 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M27.3278 3.10001C27.0007 1.87144 26.027 0.901581 24.7942 0.578131C22.6288 0 14 0 14 0C14 0 5.37123 0 3.20579 0.578131C1.97302 0.901581 0.999271 1.87144 0.672236 3.10001C0 5.25313 0 10 0 10C0 10 0 14.7469 0.672236 16.9C0.999271 18.1286 1.97302 19.0984 3.20579 19.4219C5.37123 20 14 20 14 20C14 20 22.6288 20 24.7942 19.4219C26.027 19.0984 27.0007 18.1286 27.3278 16.9C28 14.7469 28 10 28 10C28 10 28 5.25313 27.3278 3.10001Z" />
        <path d="M11.1982 14.2812V5.71875L18.4982 9.99375L11.1982 14.2812Z" fill="white"/>
    </svg>
);

export const HomeIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" /></svg>;
export const TableIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 4H5a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zM9 14H5a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1zM19 4h-4a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V5a1 1 0 00-1-1zM19 14h-4a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1v-4a1 1 0 00-1-1z" /></svg>;
export const LibraryIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9V3m0 18a9 9 0 00-9-9m9 9a9 9 0 009-9" /></svg>;
export const StudyIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="3" width="20" height="27" rx="2" fill="#FEFCE8"/>
    <path d="M12 3C12 1.89543 12.8954 1 14 1H18C19.1046 1 20 1.89543 20 3V7H12V3Z" fill="#D1D5DB"/>
    <path d="M10 12H20" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 16H22" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 20H18" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M10 24H22" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19 14.5L14.5 19L12.5 17" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M22 28L26 24L25.2929 23.2929C24.9024 22.9024 24.2692 22.9024 23.8787 23.2929L23 24L22.2929 24.7071C21.9024 25.0976 21.9024 25.7308 22.2929 26.1213L23 27L22 28Z" fill="#FBBF24"/>
  </svg>
);
export const FlashcardIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
    <filter id="shadow" x="-5" y="-5" width="42" height="42" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
    <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
    <feOffset dy="1"/>
    <feGaussianBlur stdDeviation="1"/>
    <feComposite in2="hardAlpha" operator="out"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.1 0"/>
    <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_1_2"/>
    <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow_1_2" result="shape"/>
    </filter>
    </defs>
    <g filter="url(#shadow)">
    <rect x="8" y="12" width="22" height="15" rx="2" fill="#DDD6FE"/>
    </g>
    <g filter="url(#shadow)">
    <rect x="5" y="9" width="22" height="15" rx="2" fill="#C4B5FD"/>
    </g>
    <g filter="url(#shadow)">
    <rect x="2" y="6" width="22" height="15" rx="2" fill="#A78BFA"/>
    </g>
    <path d="M13 12.5L14.1818 10.8182L16 10L14.1818 9.18182L13 7.5L11.8182 9.18182L10 10L11.8182 10.8182L13 12.5Z" fill="white"/>
  </svg>
);
export const StatsIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>;
export const RewardIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0l15.482 0m-15.482 0a49.977 49.977 0 01-2.658-.813M15 5.25a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
export const SettingsIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066 2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
export const FolderIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>;

export const BookOpenIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="glow" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(16 16) rotate(90) scale(14)">
      <stop stopColor="white" stopOpacity="0.7"/>
      <stop offset="1" stopColor="white" stopOpacity="0"/>
      </radialGradient>
    </defs>
    <path d="M4 27C4 27 4 5 15 5C15 5 15.5 27 4 27Z" fill="#2563EB"/>
    <path d="M28 27C28 27 28 5 17 5C17 5 16.5 27 28 27Z" fill="#3B82F6"/>
    <path d="M16 5C16 5 16.5 27 28 27C28 27 28 5 17 5C16.8333 5 16 5 16 5Z" fill="url(#glow)"/>
    <path d="M7 11H13" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 15H11" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M7 19H13" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19 11H25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19 15H23" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M19 19H25" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const ScrambleIcon = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="6" width="10" height="6" rx="1" fill="#A78BFA"/>
      <rect x="18" y="6" width="10" height="6" rx="1" fill="#C4B5FD"/>
      <rect x="4" y="20" width="10" height="6" rx="1" fill="#DDD6FE"/>
      <rect x="18" y="20" width="10" height="6" rx="1" fill="#A78BFA"/>
      <path d="M12 14L20 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
      <path d="M20 14L12 18" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
    </svg>
);

export const DictationIcon = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 10C6 6.68629 8.68629 4 12 4H13C16.3137 4 19 6.68629 19 10V18C19 21.3137 16.3137 24 13 24H12C8.68629 24 6 21.3137 6 18V10Z" fill="#BFDBFE"/>
        <path d="M22 13V19" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M26 10V22" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M12 28L18 22" stroke="#FBBF24" strokeWidth="2.5" strokeLinecap="round"/>
        <path d="M11 27L12.5 28.5L10.5 30.5" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const CheckCircleIcon = (props: { className?: string }) => <svg {...props} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
export const XCircleIcon = (props: { className?: string }) => <svg {...props} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
export const UncheckedCircleIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;

export const McqIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h.01M3.75 12h.01m-.01 5.25h.01" /></svg>;
export const TfIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 5.25l-15 15" /></svg>;
export const TypingIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6.75 7.5l3 3m0 0l3-3m-3 3v12" /><path d="M16.5 10.5h.75c.621 0 1.125.504 1.125 1.125v1.5c0 .621-.504 1.125-1.125 1.125h-.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5H18v4.5h-1.5" /></svg>;

export const CloseIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>;
export const UploadIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>;
export const DownloadIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>;
export const EditIcon = (props: { className?: string }) => <svg {...iconProps} {...props} className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>;

export const TableViewIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18" /></svg>;
export const CardViewIcon = () => <svg {...iconProps} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>;
export const ChevronLeftIcon = () => <svg {...iconProps} className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>;
export const ChevronRightIcon = () => <svg {...iconProps} className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>;

export const UserIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>;
export const ImageIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" /></svg>;

export const FilterIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455 .232 7.973 .697.18.035.352.12.49.255.138.135.217.318.237.511C20.96 6.883 21 9.421 21 12c0 2.579-.04 5.117-.2 7.537a.933.933 0 01-.237.511.884.884 0 01-.49.255C17.455 20.768 14.755 21 12 21s-5.455-.232-7.973-.697a.884.884 0 01-.49-.255.933.933 0 01-.237-.511C3.04 17.117 3 14.579 3 12c0-2.579.04-5.117.2-7.537a.933.933 0 01.237-.511.884.884 0 01.49-.255C6.545 3.232 9.245 3 12 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l6 6m0-6l-6 6" /></svg>;
export const SortAscIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M3 8h12M3 12h9m-9 4h6m4-11l4 4m0 0l4-4m-4 4v12" /></svg>;
export const GroupIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 3v18M18 3v18M3 6h3m-3 6h3m-3 6h3m15-12h-3m3 6h-3m3 6h-3" /></svg>;
export const EyeIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>;
export const EyeOffIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.243 4.243L6.228 6.228" /></svg>;
export const PlusIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
export const TrashIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.124-2.037-2.124H9.757C8.57 3.31 7.646 4.234 7.646 5.39v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>;
export const ChevronDownIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;
export const TagIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>;
export const DragHandleIcon = (props: { className?: string }) => <svg {...props} viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.5"></circle><circle cx="15" cy="6" r="1.5"></circle><circle cx="9" cy="12" r="1.5"></circle><circle cx="15" cy="12" r="1.5"></circle><circle cx="9" cy="18" r="1.5"></circle><circle cx="15" cy="18" r="1.5"></circle></svg>;

export const ArrowUpIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" /></svg>;
export const ArrowDownIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>;

export const SearchIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;

export const SaveIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M5 5.25a2.25 2.25 0 012.25-2.25h8.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25-2.25H11.25a2.25 2.25 0 01-2.25-2.25v-2.25a.75.75 0 00-1.5 0v2.25a3.75 3.75 0 003.75 3.75h5.25a3.75 3.75 0 003.75-3.75V8.25a3.75 3.75 0 00-3.75-3.75H5.25a2.25 2.25 0 01-2.25-2.25V6.75a.75.75 0 00-1.5 0v-1.5z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 10.5v3" /><path strokeLinecap="round" strokeLinejoin="round" d="M10.5 12h3" /></svg>;
export const FolderOpenIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75v10.5a1.5 1.5 0 001.5 1.5h13.5a1.5 1.5 0 001.5-1.5V9.75" /><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9.75l.75-1.5h15l.75 1.5M4.5 5.25v-2.25a1.5 1.5 0 011.5-1.5h2.25a1.5 1.5 0 011.5 1.5v2.25" /></svg>;

export const TrophyIcon = (props: { className?: string }) => (
  <svg {...props} viewBox="0 0 24 24" fill="currentColor">
    <path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v.75A.75.75 0 0121 9h-1.008a3.751 3.751 0 01-3.61-2.25H9.618a3.751 3.751 0 01-3.61 2.25H5.001A.75.75 0 014.25 9V7.5a3 3 0 013-3H8.25V3a.75.75 0 01-.75-.75zM5.001 10.5h1.752a2.25 2.25 0 012.126 1.5H15.12a2.25 2.25 0 012.126-1.5h1.752v6.236a.75.75 0 01-.22.53l-2.25 2.25a.75.75 0 01-.53.22H8.001a.75.75 0 01-.53-.22l-2.25-2.25a.75.75 0 01-.22-.53V10.5z" clipRule="evenodd" />
  </svg>
);

export const TimeBadgeIcon01 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" fill="#E0F2F1" stroke="#4DB6AC" strokeWidth="2"/>
    <path d="M12 7V12L16 14" stroke="#00796B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const TimeBadgeIcon02 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M18 2H6V6L10 10L6 14V18H18V14L14 10L18 6V2Z" fill="#FFFDE7" stroke="#FFD54F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M10 10H14" stroke="#FBC02D" strokeWidth="1"/>
    <path d="M6 6H18" stroke="#FFF59D" strokeWidth="1"/>
    <path d="M6 18H18" stroke="#FFF59D" strokeWidth="1"/>
  </svg>
);

export const TimeBadgeIcon03 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="9" fill="#FFECB3" stroke="#FFA726" strokeWidth="2"/>
    <path d="M12 12L16.2426 7.75736" stroke="#FB8C00" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 2V5" stroke="#FB8C00" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const TimeBadgeIcon04 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M4 6C4 4.89543 4.89543 4 6 4H18C19.1046 4 20 4.89543 20 6V20C20 21.1046 19.1046 22 18 22H6C4.89543 22 4 21.1046 4 20V6Z" fill="#E8F5E9" stroke="#66BB6A" strokeWidth="2"/>
    <path d="M16 2V6" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round"/>
    <path d="M8 2V6" stroke="#4CAF50" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4 10H20" stroke="#A5D6A7" strokeWidth="1.5"/>
    <rect x="7" y="13" width="2" height="2" rx="0.5" fill="#388E3C"/>
    <rect x="11" y="13" width="2" height="2" rx="0.5" fill="#388E3C"/>
    <rect x="15" y="13" width="2" height="2" rx="0.5" fill="#388E3C"/>
  </svg>
);

export const TimeBadgeIcon05 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="13" r="8" fill="#FFEBEE" stroke="#E57373" strokeWidth="2"/>
    <path d="M12 5V2L14 4L12 2L10 4" stroke="#D32F2F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 13L15 10" stroke="#F44336" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const TimeBadgeIcon06 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12.79C21 10.21 20.06 7.78 18.36 5.87C17.65 5.05 16.8 4.35 15.84 3.84C12.82 2.22 9.06 3.08 6.93 5.65C3.8 9.36 4.71 14.88 8.43 18C12.14 21.12 17.66 20.21 20.78 16.5C21.46 15.58 21.78 14.47 21.79 13.33L21 12.79Z" fill="#E8EAF6" stroke="#7986CB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M7 16L6 17" stroke="#5C6BC0" strokeWidth="2" strokeLinecap="round"/>
    <path d="M11 18L10 19" stroke="#5C6BC0" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 13L8 14" stroke="#5C6BC0" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const TimeBadgeIcon07 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" fill="#FFF59D" stroke="#FBC02D" strokeWidth="2"/>
    <path d="M12 1V3" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round"/>
    <path d="M12 21V23" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.22 4.22L5.64 5.64" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18.36 18.36L19.78 19.78" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round"/>
    <path d="M1 12H3" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round"/>
    <path d="M21 12H23" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round"/>
    <path d="M4.22 19.78L5.64 18.36" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round"/>
    <path d="M18.36 5.64L19.78 4.22" stroke="#FBC02D" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const TimeBadgeIcon08 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M17 10C17 7.23858 14.7614 5 12 5C9.23858 5 7 7.23858 7 10C7 12.7614 9.23858 15 12 15C14.7614 15 17 12.7614 17 10Z" fill="#D7CCC8" stroke="#8D6E63" strokeWidth="2"/>
    <path d="M12 15V22" stroke="#A1887F" strokeWidth="2" strokeLinecap="round"/>
    <path d="M15 12H19" stroke="#A1887F" strokeWidth="2" strokeLinecap="round"/>
    <path d="M9 12H5" stroke="#A1887F" strokeWidth="2" strokeLinecap="round"/>
    <path d="M13.5 13.5L16.5 16.5" stroke="#A1887F" strokeWidth="2" strokeLinecap="round"/>
    <path d="M10.5 13.5L7.5 16.5" stroke="#A1887F" strokeWidth="2" strokeLinecap="round"/>
    <path d="M13.5 10.5L17.5 6.5" stroke="#6D4C41" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const TimeBadgeIcon09 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="8" fill="#CFD8DC" stroke="#78909C" strokeWidth="2"/>
    <circle cx="12" cy="12" r="6" fill="#ECEFF1"/>
    <path d="M12 9V12L14 13" stroke="#546E7A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 4V2" stroke="#78909C" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="12" cy="3" r="1" fill="#78909C"/>
  </svg>
);

export const TimeBadgeIcon10 = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style={{stopColor:'#81D4FA', stopOpacity:1}} />
        <stop offset="100%" style={{stopColor:'#80CBC4', stopOpacity:1}} />
      </linearGradient>
    </defs>
    <path d="M12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3Z" fill="url(#grad1)" />
    <path d="M12 7V12L15 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M12 21C14.0265 21 15.9018 20.4103 17.4352 19.3113C18.9686 18.2123 20.086 16.6534 20.6134 14.8661" stroke="white" strokeOpacity="0.5" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const MailIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" /></svg>;
export const LockClosedIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;

export const SparklesIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.562L16.25 21.75l-.648-1.188a2.25 2.25 0 01-1.4-1.4l-1.188-.648 1.188-.648a2.25 2.25 0 011.4-1.4l.648-1.188.648 1.188a2.25 2.25 0 011.4 1.4l1.188.648-1.188.648a2.25 2.25 0 01-1.4 1.4z" /></svg>;

export const SpinnerIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 3v3m0 12v3m9-9h-3M3 9H6m12.728-6.728l-2.122 2.122M6.728 17.272l-2.122 2.122m12.728 0l-2.122-2.122m-8.484-8.484l-2.122-2.122" /></svg>;
export const DotsVerticalIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 5v.01M12 12v.01M12 19v.01M12 3a2 2 0 110 4 2 2 0 010-4zm0 7a2 2 0 110 4 2 2 0 010-4zm0 7a2 2 0 110 4 2 2 0 010-4z" /></svg>;
export const MoveIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-4.5 0V6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75" /></svg>;

export const ClockIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>;
export const RepeatIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 00-11.667 0l-3.181 3.183" /></svg>;
export const RepeatOneIcon = (props: { className?: string }) => (
  <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.667 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 00-11.667 0l-3.181 3.183" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.5 10.5l1-1v5" />
  </svg>
);
export const TrendingUpIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-3.182 3.182m3.182-3.182v4.5m0-4.5h-4.5" /></svg>;
export const AlertTriangleIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" /></svg>;

export const VmindIcon: React.FC<{ isActive?: boolean }> = ({ isActive }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="vmind-gradient" x1="4.5" y1="3" x2="19.5" y2="21" gradientUnits="userSpaceOnUse">
        <stop stopColor="#2DD4BF" />
        <stop offset="1" stopColor="#38BDF8" />
      </linearGradient>
    </defs>
    <path d="M17.5 4.5C15.24 4.5 14.03 5.92 13.2 7C12.63 7.71 12.32 8.5 12 9.5C11.68 8.5 11.37 7.71 10.8 7C9.97 5.92 8.76 4.5 6.5 4.5C3.49 4.5 2 6.5 2 9.5C2 11.5 3.05 13.43 4.5 14.5C5.52 15.28 6.5 16.5 6.5 18H17.5C17.5 16.5 18.48 15.28 19.5 14.5C20.95 13.43 22 11.5 22 9.5C22 6.5 20.51 4.5 17.5 4.5Z" fill={isActive ? "url(#vmind-gradient)" : "currentColor"} />
    <path d="M12 12.5L13.1818 10.8182L15 10L13.1818 9.18182L12 7.5L10.8182 9.18182L9 10L10.8182 10.8182L12 12.5Z" fill={isActive ? "white" : "#A1A1AA"} />
  </svg>
);
export const TargetIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 13a3 3 0 100-6 3 3 0 000 6z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 5V3m0 18v-2m-7-9H3m18 0h-2" /></svg>;
export const TrendingDownIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6L9 12.75l4.286-4.286a11.948 11.948 0 014.306 6.43l.776 2.898m0 0l3.182-3.182m-3.182 3.182v-4.5m0 4.5h-4.5" /></svg>;
export const ClockRewindIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 9.75L12 6v3.75" /></svg>;

export const SpeakerIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" /></svg>;
export const PlayIcon = (props: { className?: string }) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>;
export const PauseIcon = (props: { className?: string }) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>;
export const AudioWaveIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5l.415-.207a.75.75 0 011.06.022L10.5 8.25l.415-.207a.75.75 0 011.06.022L12.5 9l.415-.207a.75.75 0 011.06.022L14.5 9.75l.415-.207a.75.75 0 011.06.022L16.5 10.5m-8.25 4.5l.415-.207a.75.75 0 011.06.022L10.5 15.75l.415-.207a.75.75 0 011.06.022L12.5 16.5l.415-.207a.75.75 0 011.06.022L14.5 17.25l.415-.207a.75.75 0 011.06.022L16.5 18m-8.25-9v6m2.503-5.498v4.996m2.504-4.495v3.992m2.504-3.492v2.99" /></svg>;
export const TheaterModeIcon = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="projector-beam-gradient" x1="17" y1="11" x2="32" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#2DD4BF"/>
                <stop offset="1" stopColor="#A78BFA" stopOpacity="0.7"/>
            </linearGradient>
        </defs>
        <path d="M22 25L32 30V14L22 19V25Z" fill="url(#projector-beam-gradient)"/>
        <circle cx="8" cy="8" r="4.5" fill="#CBD5E1"/>
        <circle cx="17" cy="8" r="4.5" fill="#CBD5E1"/>
        <path d="M19 13H5C3.89543 13 3 13.8954 3 15V26C3 27.1046 3.89543 28 5 28H19C20.1046 28 21 27.1046 21 26V15C21 13.8954 20.1046 13 19 13Z" fill="#94A3B8"/>
        <circle cx="12" cy="20.5" r="4.5" fill="#475569"/>
        <circle cx="12" cy="20.5" r="2.5" fill="#F1F5F9"/>
        <path d="M8 8.5L16.5 8.5" stroke="#94A3B8" strokeWidth="2"/>
    </svg>
);

export const GoogleIcon = (props: { className?: string }) => (
    <svg {...props} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.9999 12.2273C21.9999 11.3977 21.9272 10.5864 21.7863 9.81818H12.2726V14.4773H17.7885C17.5453 15.9455 16.7271 17.2182 15.4408 18.0455V20.8409H19.2135C20.9794 19.2318 21.9999 16.9182 21.9999 12.2273Z" fill="#4285F4"/>
        <path d="M12.2727 22C15.2727 22 17.7955 21.0227 19.4545 19.5L15.9545 17.0682C14.9773 17.75 13.75 18.1591 12.2727 18.1591C9.36364 18.1591 6.88636 16.25 5.95455 13.6364H2.04545V16.1136C3.72727 19.5 7.63636 22 12.2727 22Z" fill="#34A853"/>
        <path d="M5.95455 13.6364C5.68182 12.8636 5.52273 12.0455 5.52273 11.25C5.52273 10.4545 5.68182 9.63636 5.95455 8.86364V6.38636H2.18182C0.795455 9.04545 0.795455 12.1364 2.18182 14.7955L5.95455 13.6364Z" fill="#FBBC05"/>
        <path d="M12.2727 5.09091C13.8636 5.09091 15.1136 5.68182 15.9318 6.45455L19.5227 2.86364C17.7955 1.25455 15.2727 0 12.2727 0C7.63636 0 3.72727 2.5 2.04545 5.88636L5.95455 8.13636C6.88636 5.52273 9.36364 5.09091 12.2727 5.09091Z" fill="#EA4335"/>
    </svg>
);

export const JournalIcon = () => (
  <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="2" width="24" height="28" rx="2" fill="#F97316"/>
    <rect x="6" y="2" width="2" height="28" fill="#FB923C"/>
    <path d="M19 2V30" stroke="#DC2626" strokeWidth="2"/>
    <rect x="3" y="10" width="26" height="3" rx="1.5" fill="#374151"/>
  </svg>
);

export const BookmarkIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" /></svg>;
export const BookmarkFilledIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="currentColor" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" /></svg>;
export const PrintIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm-3-14H9a2 2 0 00-2 2v2h10V7a2 2 0 00-2-2z" /></svg>;

export const ChatIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193l-3.72 3.72a1.5 1.5 0 01-2.12 0l-3.72-3.72H4.98c-1.136 0-1.98-.967-1.98-2.193V10.608c0-.97.616-1.813 1.5-2.097m16.5 0a2.25 2.25 0 00-2.25-2.25H4.5A2.25 2.25 0 002.25 8.511" /></svg>;
export const SendIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" /></svg>;

export const MusicNoteIcon = (props: { className?: string }) => <svg {...props} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.07 1.918l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 16.17a2.25 2.25 0 01-1.07-1.918v-3.75m11.25-4.5l4.5 1.94m-16.5 0L21 9" /></svg>;
export const SkipBackIcon = (props: { className?: string }) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/></svg>;
export const SkipForwardIcon = (props: { className?: string }) => <svg {...props} fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>;

export const ArrowsPointingOutIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9M20.25 20.25h-4.5m4.5 0v-4.5m0 4.5L15 15" /></svg>;
export const ArrowsPointingInIcon = (props: { className?: string }) => <svg {...iconProps} {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5M15 15l5.25 5.25" /></svg>;