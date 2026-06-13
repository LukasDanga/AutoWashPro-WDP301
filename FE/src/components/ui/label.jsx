import { cn } from '@/lib/utils';

export default function Label({ className, children, ...props }) {
  return (
    <label
      className={cn(
        'text-sm font-medium text-neutral-700 dark:text-white leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
}
