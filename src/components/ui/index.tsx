import * as React from 'react';
import { cn } from '../../lib/utils';

// BUTTON
export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    const variants = {
      default: 'orange-gradient text-white shadow hover:opacity-90',
      destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90',
      outline: 'border border-[#28282b] bg-bg-surface shadow-sm hover:bg-bg-elevated hover:text-foreground text-text-dim',
      secondary: 'bg-bg-elevated text-foreground shadow-sm hover:bg-bg-elevated/80',
      ghost: 'hover:bg-bg-elevated hover:text-foreground text-text-dim',
      link: 'text-primary underline-offset-4 hover:underline'
    };
    const sizes = {
      default: 'h-10 px-6 py-2',
      sm: 'h-8 rounded-md px-3 text-xs',
      lg: 'h-12 rounded-md px-8 font-bold uppercase tracking-wider',
      icon: 'h-9 w-9'
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center rounded-md text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

// CARD
export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('rounded-lg border border-[#28282b] bg-bg-surface text-foreground glow-shadow', className)} {...props} />
);
export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
);
export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h3 className={cn('font-bold leading-none tracking-tight text-text-main', className)} {...props} />
);
export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <p className={cn('text-xs text-text-dim font-mono uppercase tracking-wider', className)} {...props} />
);
export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('p-6 pt-0', className)} {...props} />
);
export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn('flex items-center p-6 pt-0', className)} {...props} />
);

// INPUT
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        'flex h-10 w-full rounded-md border border-[#28282b] bg-[#080809] px-3 py-1 text-sm text-[#9cdcfe] font-mono shadow-inner transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-text-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mistral-orange disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = 'Input';

// TEXTAREA
export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      className={cn(
        'flex min-h-[80px] w-full rounded-md border border-[#28282b] bg-[#080809] px-3 py-2 text-sm text-[#9cdcfe] font-mono shadow-inner placeholder:text-text-dim focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mistral-orange disabled:cursor-not-allowed disabled:opacity-50 leading-relaxed',
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';

// PROGRESS
export const Progress = React.forwardRef<HTMLDivElement, { value: number; className?: string }>(
  ({ className, value, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('relative h-3 w-full overflow-hidden rounded-full bg-muted/40 border border-[#28282b]', className)}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-mistral-orange transition-all shadow-[0_0_10px_rgba(255,90,31,0.5)]"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }}
      />
    </div>
  )
);
Progress.displayName = 'Progress';

// ALERT
export const Alert = ({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'destructive' }) => (
  <div
    role="alert"
    className={cn(
      'relative w-full rounded-lg border border-[#28282b] px-4 py-3 text-sm [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground',
      variant === 'destructive' ? 'border-destructive/50 bg-destructive/5 text-destructive [&>svg]:text-destructive' : 'bg-bg-elevated text-text-main',
      className
    )}
    {...props}
  />
);
export const AlertTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
  <h5 className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />
);
export const AlertDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
  <div className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />
);

// SELECT
export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-[#28282b] bg-[#080809] px-3 py-1 text-sm text-[#9cdcfe] font-mono shadow-inner transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-mistral-orange disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-[url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%238e8e99\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat',
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = 'Select';

// BADGE
export const Badge = ({ className, variant = 'default', ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' }) => {
  const variants = {
    default: 'bg-primary text-primary-foreground',
    secondary: 'bg-bg-elevated text-text-main border border-[#28282b]',
    destructive: 'bg-destructive/10 text-destructive border border-destructive/20',
    outline: 'text-text-dim border border-[#28282b]',
    success: 'bg-green-500/10 text-green-500 border border-green-500/20',
    warning: 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
  };
  return (
    <div className={cn('inline-flex items-center rounded-sm px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2', variants[variant], className)} {...props} />
  );
};

// ACCORDION (Minimal)
export const Accordion = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("space-y-1", className)}>{children}</div>;
export const AccordionItem = ({ children, className, ...props }: { children: React.ReactNode; className?: string; [key: string]: any }) => <div className={cn('border-b border-[#28282b] last:border-0', className)} {...props}>{children}</div>;
export const AccordionTrigger = ({ children, onClick, isOpen }: { children: React.ReactNode; onClick?: () => void; isOpen?: boolean }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between py-4 font-medium transition-all hover:underline"
  >
    {children}
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")}>
      <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
  </button>
);
export const AccordionContent = ({ children, isOpen }: { children: React.ReactNode; isOpen?: boolean }) => (
  <div className={cn("overflow-hidden text-sm transition-all pb-4", !isOpen && "hidden")}>
    {children}
  </div>
);
