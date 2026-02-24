import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

interface SelectProps {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
}

interface SelectContextType {
    value: string;
    onValueChange: (value: string) => void;
    open: boolean;
    setOpen: (open: boolean) => void;
}

const SelectContext = React.createContext<SelectContextType | null>(null);

export function Select({ value, onValueChange, children }: SelectProps) {
    const [open, setOpen] = useState(false);
    return (
        <SelectContext.Provider value={{ value, onValueChange, open, setOpen }}>
            <div className="relative">{children}</div>
        </SelectContext.Provider>
    );
}

export function SelectTrigger({ children, className }: { children: React.ReactNode; className?: string }) {
    const ctx = React.useContext(SelectContext);
    if (!ctx) return null;
    return (
        <button
            type="button"
            onClick={() => ctx.setOpen(!ctx.open)}
            className={cn(
                "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                className
            )}
        >
            {children}
            <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
    );
}

export function SelectValue({ placeholder }: { placeholder?: string }) {
    const ctx = React.useContext(SelectContext);
    if (!ctx) return null;
    return <span>{ctx.value || placeholder}</span>;
}

export function SelectContent({ children, className }: { children: React.ReactNode; className?: string }) {
    const ctx = React.useContext(SelectContext);
    if (!ctx || !ctx.open) return null;
    return (
        <div className={cn(
            "absolute z-50 min-w-[8rem] overflow-hidden rounded-md border bg-slate-900 border-white/10 text-popover-foreground shadow-md animate-in fade-in-80",
            className
        )}>
            <div className="p-1">{children}</div>
        </div>
    );
}

export function SelectItem({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
    const ctx = React.useContext(SelectContext);
    if (!ctx) return null;
    return (
        <div
            onClick={() => {
                ctx.onValueChange(value);
                ctx.setOpen(false);
            }}
            className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none hover:bg-slate-800 focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 cursor-pointer",
                className
            )}
        >
            {ctx.value === value && (
                <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-cyan-500" />
                </span>
            )}
            {children}
        </div>
    );
}
