import { useRef } from "react";
import { Platform, type View } from "react-native";

/** The part of a DOM element the web click guard uses: on the web a `View` is a DOM element. */
type DomNode = {
  addEventListener: (type: string, listener: (event: DomEvent) => void, capture: boolean) => void;
  removeEventListener: (type: string, listener: (event: DomEvent) => void, capture: boolean) => void;
};
type DomEvent = { stopPropagation: () => void; preventDefault: () => void };

function isDomNode(node: object): node is DomNode {
  return "addEventListener" in node && typeof node.addEventListener === "function";
}

/**
 * On the web a pressable presses on the DOM click, which neither the touch
 * responder nor Gesture Handler cancels (it captures the pointer on the
 * element pressed). So, in the capture phase on the dragged content, this
 * drops the click that ends a drag (`swallowNext`, at the drag's start).
 * `swallowOnDown` decides afresh at each touch whether its click is dropped
 * (a tap made while a swiped row is open). On Android and iOS it does
 * nothing: there the drag cancels the press.
 */
export function useWebClickGuard(swallowOnDown: () => boolean = () => false) {
  const swallow = useRef(false);
  return {
    swallowNext: () => {
      swallow.current = true;
    },
    ref: (node: View | null) => {
      if (Platform.OS !== "web" || !node || !isDomNode(node)) return;
      const onClick = (event: DomEvent) => {
        if (!swallow.current) return;
        swallow.current = false;
        event.stopPropagation();
        event.preventDefault();
      };
      // Each touch starts afresh (a touch drag clicks nothing, so its flag must not outlive it).
      const onPointerDown = () => {
        swallow.current = swallowOnDown();
      };
      node.addEventListener("click", onClick, true);
      node.addEventListener("pointerdown", onPointerDown, true);
      return () => {
        node.removeEventListener("click", onClick, true);
        node.removeEventListener("pointerdown", onPointerDown, true);
      };
    },
  };
}
