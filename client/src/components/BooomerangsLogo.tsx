import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const BooomerangsLogo: React.FC<LogoProps> = ({ className = "", size = 32 }) => {
  return (
    <div 
      className={`rounded-full bg-white flex items-center justify-center font-bold ${className}`}
      style={{
        width: size,
        height: size,
        border: `${Math.max(2, size / 16)}px solid #3b82f6`,
        fontSize: `${size / 2}px`,
        color: '#3b82f6',
        boxShadow: `0 ${size / 8}px ${size / 4}px rgba(59, 130, 246, 0.2)`
      }}
    >
      B
    </div>
  );
};

export default BooomerangsLogo;