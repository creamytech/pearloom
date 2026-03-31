// ── Pearloom UI Primitives ─────────────────────────────────────
// Component library built on shadcn/ui + Radix primitives,
// styled with --eg-* design tokens and Tailwind utilities.

export { Button, buttonVariants, type ButtonProps } from './button';
export { Input, Label, type InputProps } from './input';
export { Textarea, type TextareaProps } from './textarea';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, type CardProps } from './card';
export {
  Modal,
  Dialog, DialogTrigger, DialogPortal, DialogClose, DialogOverlay,
  DialogContent, DialogHeader, DialogTitle, DialogDescription,
  type ModalProps,
} from './modal';
export { Badge, badgeVariants, type BadgeProps } from './badge';
export { ProgressSteps, type ProgressStepsProps, type StepDefinition } from './progress-steps';
export {
  Tooltip, TooltipProvider, TooltipRoot, TooltipTrigger, TooltipContent,
  type TooltipProps,
} from './tooltip';
export {
  Dropdown, DropdownItem,
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuLabel, DropdownMenuGroup,
  type DropdownProps, type DropdownItemProps,
} from './dropdown';
export { Separator } from './separator';
export { FormField, FormSection, Select, DateInput, TimeInput } from './form';
export type { FormFieldProps, FormSectionProps, SelectProps, DateInputProps, TimeInputProps } from './form';
