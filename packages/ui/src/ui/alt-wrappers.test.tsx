// @vitest-environment happy-dom
// Pins the markup of the deprecated `Alt` exports (`AccordionAlt*`,
// `InputGroupAlt*`, `ClearInputAlt`) so they stay byte for byte while they
// wrap the main components. Each case renders with no provider and under a
// provider whose entries for the main components must not reach the Alts.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IconSearch } from "@tabler/icons-react";
import {
  AccordionAlt,
  AccordionContentAlt,
  AccordionItemAlt,
  AccordionTriggerAlt,
  ClearInputAlt,
  InputGroupAddonAlt,
  InputGroupAlt,
  InputGroupButtonAlt,
  InputGroupInputAlt,
  InputGroupTextAlt,
  InputGroupTextareaAlt,
  type UiConfig,
  UiConfigProvider,
} from "../index";

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let root: Root | null = null;

async function mount(node: ReactNode, config?: UiConfig) {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () =>
    created.render(config ? <UiConfigProvider config={config}>{node}</UiConfigProvider> : node),
  );
  return host;
}

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

/** React `useId` values (also inside Radix ids), numbered by first appearance. */
const REACT_ID = /«r[0-9a-z]+»|:r[0-9a-z]+:|_r_[0-9a-z]+_/g;

function serialise(host: HTMLElement): string {
  const ids = new Map<string, string>();
  return host.innerHTML.replace(REACT_ID, (id) => {
    const known = ids.get(id);
    if (known) return known;
    const next = `«id${ids.size}»`;
    ids.set(id, next);
    return next;
  });
}

/** Entries for the main components; the Alts must render as if they were absent. */
const mainConfig: UiConfig = {
  Accordion: {
    classes: { item: "c-item", header: "c-header", trigger: "c-trigger", content: "c-content", contentInner: "c-inner" },
    icon: <i>icon</i>,
  },
  InputGroup: {
    classes: {
      root: "c-root",
      addon: { base: "c-addon", align: { "inline-end": "c-end" } },
      button: { base: "c-button", size: { xs: "c-xs" } },
      text: "c-text",
      input: "c-input",
      textarea: "c-textarea",
    },
  },
  ClearInput: { animation: "dissolve", classes: { wrapper: "c-wrap", input: "c-input", button: "c-btn" } },
};

const accordionCases: Record<string, ReactNode> = {
  "single collapsible, one open": (
    <AccordionAlt type="single" collapsible defaultValue="a">
      <AccordionItemAlt value="a">
        <AccordionTriggerAlt>Open</AccordionTriggerAlt>
        <AccordionContentAlt>Body A</AccordionContentAlt>
      </AccordionItemAlt>
      <AccordionItemAlt value="b">
        <AccordionTriggerAlt>Closed</AccordionTriggerAlt>
        <AccordionContentAlt>Body B</AccordionContentAlt>
      </AccordionItemAlt>
    </AccordionAlt>
  ),
  "multiple, classNames on every part": (
    <AccordionAlt type="multiple" defaultValue={["a"]} className="root-x">
      <AccordionItemAlt value="a" className="item-x">
        <AccordionTriggerAlt className="trigger-x py-2">Open</AccordionTriggerAlt>
        <AccordionContentAlt className="content-x pb-2">Body</AccordionContentAlt>
      </AccordionItemAlt>
      <AccordionItemAlt value="b" disabled>
        <AccordionTriggerAlt>Disabled</AccordionTriggerAlt>
        <AccordionContentAlt forceMount>Forced</AccordionContentAlt>
      </AccordionItemAlt>
    </AccordionAlt>
  ),
};

const inputGroupCases: Record<string, ReactNode> = {
  "input with every addon align and button size": (
    <InputGroupAlt>
      <InputGroupAddonAlt>
        <IconSearch />
      </InputGroupAddonAlt>
      <InputGroupAddonAlt align="inline-start">
        <InputGroupTextAlt>https://</InputGroupTextAlt>
      </InputGroupAddonAlt>
      <InputGroupInputAlt placeholder="Search" />
      <InputGroupAddonAlt align="inline-end">
        <InputGroupButtonAlt>Go</InputGroupButtonAlt>
        <InputGroupButtonAlt size="sm">Small</InputGroupButtonAlt>
        <InputGroupButtonAlt size="icon-xs" aria-label="A">
          <IconSearch />
        </InputGroupButtonAlt>
        <InputGroupButtonAlt size="icon-sm" variant="default" type="submit" aria-label="B">
          <IconSearch />
        </InputGroupButtonAlt>
      </InputGroupAddonAlt>
    </InputGroupAlt>
  ),
  "textarea with block addons, error and classNames": (
    <InputGroupAlt error className="root-x" id="g">
      <InputGroupAddonAlt align="block-start" className="addon-x">
        <InputGroupTextAlt className="text-x">Title</InputGroupTextAlt>
      </InputGroupAddonAlt>
      <InputGroupTextareaAlt className="ta-x" rows={2} defaultValue="v" />
      <InputGroupAddonAlt align="block-end">
        <InputGroupButtonAlt className="btn-x" loading>
          Send
        </InputGroupButtonAlt>
      </InputGroupAddonAlt>
    </InputGroupAlt>
  ),
  "input className and props": (
    <InputGroupAlt error={false}>
      <InputGroupInputAlt className="in-x" id="i" disabled />
    </InputGroupAlt>
  ),
};

const clearInputCases: Record<string, ReactNode> = {
  empty: <ClearInputAlt value="" onChange={() => {}} />,
  filled: <ClearInputAlt value="abc" onChange={() => {}} />,
  "empty with placeholder": <ClearInputAlt value="" onChange={() => {}} placeholder="Find" />,
  "every prop": (
    <ClearInputAlt
      value="abc"
      onChange={() => {}}
      placeholder="Find"
      wrapperClassName="w-40"
      className="h-9"
      leading={<span className="absolute left-2">L</span>}
      clearLabel="Reset"
      id="ci"
      disabled
    />
  ),
};

const families = { Accordion: accordionCases, InputGroup: inputGroupCases, ClearInput: clearInputCases };

for (const [family, cases] of Object.entries(families)) {
  describe(`${family}Alt markup`, () => {
    for (const [name, node] of Object.entries(cases)) {
      it(name, async () => {
        const plain = serialise(await mount(node));
        expect(plain).toMatchSnapshot();
        expect(serialise(await mount(node, mainConfig))).toBe(plain);
      });
    }
  });
}

describe("Alt behaviour", () => {
  it("ClearInputAlt clears and focuses the input", async () => {
    const onChange = vi.fn();
    const host = await mount(<ClearInputAlt value="abc" onChange={onChange} />);
    const button = host.querySelector("button");
    await act(async () => button?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("");
    expect(document.activeElement).toBe(host.querySelector("input"));
  });

  it("InputGroupAddonAlt focuses the group's textarea; a caller onClick replaces that", async () => {
    const host = await mount(
      <InputGroupAlt>
        <InputGroupAddonAlt align="block-start">
          <span>Label</span>
        </InputGroupAddonAlt>
        <InputGroupTextareaAlt />
      </InputGroupAlt>,
    );
    const addon = host.querySelector("[data-align]");
    await act(async () => addon?.querySelector("span")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(document.activeElement).toBe(host.querySelector("textarea"));

    const onClick = vi.fn();
    const other = await mount(
      <InputGroupAlt>
        <InputGroupAddonAlt onClick={onClick}>x</InputGroupAddonAlt>
        <InputGroupInputAlt />
      </InputGroupAlt>,
    );
    await act(async () => other.querySelector("[data-input-group] > div")?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(document.activeElement).not.toBe(other.querySelector("input"));
  });
});
