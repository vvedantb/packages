// @vitest-environment happy-dom
// The queued-messages widget as vibot renders it (`Queue{count}`,
// `QueueHeader{count,isOpen,onToggle}`, `QueueList{open}`, `QueueItem{text,
// model,personalityName,personaName,personaImage,onEdit,onRemove}`): the DOM
// is pinned so the shared Queue parts cannot change it.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { MotionGlobalConfig } from "motion/react";
import { Queue, QueueHeader, QueueItem, QueueList } from "./queue";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

// Presence enters and exits finish at once instead of after a spring.
MotionGlobalConfig.skipAnimations = true;

let root: Root | null = null;

async function mount(node: ReactNode) {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

const noop = () => {};

const widget = (props: { count: number; open: boolean; className?: string }) => (
  <Queue count={props.count} className={props.className}>
    <QueueHeader count={props.count} isOpen={props.open} onToggle={noop} />
    <QueueList open={props.open}>
      <QueueItem
        text="Fix the build"
        model="anthropic/claude-sonnet"
        personalityName="Terse"
        personaName="Ada"
        personaImage="https://example.com/ada.png"
        onEdit={noop}
        onRemove={noop}
      />
      <QueueItem text="Plain" personaName="Bob" onEdit={noop} onRemove={noop} className="extra" />
      <QueueItem text="Bare" onEdit={noop} onRemove={noop} />
    </QueueList>
  </Queue>
);

describe("vibot Queue widget DOM", () => {
  it("renders nothing for an empty queue", async () => {
    const host = await mount(widget({ count: 0, open: true }));
    expect(host.innerHTML).toBe("");
  });

  it("renders the open widget", async () => {
    const host = await mount(widget({ count: 3, open: true, className: "mb-2" }));
    expect(host.innerHTML).toMatchSnapshot();
  });

  it("renders the closed widget", async () => {
    const host = await mount(widget({ count: 3, open: false }));
    expect(host.innerHTML).toMatchSnapshot();
  });

  it("renders the header with a custom class", async () => {
    const host = await mount(<QueueHeader count={1} isOpen={false} onToggle={noop} className="x" />);
    expect(host.innerHTML).toMatchSnapshot();
  });

  it("renders the editing state, then saves the trimmed text", async () => {
    const onEdit = vi.fn();
    const host = await mount(<QueueItem text="Draft" onEdit={onEdit} onRemove={noop} />);
    const [edit] = host.querySelectorAll("button");
    await act(async () => edit?.click());
    expect(host.innerHTML).toMatchSnapshot();
    const buttons = host.querySelectorAll("button");
    await act(async () => buttons[1]?.click());
    expect(onEdit).toHaveBeenCalledWith("Draft");
    expect(host.innerHTML).toMatchSnapshot();
  });

  it("calls onToggle and onRemove", async () => {
    const onToggle = vi.fn();
    const onRemove = vi.fn();
    const host = await mount(
      <>
        <QueueHeader count={1} isOpen onToggle={onToggle} />
        <QueueItem text="x" onEdit={noop} onRemove={onRemove} />
      </>,
    );
    const buttons = host.querySelectorAll("button");
    await act(async () => buttons[0]?.click());
    await act(async () => buttons[2]?.click());
    expect(onToggle).toHaveBeenCalledOnce();
    expect(onRemove).toHaveBeenCalledOnce();
  });
});
