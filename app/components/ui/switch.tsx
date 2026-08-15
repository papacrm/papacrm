import * as React from "react";
import { cn } from "@/app/lib/utils";

export interface SwitchProps {
    checked: boolean;
    onCheckedChange: (checked: boolean) => void;
    disabled?: boolean;
    className?: string;
    id?: string;
    "aria-label"?: string;
}

// Small on/off pill switch used anywhere something can be toggled
// active/inactive (a module, a webhook node, …). Green = active/on,
// gray = inactive/off — matched by the thumb position (right/left).
const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
    ({ checked, onCheckedChange, disabled, className, id, ...props }, ref) => {
        return (
            <button
                ref={ref}
                type="button"
                role="switch"
                id={id}
                aria-checked={checked}
                disabled={disabled}
                onClick={() => onCheckedChange(!checked)}
                className={cn(
                    "relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50",
                    checked ? "bg-emerald-500" : "bg-neutral-300",
                    className,
                )}
                {...props}
            >
                <span
                    className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                        checked ? "translate-x-[18px]" : "translate-x-[3px]",
                    )}
                />
            </button>
        );
    },
);
Switch.displayName = "Switch";

export { Switch };
