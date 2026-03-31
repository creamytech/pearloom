import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge class names — uses clsx + tailwind-merge for safe Tailwind class composition. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
