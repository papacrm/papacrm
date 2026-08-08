import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/app/lib/utils";

const buttonVariants = cva(
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium tracking-wide transition-colors disabled:pointer-events-none disabled:opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
    {
        variants: {
            variant: {
                default:
                    "bg-primary text-primary-foreground hover:bg-primary/90",
                secondary:
                    "bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80",
                outline:
                    "border border-border bg-transparent hover:bg-secondary text-foreground",
                ghost: "hover:bg-secondary text-foreground",
                link: "text-primary underline-offset-4 hover:underline",
            },
            size: {
                default: "h-10 px-5 py-2",
                sm: "h-8 px-3 text-xs",
                lg: "h-12 px-8 text-base",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    },
);

type ButtonBaseProps = VariantProps<typeof buttonVariants> & {
    className?: string;
    children?: React.ReactNode;
};

type ButtonAsButton = ButtonBaseProps &
    React.ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined };

type ButtonAsLink = ButtonBaseProps &
    React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };

export type ButtonProps = ButtonAsButton | ButtonAsLink;

const Button = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    ({ className, variant, size, ...props }, ref) => {
        if ("href" in props && props.href !== undefined) {
            const { href, ...rest } = props as ButtonAsLink;
            return (
                <a
                    ref={ref as React.Ref<HTMLAnchorElement>}
                    href={href}
                    className={cn(buttonVariants({ variant, size, className }))}
                    {...rest}
                />
            );
        }

        const rest = props as ButtonAsButton;
        return (
            <button
                ref={ref as React.Ref<HTMLButtonElement>}
                className={cn(buttonVariants({ variant, size, className }))}
                {...rest}
            />
        );
    },
);
Button.displayName = "Button";

export { Button, buttonVariants };
