import React from 'react';
import clsx from 'clsx';

export interface TextFieldProps
  extends React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  > {
  label: React.ReactNode;
  placeholder: string;
  icon?: React.ReactNode;
}

const TextField = ({
  label,
  name,
  icon,
  maxLength = 60,
  ...inputProps
}: TextFieldProps) => {
  const id = name ? `field-${name}` : undefined;

  return (
    <>
      <label
        htmlFor={id}
        className="mb-2.5 block text-base font-medium text-black sr-only"
      >
        {label}
      </label>
      <div className="relative group">
        <input
          type="text"
          id={id}
          name={name}
          autoComplete="off"
          maxLength={maxLength}
          {...inputProps}
          className={clsx(
            'h-12 tracking-loose leading-4 font-roboto bg-white/90 backdrop-blur rounded-xl border-2 border-gray-200 hover:border-blue-300 py-2.5 pr-4 outline-none transition-all duration-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 placeholder:font-normal placeholder:text-gray-400 disabled:cursor-default disabled:bg-gray-100',
            icon ? 'pl-12 w-57.5' : 'pl-4 w-[18rem]'
          )}
        />
        {icon && (
          <span className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-600 transition-colors">
            {icon}
          </span>
        )}
      </div>
    </>
  );
};

export default TextField;
