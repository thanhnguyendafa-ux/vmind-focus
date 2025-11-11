import * as React from 'react';
import { iconPaths } from './icons';

interface IconProps {
  name: string;
  className?: string;
}

const Icon: React.FC<IconProps> = ({ name, className = 'w-6 h-6' }) => {
  const pathData = iconPaths[name as keyof typeof iconPaths] || '';

  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      fill="none" 
      viewBox="0 0 24 24" 
      strokeWidth={2}
      stroke="currentColor" 
      className={className}
    >
      <path 
        strokeLinecap="round"
        strokeLinejoin="round"
        d={pathData} 
      />
    </svg>
  );
};

export default Icon;