'use client';

import * as React from 'react';
import { OTPInput, OTPInputContext } from 'input-otp';
import { Dot } from 'lucide-react';
import { cn } from '@/lib/utils';

export type InputOTPProps = React.ComponentPropsWithoutRef<typeof OTPInput>;
export type InputOTPRef = React.ElementRef<typeof OTPInput>;

export const InputOTP = React.forwardRef<InputOTPRef, InputOTPProps>(
  ({ className, ...props }, ref) => (
    <OTPInput
      ref={ref}
      containerClassName={cn('flex items-center gap-2', className)}
      {...props}
    />
  )
);
InputOTP.displayName = 'InputOTP';

export const InputOTPGroup = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('flex items-center gap-2', className)} {...props} />
));
InputOTPGroup.displayName = 'InputOTPGroup';

type Slot = {
  char?: string;
  hasFakeCaret?: boolean;
  isActive?: boolean;
};

export const InputOTPSlot = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'> & { index: number }
>(({ index, className, ...props }, ref) => {
  // The library’s context type is loose; cast + guard for safety
  const ctx = React.useContext(OTPInputContext) as any | null;
  const slots: Slot[] = Array.isArray(ctx?.slots) ? (ctx.slots as Slot[]) : [];
  const slot: Slot | undefined = slots[index];

  const char = slot?.char ?? '';
  const hasFakeCaret = !!slot?.hasFakeCaret;
  const isActive = !!slot?.isActive;

  return (
    <div
      ref={ref}
      className={cn(
        'relative h-10 w-10 rounded-md border border-input text-center text-2xl',
        'flex items-center justify-center',
        isActive && 'ring-2 ring-ring',
        className
      )}
      {...props}
    >
      {char ? <span>{char}</span> : <span className="text-muted-foreground">•</span>}
      {hasFakeCaret ? <Dot className="absolute -bottom-2 h-4 w-4 animate-pulse" /> : null}
    </div>
  );
});
InputOTPSlot.displayName = 'InputOTPSlot';

export const InputOTPSeparator = React.forwardRef<
  React.ElementRef<'div'>,
  React.ComponentPropsWithoutRef<'div'>
>(({ className, ...props }, ref) => (
  <div ref={ref} role="separator" className={cn('px-2 text-muted-foreground', className)} {...props}>
    —
  </div>
));
InputOTPSeparator.displayName = 'InputOTPSeparator';
