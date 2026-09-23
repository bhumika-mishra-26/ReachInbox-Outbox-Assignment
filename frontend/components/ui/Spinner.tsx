interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

const sizes = { sm: 'w-4 h-4', md: 'w-7 h-7', lg: 'w-10 h-10' };

export default function Spinner({ size = 'md', color = 'border-green-500' }: SpinnerProps) {
  return (
    <div className={`${sizes[size]} border-2 ${color} border-t-transparent rounded-full animate-spin`} />
  );
}
