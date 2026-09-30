import { ReactElement, ReactNode } from 'react';
import clsx from 'clsx';

interface ButtonWithIconProps {
  children: ReactNode;
  icon: ReactElement;
  onClick?: () => void;
  rounding?: 'sm' | 'md' | 'lg';
  size?: 'sm' | 'md';
  variant?: 'primary' | 'secondary';
  className?: string;
}

const ButtonWithIcon = ({
  icon,
  children,
  onClick,
  rounding = 'md',
  size = 'md',
  variant = 'primary',
  className,
}: ButtonWithIconProps) => {
  return (
    <button
      onClick={onClick}
      className={clsx(
        rounding === 'sm' && 'rounded-lg',
        rounding === 'md' && 'rounded-xl',
        rounding === 'lg' && 'rounded-full',
        size === 'sm'
          ? 'h-10 text-sm px-4 gap-2'
          : 'h-12 text-base px-5 gap-2.5',
        variant === 'primary' && 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700',
        variant === 'secondary' && 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700',
        'inline-flex items-center justify-center text-center font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300 active:scale-95',
        className
      )}
    >
      <span className="flex items-center justify-center">{icon}</span>
      {children}
    </button>
  );
};

export default ButtonWithIcon;
