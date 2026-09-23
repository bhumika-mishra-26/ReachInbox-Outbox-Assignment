import { getInitials, getColorIndex } from '@/lib/utils';

const AVATAR_COLORS = [
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
];

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg';

interface AvatarProps {
  name: string;
  src?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeClasses: Record<AvatarSize, string> = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function Avatar({ name, src, size = 'md', className = '' }: AvatarProps) {
  const colorIdx = getColorIndex(name);
  const initials = getInitials(name);

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={name}
        className={`rounded-full object-cover flex-shrink-0 ${sizeClasses[size]} ${className}`}
      />
    );
  }

  return (
    <div
      className={`
        rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0
        ${AVATAR_COLORS[colorIdx]}
        ${sizeClasses[size]}
        ${className}
      `}
      title={name}
    >
      {initials}
    </div>
  );
}
