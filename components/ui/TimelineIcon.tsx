import React from 'react';

interface TimelineIconProps {
  type: 'joining' | 'promotion' | 'grade' | 'retirement' | 'default';
}

export const TimelineIcon: React.FC<TimelineIconProps> = ({ type }) => {
  const icons = {
    joining: { path: 'M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1m0-16V4', color: 'bg-green-500' },
    promotion: { path: 'M7 11l5-5m0 0l5 5m-5-5v12', color: 'bg-blue-500' },
    grade: { path: 'M5 13l4 4L19 7', color: 'bg-indigo-500' },
    retirement: { path: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1m0-16V4m0 12v1m0-8V8', color: 'bg-red-500' },
    default: { path: 'M8 7h.01M12 7h.01M16 7h.01M9 17h6M9 21h6', color: 'bg-gray-500' }
  };

  const icon = icons[type] || icons.default;

  return (
    <span className={`absolute flex items-center justify-center w-8 h-8 ${icon.color} rounded-full -left-4 ring-4 ring-white`}>
        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={icon.path}></path>
        </svg>
    </span>
  );
};
