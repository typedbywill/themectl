import React from "react";
import { Link, type LinkProps } from "react-router-dom";

type ButtonVariant = "primary" | "ghost" | "text" | "icon" | "icon-danger";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "btn-primary",
  ghost: "btn-ghost",
  text: "btn-text-link",
  icon: "btn-ghost btn-icon",
  "icon-danger": "btn-ghost btn-icon btn-icon-danger",
};

function joinClasses(...classes: Array<string | false | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={joinClasses(variantClasses[variant], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export interface ButtonLinkProps extends LinkProps {
  variant?: Exclude<ButtonVariant, "icon" | "icon-danger">;
}

export const ButtonLink = React.forwardRef<HTMLAnchorElement, ButtonLinkProps>(
  ({ variant = "primary", className, ...props }, ref) => (
    <Link
      ref={ref}
      className={joinClasses(variantClasses[variant], className)}
      {...props}
    />
  ),
);
ButtonLink.displayName = "ButtonLink";
