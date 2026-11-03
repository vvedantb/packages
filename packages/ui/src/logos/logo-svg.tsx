import type { ComponentProps, ReactNode } from "react";

/** Props shared by every third-party logo. Other SVG props (`id`, `style`, `data-*`, `ref`) go to the svg. */
export interface LogoProps extends Omit<ComponentProps<"svg">, "children" | "width" | "height" | "viewBox"> {
  /** Width and height in px (or any CSS length). Default `24`. */
  size?: number | string;
  /**
   * Accessible name. With `title` (or an `aria-label`) the svg is a labelled
   * `role="img"`; without one it is decorative and `aria-hidden`.
   */
  title?: string;
}

/** The svg wrapper the logos share: size, viewBox and the decorative or labelled a11y pattern. */
export function LogoSvg({
  size = 24,
  title,
  viewBox,
  children,
  ...props
}: LogoProps & { viewBox: string; children: ReactNode }) {
  const label = title ?? props["aria-label"];
  const a11y = label
    ? { role: "img" as const, "aria-label": label }
    : { "aria-hidden": true as const };
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox={viewBox} {...a11y} {...props}>
      {title ? <title>{title}</title> : null}
      {children}
    </svg>
  );
}
