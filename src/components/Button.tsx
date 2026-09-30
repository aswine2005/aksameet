import clsx from 'clsx';
import React, { ReactNode } from 'react';

interface ButtonProps {
  children: ReactNode;
  onClick?: () => void;
  size?: 'sm' | 'md' | 'lg';
  rounding?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit';
}

const Button = ({
  children,
  onClick,
  size = 'lg',
  rounding = 'sm',
  disabled = false,
  className,
  type = 'button',
}: ButtonProps) => {
  return (
    <button
      type={type}
      onClick={onClick}
      className={clsx(
        size === 'sm' && 'h-10 text-sm px-5',
        size === 'md' && 'h-12 text-base px-6',
        size === 'lg' && 'h-14 text-base px-8',
        rounding === 'sm' ? 'rounded-xl' : rounding === 'md' ? 'rounded-2xl' : 'rounded-full',
        'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 inline-flex items-center justify-center text-center font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 active:scale-95 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed disabled:shadow-none select-none',
        !disabled && 'hover:scale-105',
        className
      )}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export default Button;
