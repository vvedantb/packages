import { MotionConfig } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
// The client entry: everything the demo needs, without the artifact viewers'
// `@vvedantb/server` import, so it runs without building that package.
import {
  ActivityTasks,
  Button,
  MotionProvider,
  PageMotionProvider,
  PromptInputSubmit,
  RollingNumber,
  SendQueueIcon,
  formatActivityElapsed,
  useActivityElapsedSeconds,
  useCountUpDisplay,
} from "../../src/client";

const params = new URLSearchParams(window.location.search);

// One value every 2 s. The repeated 45% shows that the same amount does not
// replay; the em-dash is not countable, so it shows as it is.
const METER = ["12%", "45%", "45%", "80%", "—"] as const;

function useTick(ms: number): number {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setCount((n) => n + 1), ms);
    return () => clearInterval(id);
  }, [ms]);
  return count;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function CountUpMeter() {
  const value = METER[useTick(2000) % METER.length] ?? "—";
  return <p className="text-2xl tabular-nums">{useCountUpDisplay(value)}</p>;
}

export function Fixture() {
  const [dark, setDark] = useState(params.get("theme") === "dark");
  const [motionOff, setMotionOff] = useState(params.get("motion") === "off");
  const [queued, setQueued] = useState(params.get("queued") === "1");
  // Starts 5 s short of a minute, so "59s" → "1m" → "1m 1s" shows early.
  const [startedAt] = useState(() => Date.now() - 55_000);
  // The clock `ActivityTasks` uses, so both sections show the same time.
  const seconds = useActivityElapsedSeconds(startedAt, true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <MotionProvider>
      <PageMotionProvider disabled={motionOff} motionConfig={MotionConfig}>
        <main className="min-h-screen max-w-xl space-y-4 bg-background p-8 text-foreground">
          <div className="flex gap-2">
            <Button onClick={() => setDark((d) => !d)}>Toggle theme</Button>
            <Button variant="outline" onClick={() => setMotionOff((off) => !off)}>
              Page motion: {motionOff ? "off" : "on"}
            </Button>
          </div>

          <Section title="RollingNumber: a timer string, once a second">
            <p className="text-2xl">
              <RollingNumber value={formatActivityElapsed(seconds)} />
            </p>
          </Section>

          <Section title="SendQueueIcon and PromptInputSubmit queued">
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => setQueued((q) => !q)}>
                Agent working: {queued ? "yes" : "no"}
              </Button>
              <SendQueueIcon queued={queued} className="size-8" />
              <PromptInputSubmit queued={queued} type="button" />
            </div>
          </Section>

          <Section title="ActivityTasks: streaming header with the rolling clock">
            <ActivityTasks steps={[]} isStreaming startedAt={startedAt} />
          </Section>

          <Section title="useCountUpDisplay: 12% → 45% → 45% → 80% → —">
            <CountUpMeter />
          </Section>
        </main>
      </PageMotionProvider>
    </MotionProvider>
  );
}
