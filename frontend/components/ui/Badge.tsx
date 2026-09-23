type BadgeVariant = 'scheduled' | 'sent' | 'failed' | 'pending' | 'default';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  scheduled: 'bg-orange-100 text-orange-600',
  sent:      'bg-gray-100 text-gray-600',
  failed:    'bg-red-100 text-red-600',
  pending:   'bg-yellow-100 text-yellow-600',
  default:   'bg-gray-100 text-gray-600',
};

export default function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full
        text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
