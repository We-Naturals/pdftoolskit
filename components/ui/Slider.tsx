
import React from 'react';

interface SliderProps {
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    step?: number;
    className?: string;
}

export default function Slider({ value, onChange, min, max, step = 1, className }: SliderProps) {
    return (
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => onChange(Number(e.target.value))}
            className={`w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${className}`}
        />
    );
}
