import { NavIconBase, cutoutStyle, type CutoutIconProps } from "./nav-icon-base";

/** Terminal window with a prompt, typed characters and a blinking cursor. Solid while `active`. */
export function TerminalIcon({ strokeWidth = 1.75, cutoutColor, ...props }: CutoutIconProps) {
  const { active } = props;
  const cutoutFill = cutoutStyle(active, "fill", cutoutColor);
  return (
    <NavIconBase {...props} strokeWidth={strokeWidth} hoverScale="1.12" loop={1400}>
      <rect x="3" y="4" width="18" height="16" rx="2" fill={active ? "currentColor" : "none"} />
      <path d="M7 10l3 2-3 2" className="vv-icon-terminal-prompt" style={cutoutStyle(active, "stroke", cutoutColor)} />
      <rect x="13" y="13.5" width="1" height="1" rx="0.2" fill="currentColor" stroke="none" className="vv-icon-terminal-typed vv-icon-terminal-typed-1" style={cutoutFill} />
      <rect x="14.6" y="13.5" width="1" height="1" rx="0.2" fill="currentColor" stroke="none" className="vv-icon-terminal-typed vv-icon-terminal-typed-2" style={cutoutFill} />
      <rect x="16.2" y="13.5" width="1" height="1" rx="0.2" fill="currentColor" stroke="none" className="vv-icon-terminal-typed vv-icon-terminal-typed-3" style={cutoutFill} />
      <rect x="17.8" y="13.2" width="1.4" height="1.6" rx="0.3" fill="currentColor" stroke="none" className="vv-icon-terminal-cursor" style={cutoutFill} />
    </NavIconBase>
  );
}
