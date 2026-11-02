import { useEffect, useState } from "react";
import { toast } from "sonner";
import { showUpdateAvailableToast } from "../../../app/src/update/updateWatcher";
import { Button } from "../../../src/ui/button";
import { SonnerToaster } from "../../../src/ui/sonner";

function initialDark(): boolean {
  return new URLSearchParams(window.location.search).get("theme") === "dark";
}

// The toast `startUpdateAvailableWatcher` shows. Refresh reloads this page,
// which fires the toast again.
function fireUpdateToast() {
  showUpdateAvailableToast({ toast });
}

/** The update toast with its Refresh action, for screenshots. */
export function UpdateToastFixture() {
  const [dark, setDark] = useState(initialDark);

  // Sonner portals toasts onto `document.body`, so `.dark` must live on `<html>`.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [dark]);

  useEffect(() => {
    const id = window.setTimeout(fireUpdateToast, 150);
    return () => window.clearTimeout(id);
  }, []);

  return (
    <>
      <main className="min-h-screen bg-background p-8 text-foreground">
        <div className="flex gap-3">
          <Button onClick={() => setDark((d) => !d)}>Toggle theme</Button>
          <Button onClick={fireUpdateToast}>Show update toast</Button>
        </div>
      </main>
      {/* No `position`: the package default, top-right, as Eva mounts it. */}
      <SonnerToaster
        theme={dark ? "dark" : "light"}
        toastRadius="surface"
        toastIcons="filled24"
        closeButtonStyle="hoverChip"
        sonnerVars
        descriptionMuted
      />
    </>
  );
}
