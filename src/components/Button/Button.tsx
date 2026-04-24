import React from 'react';
import { classNames } from '@utils/classNames';

type ButtonVariant = 'primary' | 'neutral' | 'dark';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Color treatment — accent CTA, neutral, or dark. All re-skin per design tokens. */
  variant?: ButtonVariant;
  /** Compact size. */
  size?: 'default' | 'small';
  /** Pill shape (fully rounded). */
  pill?: boolean;
  /** Stretch to the full width of the container. */
  block?: boolean;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  neutral: 'btn-neutral',
  dark: 'btn-dark',
};

/**
 * The canonical button — a typed wrapper over the shared `.btn` classes in
 * `src/main.css`. Color comes from the design tokens; `pill`/`block` are
 * design-agnostic shape modifiers. Ported from react-boilerplate.
 */
const Button = ({
  variant = 'primary',
  size = 'default',
  pill = false,
  block = false,
  type = 'button',
  className,
  children,
  ...rest
}: ButtonProps) => (
  <button
    type={type}
    className={classNames(
      'btn',
      VARIANT_CLASS[variant],
      size === 'small' && 'btn-small',
      pill && 'btn-pill',
      block && 'btn-block',
      className
    )}
    {...rest}
  >
    {children}
  </button>
);

export default Button;
