import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "../../../src/ui/button";
import { SonnerToaster } from "../../../src/ui/sonner";

function initialDark(): boolean {
  return new URLSearchParams(window.location.search).get("theme") === "dark";
}

const compact =
  typeof window !== "undefined" &&
  new URLSearchParams(window.location.search).get("variant") === "compact";

function fire() {
  toast.success("Changes saved", {
    description: "Your settings were updated and will apply to new sessions.",
    duration: Infinity,
  });
}

export function Fixture() {
  const [dark, setDark] = useState(initialDark);

  // Sonner portals toasts onto `document.body`, so `.dark` must live on `<html>`
  // (not an inner wrapper) for token / Tailwind dark styles to reach them.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [dark]);

  // Fire one sample toast on load so a screenshot captures it.
  useEffect(() => {
    const id = window.setTimeout(fire, 150);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <main className="min-h-screen bg-background p-8 text-foreground">
        <div className="flex gap-3">
          <Button onClick={() => setDark((d) => !d)}>Toggle theme</Button>
          <Button onClick={fire}>Show toast</Button>
        </div>
      </main>
      <SonnerToaster
        theme={dark ? "dark" : "light"}
        toastRadius={compact ? "control" : "surface"}
        density={compact ? "compact" : "default"}
        toastIcons="filled24"
        closeButtonStyle="hoverChip"
        sonnerVars
        descriptionMuted
      />
    </>
  );
}
