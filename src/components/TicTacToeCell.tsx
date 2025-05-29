
"use client";

import type React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TicTacToeCellProps {
  value: 'X' | 'O' | null;
  onClick: () => void;
  disabled: boolean;
  isWinningCell?: boolean;
}

export default function TicTacToeCell({ value, onClick, disabled, isWinningCell }: TicTacToeCellProps) {
  return (
    <Button
      variant="outline"
      className={cn(
        "w-full aspect-square text-5xl sm:text-6xl md:text-7xl font-bold leading-none rounded-sm flex items-center justify-center p-0",
        "border-2 border-muted hover:bg-accent focus:bg-accent",
        isWinningCell ? "bg-primary/30 text-primary-foreground animate-pulse" : "bg-card",
        value === 'X' ? "text-destructive" : value === 'O' ? "text-blue-500" : ""
      )}
      onClick={onClick}
      disabled={disabled || !!value}
      aria-label={`Cell ${value ? `contains ${value}` : 'empty'}`}
    >
      {value}
    </Button>
  );
}
