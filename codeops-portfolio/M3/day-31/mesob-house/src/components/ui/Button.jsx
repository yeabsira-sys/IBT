/**
 * Button — the single button primitive for the app.
 *
 * <Button variant="primary" size="lg" block rightIcon={<FiArrowRight />}>
 *   Create account
 * </Button>
 */
export default function Button({
  as: Tag = "button",
  children,
  variant = "primary",
  size = "md",
  block = false,
  leftIcon,
  rightIcon,
  className = "",
  type,
  ...rest
}) {
  const classes = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    block ? "btn--block" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const typeProp = Tag === "button" ? { type: type || "button" } : {};

  return (
    <Tag className={classes} {...typeProp} {...rest}>
      {leftIcon && <span className="btn__icon">{leftIcon}</span>}
      {children}
      {rightIcon && <span className="btn__icon">{rightIcon}</span>}
    </Tag>
  );
}
