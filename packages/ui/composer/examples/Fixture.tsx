import { useEffect, useState } from "react";
import { IconPaperclip, IconPlus, IconX } from "@tabler/icons-react";
import { Button } from "../../src";
import { Composer, ComposerIconButton } from "../../src/composer";

function initialDark(): boolean {
  return new URLSearchParams(window.location.search).get("theme") === "dark";
}

function Chip({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-xs text-muted-foreground">
      <IconPaperclip className="size-3.5" aria-hidden="true" />
      {name}
      <button type="button" aria-label={`Remove ${name}`} className="rounded-full hover:text-foreground">
        <IconX className="size-3" aria-hidden="true" />
      </button>
    </span>
  );
}

const plus = (
  <ComposerIconButton aria-label="Add">
    <IconPlus className="size-4" aria-hidden="true" />
  </ComposerIconButton>
);

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

// Resolves with a fixed continuation. Real apps make the request here and pass `signal` to it.
const getPrediction = async () => "about the rollout plan and who owns each step";

export function Fixture() {
  const [dark, setDark] = useState(initialDark);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    return () => {
      document.documentElement.classList.remove("dark");
    };
  }, [dark]);

  return (
    <main className="min-h-screen bg-background p-8 text-foreground">
      <Button onClick={() => setDark((d) => !d)}>Toggle theme</Button>
      <div className="mt-6 flex max-w-xl flex-col gap-6">
        <Section title="Empty">
          <Composer plusMenu={plus} placeholder="Ask anything" />
        </Section>
        <Section title="Typing with ghost text (Tab accepts, Esc dismisses)">
          <Composer
            plusMenu={plus}
            defaultValue="I would like to ask"
            getPrediction={getPrediction}
            predictionDebounceMs={0}
          />
        </Section>
        <Section title="With attachments">
          <Composer
            plusMenu={plus}
            defaultValue="Summarise these two files"
            attachments={
              <>
                <Chip name="brief.pdf" />
                <Chip name="notes.txt" />
              </>
            }
          />
        </Section>
        <Section title="Streaming (stop button)">
          <Composer plusMenu={plus} streaming placeholder="Reply is streaming" />
        </Section>
        <Section title="Disabled">
          <Composer plusMenu={plus} disabled placeholder="Not available" />
        </Section>
        <Section title="Long draft (max height 120 px, then scrolls)">
          <Composer
            plusMenu={plus}
            maxHeight={120}
            defaultValue={Array.from({ length: 8 }, (_, i) => `Line ${i + 1} of a long draft`).join("\n")}
          />
        </Section>
      </div>
    </main>
  );
}
