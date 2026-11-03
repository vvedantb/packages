import { LogoSvg, type LogoProps } from "./logo-svg";

/** Vercel mark (svgl). Monochrome: uses `currentColor`, so set the colour with a text class. */
export function VercelIcon(props: LogoProps) {
  return (
    <LogoSvg viewBox="0 0 24 24" fill="currentColor" {...props}>
      <path d="M24 22.525H0l12-21.05 12 21.05z" />
    </LogoSvg>
  );
}
