import { IconRefresh } from "@tabler/icons-react";
import { CrossfadeIcon } from "./crossfade-icon";
import { Spinner } from "./spinner";
import { useCn } from "./ui-config";

/**
 * Refresh glyph for a control that reloads something: it crossfades to
 * the `circle` {@link Spinner} while the action is in flight.
 *
 * One component so every toolbar swaps glyph and spinner the same way, with
 * the `soft` crossfade.
 *
 * `className` sizes the slot and both glyphs. Inside a `Button`, the button's
 * `[&_svg]:size-*` rule wins on specificity, so pass a matching size to keep
 * the slot and the glyph the same box.
 */
function RefreshSpinIcon({
  busy,
  className = "size-4",
}: {
  busy: boolean;
  className?: string;
}) {
  const merge = useCn();
  return (
    <CrossfadeIcon
      show={busy}
      trueKey="busy"
      falseKey="idle"
      variant="soft"
      className={merge(
        "relative flex shrink-0 items-center justify-center",
        className,
      )}
      whenTrue={<Spinner variant="circle" size="sm" className={className} />}
      whenFalse={<IconRefresh className={className} />}
    />
  );
}

export { RefreshSpinIcon };
