import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-green-500 hover:bg-green-600 text-white border-2 border-green-500 hover:border-green-600 disabled:bg-green-300 disabled:border-green-300',
  outline:
    'bg-transparent border-2 border-green-500 text-green-600 hover:bg-green-50 disabled:opacity-50',
  ghost:
    'bg-transparent border-2 border-transparent text-gray-600 hover:bg-gray-100 disabled:opacity-50',
  danger:
    'bg-red-500 hover:bg-red-600 text-white border-2 border-red-500 hover:border-red-600 disabled:opacity-50',
};

const sizeClasses: Record<Size, string> = {
  sm: 'px-3 py-1.5 text-xs rounded-lg gap-1.5',
  md: 'px-4 py-2 text-sm rounded-full gap-2',
  lg: 'px-6 py-3 text-base rounded-full gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      children,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`
          inline-flex items-center justify-center font-semibold transition-colors duration-150
          disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-1
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        {isLoading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {rightIcon && !isLoading ? (
          <span className="flex-shrink-0">{rightIcon}</span>
        ) : null}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
