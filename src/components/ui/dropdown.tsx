'use client';

import { forwardRef } from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '@/lib/cn';

/* ── shadcn DropdownMenu primitives ── */

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuContent = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[160px] overflow-hidden',
        'bg-white rounded-xl border border-[rgba(0,0,0,0.08)]',
        'shadow-[0_4px_20px_rgba(43,30,20,0.12),0_8px_30px_rgba(43,30,20,0.07)] p-1.5',
        'data-[state=open]:animate-in data-[state=closed]:animate-out',
        'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
        'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
        'data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2',
        'data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { icon?: React.ReactNode }
>(({ className, icon, children, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'flex items-center gap-2 px-3 py-2 rounded-lg text-[0.88rem] font-medium cursor-pointer transition-colors',
      'text-[var(--pl-ink)] outline-none',
      'focus:bg-[rgba(163,177,138,0.12)] focus:text-[var(--pl-olive)]',
      'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      className,
    )}
    {...props}
  >
    {icon && <span className="flex-shrink-0 w-4 h-4 flex items-center justify-center">{icon}</span>}
    {children}
  </DropdownMenuPrimitive.Item>
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuSeparator = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('-mx-1 my-1 h-px bg-border', className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuLabel = forwardRef<
  React.ComponentRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-2 py-1.5 text-sm font-semibold', className)}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

/* ── Pearloom legacy Dropdown wrapper (preserves existing API) ── */

export interface DropdownProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  align?: 'left' | 'right' | 'center';
  className?: string;
}

export function Dropdown({ trigger, children, align = 'left', className }: DropdownProps) {
  const radixAlign = align === 'left' ? 'start' : align === 'right' ? 'end' : 'center';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className={cn('cursor-pointer inline-flex', className)}>{trigger}</div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align={radixAlign}>
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export interface DropdownItemProps extends React.HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  icon?: React.ReactNode;
}

export function DropdownItem({ active, icon, className, children, onClick, ...props }: DropdownItemProps) {
  return (
    <DropdownMenuItem
      icon={icon}
      className={cn(active && 'bg-[rgba(163,177,138,0.12)] text-[var(--pl-olive)]', className)}
      onSelect={onClick as () => void}
    >
      {children}
    </DropdownMenuItem>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuRadioGroup,
};
