import { useState } from "react";
import { Button } from "../../../src";
import { SessionsHoverCard } from "../../src";

function initialDark(): boolean {
  return new URLSearchParams(window.location.search).get("theme") === "dark";
}

export function Fixture() {
  const [dark, setDark] = useState(initialDark);
  return (
    <div className={dark ? "dark" : ""}>
      <main className="min-h-screen bg-background p-8 text-foreground">
        <Button onClick={() => setDark((d) => !d)}>Toggle theme</Button>
        <div className="mt-6 w-56">
          <SessionsHoverCard
            open
            header="Refactor settings page"
            body={({ open }) => (
              <p>
                Preview text for the session. The card is {open ? "open" : "closed"}.
              </p>
            )}
            footer="Updated 3 minutes ago"
          >
            <button
              type="button"
              className="w-full rounded-md bg-secondary px-3 py-2 text-left text-sm text-foreground"
            >
              Refactor settings page
            </button>
          </SessionsHoverCard>
        </div>
      </main>
    </div>
  );
}
