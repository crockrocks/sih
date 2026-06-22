import React from 'react';

export const Card = React.forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`bg-white dark:bg-gray-800 shadow-lg rounded-lg overflow-hidden ${className}`} {...props}>
    {children}
  </div>
));

export const CardHeader = React.forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`px-6 py-4 border-b border-gray-200 dark:border-gray-700 ${className}`} {...props}>
    {children}
  </div>
));

export const CardContent = React.forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`px-6 py-4 ${className}`} {...props}>
    {children}
  </div>
));

export const CardFooter = React.forwardRef(({ children, className = '', ...props }, ref) => (
  <div ref={ref} className={`px-6 py-4 border-t border-gray-200 dark:border-gray-700 ${className}`} {...props}>
    {children}
  </div>
));

export const Button = React.forwardRef(({ children, className = '', variant = 'primary', size = 'md', ...props }, ref) => {
  const baseClasses = 'font-semibold rounded-lg transition duration-300 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-2';
  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2',
    lg: 'px-6 py-3 text-lg',
    icon: 'p-2'
  };
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-800 focus:ring-gray-500',
    outline: 'border border-gray-300 hover:bg-gray-100 text-gray-700 focus:ring-gray-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 focus:ring-gray-500'
  };

  return (
    <button
      ref={ref}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export const Input = React.forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition duration-300 ease-in-out ${className}`}
    {...props}
  />
));

export const Textarea = React.forwardRef(({ className = '', ...props }, ref) => (
  <textarea
    ref={ref}
    className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition duration-300 ease-in-out ${className}`}
    {...props}
  />
));

export const Label = React.forwardRef(({ children, className = '', ...props }, ref) => (
  <label
    ref={ref}
    className={`block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 ${className}`}
    {...props}
  >
    {children}
  </label>
));

export const Separator = React.forwardRef(({ className = '', ...props }, ref) => (
  <hr
    ref={ref}
    className={`border-t border-gray-200 dark:border-gray-700 ${className}`}
    {...props}
  />
));

export const Select = React.forwardRef(({ children, className = '', ...props }, ref) => (
  <select
    ref={ref}
    className={`w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white appearance-none bg-white dark:bg-gray-800 ${className}`}
    {...props}
  >
    {children}
  </select>
));

export const Checkbox = React.forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    type="checkbox"
    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded ${className}`}
    {...props}
  />
));

export const Radio = React.forwardRef(({ className = '', ...props }, ref) => (
  <input
    ref={ref}
    type="radio"
    className={`h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 ${className}`}
    {...props}
  />
));

const Spinner = React.forwardRef(({ className = '', size = 'md', color = 'primary', ...props }, ref) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-6 w-6',
    lg: 'h-8 w-8'
  };

  const colorClasses = {
    primary: 'text-blue-600 dark:text-blue-400',
    secondary: 'text-gray-600 dark:text-gray-400',
    danger: 'text-red-600 dark:text-red-400'
  };

  return (
    <svg
      ref={ref}
      className={`animate-spin ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      {...props}
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
  );
});

export default Spinner;