import React, { useRef, useEffect } from 'react';

interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  className?: string;
}

const Dropdown: React.FC<DropdownProps> = ({ trigger, children, isOpen, onToggle, className = "w-[calc(100vw-4rem)] max-w-sm sm:w-80" }) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
            onToggle();
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  return (
    <div className="relative" ref={dropdownRef}>
      <div onClick={onToggle} className="cursor-pointer">
        {trigger}
      </div>
      {isOpen && (
        <div 
          className={`absolute top-full mt-2 left-0 sm:left-auto sm:right-0 bg-white rounded-lg shadow-xl border border-slate-200 z-20 p-4 animate-scale-in origin-top-left sm:origin-top-right ${className}`}
        >
          {children}
        </div>
      )}
    </div>
  );
};

export default Dropdown;