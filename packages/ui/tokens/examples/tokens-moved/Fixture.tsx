import { type ReactNode, useState } from "react";
import { domAnimation, LazyMotion } from "motion/react";
import { IconCheck, IconFile } from "@tabler/icons-react";
import {
  type ActivityStep,
  ActivityTasks,
  Avatar,
  AvatarFallback,
  BorderBeam,
  Button,
  CenteredSpinner,
  KanbanBoard,
  KanbanCard,
  KanbanCards,
  KanbanHeader,
  KanbanProvider,
  SortableListGroup,
  SortableListHeader,
  SortableListItem,
  SortableListItems,
  SortableListProvider,
  ListRow,
  LoadingState,
  Markdown,
  ModelPickerContent,
  AgentPlan,
  AgentPlanContent,
  AgentPlanTrigger,
  AgentPlanHeader,
  AgentPlanTitle,
  RefreshSpinIcon,
  Spinner,
  StatusDot,
  type StatusTone,
  Surface,
  TestResult,
  TestResults,
  TestResultsContent,
  TestResultsHeader,
  TestResultsProgress,
  TestResultsSummary,
  TestSuite,
  TestSuiteContent,
  TestSuiteName,
  TestSuiteStats,
  TooltipProvider,
  AgentTrace,
  AgentTraceDescription,
  AgentTraceIcon,
  AgentTraceLine,
  AgentTraceTitle,
} from "../../../src";

// The components moved in from eva, rendered on plain tokens.css
// (no app variables, no compat layer) in a light and a dark pane. `?theme=light`
// or `?theme=dark` shows one pane at full width for a screenshot.

const tones: StatusTone[] = ["progress", "business-review", "code-review", "done", "cancelled", "active", "critical", "neutral"];

const steps: ActivityStep[] = [
  { type: "read", label: "Read file", detail: "src/ui/spinner.tsx", status: "complete" },
  { type: "edit", label: "Edited file", detail: "src/ui/button.tsx", status: "complete" },
  { type: "bash", label: "Ran command", detail: "pnpm test", status: "active" },
];

const models = [
  { id: "opus", provider: "claude", label: "Opus" },
  { id: "sonnet", provider: "claude", label: "Sonnet" },
  { id: "gpt", provider: "codex", label: "GPT-5" },
];

const kanbanColumns = [
  { id: "todo", name: "Todo" },
  { id: "done", name: "Done" },
];

const kanbanData = [
  { id: "k1", name: "Write the fixture", column: "todo" },
  { id: "k2", name: "Screenshot it", column: "todo" },
  { id: "k3", name: "Move the components", column: "done" },
];

const markdown = `## Markdown

Text with \`inline code\`, a [link](https://example.com) and **bold**.

- One
- Two

> [!NOTE]
> A callout on tokens.css.

\`\`\`ts
const answer = 42;
\`\`\`
`;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

function Pane({ dark }: { dark: boolean }) {
  const [busy, setBusy] = useState(true);
  const [model, setModel] = useState("opus");
  return (
    <div className={dark ? "dark" : ""}>
      <main className="min-h-screen space-y-8 bg-background p-8 text-foreground">
        <h1 className="text-lg font-semibold">{dark ? "Dark" : "Light"}</h1>

        <Section title="Loaders">
          <div className="flex flex-wrap items-center gap-4">
            <Spinner />
            <Spinner variant="circle" />
            <Spinner variant="circle" size="sm" />
            <Spinner variant="ring" />
            <Button loading>Saving</Button>
            <Button variant="ghost" size="icon" aria-label="Refresh" onClick={() => setBusy((b) => !b)}>
              <RefreshSpinIcon busy={busy} />
            </Button>
          </div>
          <div className="h-24 rounded-surface bg-card">
            <CenteredSpinner label="Loading pane" />
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <LoadingState variant="Drive" />
            <LoadingState variant="Dots" size="sm" />
            <LoadingState variant="Orbit" iconOnly label="Working" />
          </div>
        </Section>

        <Section title="ListRow, Surface, BorderBeam, Avatar, StatusDot">
          <div className="grid max-w-md gap-2">
            <ListRow accentClassName="bg-primary" onClick={() => {}} aria-label="Selected row" selected>
              Selected row
            </ListRow>
            <ListRow onClick={() => {}} aria-label="Idle row">
              Idle row (hover me)
            </ListRow>
          </div>
          <Surface className="max-w-md">Surface, default density</Surface>
          <div className="flex flex-wrap gap-4">
            <BorderBeam active className="rounded-surface">
              <div className="rounded-surface bg-card p-4">Mono beam</div>
            </BorderBeam>
            <BorderBeam active colorVariant="colorful" size="lg" className="rounded-surface">
              <div className="rounded-surface bg-card p-4">Colourful beam</div>
            </BorderBeam>
          </div>
          <div className="flex items-center gap-3">
            <Avatar>
              <AvatarFallback>VB</AvatarFallback>
            </Avatar>
            <Avatar className="h-7 w-7">
              <AvatarFallback>A</AvatarFallback>
            </Avatar>
            {tones.map((tone) => (
              <span key={tone} className="flex items-center gap-1 text-xs">
                <StatusDot tone={tone} />
                {tone}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Kanban and list">
          <KanbanProvider columns={kanbanColumns} data={kanbanData} className="max-w-xl">
            <div className="grid grid-cols-2 gap-3">
              {kanbanColumns.map((column) => (
                <KanbanBoard id={column.id} key={column.id}>
                  <KanbanHeader>{column.name}</KanbanHeader>
                  <KanbanCards id={column.id}>
                    {(item) => (
                      <KanbanCard key={item.id} id={item.id} className="p-2">
                        {item.name}
                      </KanbanCard>
                    )}
                  </KanbanCards>
                </KanbanBoard>
              ))}
            </div>
          </KanbanProvider>
          <SortableListProvider onDragEnd={() => {}} className="max-w-md">
            <SortableListGroup id="g1">
              <SortableListHeader name="Planned" color="#3B7DD8" />
              <SortableListItems>
                <SortableListItem id="l1" name="First item" index={0} parent="g1" />
                <SortableListItem id="l2" name="Second item" index={1} parent="g1" />
              </SortableListItems>
            </SortableListGroup>
          </SortableListProvider>
        </Section>

        <Section title="Activity, trace, plan, test results">
          <div className="max-w-xl">
            <ActivityTasks steps={steps} isStreaming />
          </div>
          <AgentTrace className="max-w-xl">
            <AgentTraceLine>
              <AgentTraceIcon>
                <IconFile />
              </AgentTraceIcon>
              <AgentTraceTitle>Read spinner.tsx</AgentTraceTitle>
              <AgentTraceDescription>240 lines</AgentTraceDescription>
            </AgentTraceLine>
            <AgentTraceLine status="running">
              <AgentTraceIcon>
                <Spinner variant="circle" size="sm" decorative />
              </AgentTraceIcon>
              <AgentTraceTitle shimmer>Running tests</AgentTraceTitle>
            </AgentTraceLine>
            <AgentTraceLine status="error">
              <AgentTraceTitle>Typecheck failed</AgentTraceTitle>
            </AgentTraceLine>
          </AgentTrace>
          <AgentPlan defaultOpen className="max-w-xl">
            <AgentPlanHeader>
              <AgentPlanTitle>Move the spinners</AgentPlanTitle>
              <AgentPlanTrigger />
            </AgentPlanHeader>
            <AgentPlanContent>
              <p className="flex items-center gap-2 text-sm">
                <IconCheck className="size-4" /> Snapshot first
              </p>
            </AgentPlanContent>
          </AgentPlan>
          <TestResults summary={{ passed: 8, failed: 1, skipped: 1, total: 10, duration: 1234 }} className="max-w-xl">
            <TestResultsHeader>
              <TestResultsSummary />
            </TestResultsHeader>
            <TestResultsProgress />
            <TestResultsContent>
              <TestSuite name="spinner" status="failed" defaultOpen>
                <TestSuiteName />
                <TestSuiteStats passed={2} failed={1} />
                <TestSuiteContent>
                  <TestResult name="renders the ring" status="passed" duration={12} />
                  <TestResult name="keeps the circle colours" status="failed" duration={30} />
                  <TestResult name="runs in a hidden tab" status="skipped" />
                </TestSuiteContent>
              </TestSuite>
            </TestResultsContent>
          </TestResults>
        </Section>

        <Section title="Model picker content">
          <div className="max-w-md rounded-surface bg-popover text-popover-foreground">
            <ModelPickerContent
              value={model}
              accountId={null}
              options={models}
              onSelect={(id) => setModel(id)}
            />
          </div>
        </Section>

        <Section title="Markdown">
          <div className="max-w-xl">
            <Markdown>{markdown}</Markdown>
          </div>
        </Section>
      </main>
    </div>
  );
}

export function Fixture() {
  const theme = new URLSearchParams(window.location.search).get("theme");
  return (
    <LazyMotion features={domAnimation}>
      <TooltipProvider>
        <div className={theme ? "" : "grid grid-cols-2"}>
          {theme !== "dark" && <Pane dark={false} />}
          {theme !== "light" && <Pane dark />}
        </div>
      </TooltipProvider>
    </LazyMotion>
  );
}
