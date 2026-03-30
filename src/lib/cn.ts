import { clsx, type ClassValue } from 'clsx';

/** Merge class names — thin wrapper around clsx for Tailwind-safe class composition. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
