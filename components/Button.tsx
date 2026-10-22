"use client";

import React, { forwardRef } from "react";
import clsx from "clsx";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "xs" | "sm" | "md" | "lg";
  fullWidth?: boolean;
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className,
      variant = "primary",
      size = "md",
      fullWidth = false,
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      type = "button",
      ...props
    },
    ref
  ) => {
    const isPrimary = variant === "primary";
    const isSecondary = variant === "secondary" || variant === "ghost";
    const isDanger = variant === "danger";

    const baseStyles =
      "group relative inline-flex items-center justify-center font-sans select-none " +
      "cursor-pointer overflow-hidden transition-[transform,opacity,box-shadow,background-color,border-color] duration-200 ease-out " +
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-bg " +
      "disabled:opacity-45 disabled:cursor-not-allowed disabled:pointer-events-none disabled:transform-none disabled:shadow-none";

    const motionStyles =
      "hover:-translate-y-0.5 active:scale-[0.97] active:translate-y-0 will-change-transform";

    const sizeStyles = {
      xs: "text-[11px] font-medium px-2.5 py-1 rounded-lg gap-1.5",
      sm: "text-xs font-medium px-3 py-1.5 rounded-xl gap-1.5",
      md: "text-sm font-semibold px-4 py-2.5 rounded-xl gap-2",
      lg: "text-base font-semibold px-5 py-3 rounded-2xl gap-2.5",
    }[size];

    const variantStyles = isPrimary
      ? "bg-gradient-to-r from-accent to-accent-end text-white " +
        "shadow-[0_0_20px_rgb(var(--rgb-accent)/0.30)] hover:shadow-[0_0_28px_rgb(var(--rgb-accent)/0.50)] " +
        "border border-white/20"
      : isDanger
      ? "bg-gradient-to-r from-fake to-rose-700 text-white " +
        "shadow-[0_0_18px_rgb(var(--rgb-fake)/0.25)] hover:shadow-[0_0_24px_rgb(var(--rgb-fake)/0.45)] " +
        "border border-white/20"
      : /* secondary / glass outline */
        "bg-surface/70 dark:bg-white/[0.04] backdrop-blur-md " +
        "border border-border/80 dark:border-white/10 hover:border-accent/40 dark:hover:border-accent/40 " +
        "text-ink dark:text-slate-100 hover:text-ink hover:bg-surface dark:hover:bg-white/[0.08] " +
        "shadow-xs hover:shadow-md";

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={clsx(
          baseStyles,
          motionStyles,
          sizeStyles,
          variantStyles,
          fullWidth && "w-full",
          className
        )}
        {...props}
      >
        {/* Shine sweep overlay on hover (animates exclusively transform) */}
        {isPrimary && (
          <span
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}

        {/* Secondary subtle shine sweep */}
        {isSecondary && (
          <span
            className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none"
            aria-hidden="true"
          />
        )}

        {isLoading ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-3.5 w-3.5 text-current"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
              />
            </svg>
            <span>{children}</span>
          </span>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            {children}
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;

