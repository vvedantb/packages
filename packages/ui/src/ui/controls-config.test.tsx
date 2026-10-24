// @vitest-environment happy-dom
// UiConfig entries and new opt-in props of the controls (button, badge, fields,
// toggles, tabs, accordion, collapsible, calendar, carousel): no entry renders
// the built-in DOM, an entry replaces the parts it names, explicit props win.
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./accordion";
import { Badge } from "./badge";
import { Button } from "./button";
import { ButtonGroup, ButtonGroupText } from "./button-group";
import { Calendar, CalendarDayButton } from "./calendar";
import { Carousel, CarouselContent, CarouselDots, CarouselItem, useCarousel } from "./carousel";
import { Checkbox } from "./checkbox";
import { ClearInput } from "./clear-input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./collapsible";
import { Input } from "./input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "./input-group";
import { SearchInput } from "./search-input";
import { Slider } from "./slider";
import { Switch } from "./switch";
import { Tabs, TabsBar, TabsContent, TabsList, TabsTrigger } from "./tabs";
import { syncTabsPill } from "./tabsSliding";
import { Textarea } from "./textarea";
import { type UiConfig, UiConfigProvider } from "./ui-config";
import * as rootEntry from "../index";

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

function el(host: HTMLElement, selector: string): Element {
  const found = host.querySelector(selector);
  if (!found) throw new Error(`missing ${selector}`);
  return found;
}

function cls(host: HTMLElement, selector: string): string | null {
  return el(host, selector).getAttribute("class");
}

describe("no entry", () => {
  const nodes: Record<string, ReactNode> = {
    Button: <Button size="icon-sm" variant="ghost" className="mt-1">Go</Button>,
    Badge: <Badge variant="success">New</Badge>,
    Input: <Input placeholder="Name" />,
    Textarea: <Textarea />,
    Checkbox: <Checkbox defaultChecked />,
    Switch: <Switch defaultChecked />,
    Slider: <Slider defaultValue={[20]} />,
    ButtonGroup: (
      <ButtonGroup orientation="vertical">
        <Button>A</Button>
        <ButtonGroupText>B</ButtonGroupText>
      </ButtonGroup>
    ),
    InputGroup: (
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align="inline-end"><InputGroupButton size="icon-xs">x</InputGroupButton></InputGroupAddon>
      </InputGroup>
    ),
    ClearInput: <ClearInput value="abc" onChange={() => {}} />,
    SearchInput: <SearchInput value="" onChange={() => {}} shortcut="/" />,
    Calendar: <Calendar mode="single" month={new Date(2026, 0, 1)} today={new Date(2026, 0, 2)} />,
    Tabs: (
      <Tabs defaultValue="a">
        <TabsList variant="segmented"><TabsTrigger value="a">A</TabsTrigger></TabsList>
        <TabsContent value="a">A</TabsContent>
      </Tabs>
    ),
    Accordion: (
      <Accordion type="single" defaultValue="a">
        <AccordionItem value="a"><AccordionTrigger>Q</AccordionTrigger><AccordionContent>A</AccordionContent></AccordionItem>
      </Accordion>
    ),
    Collapsible: (
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="x">T</CollapsibleTrigger>
        <CollapsibleContent>B</CollapsibleContent>
      </Collapsible>
    ),
  };

  it.each(Object.keys(nodes))("%s renders the built-in DOM under an empty config", async (name) => {
    // React ids count up across mounts
    const ids = (html: string) => html.replace(/_r_[0-9a-z]+_/g, "_r_");
    const plain = ids((await mount(nodes[name])).innerHTML);
    const empty = ids((await mount(nodes[name], {})).innerHTML);
    expect(empty).toBe(plain);
  });
});

describe("UiConfig.cn", () => {
  it("replaces the class merger of the components that read it", async () => {
    const config: UiConfig = { cn: (...inputs) => inputs.filter(Boolean).join(" ") + " merged" };
    // the built-in cn treats `rounded-field` as a radius and drops it
    expect(el(await mount(<Input className="rounded-none" />), "input").classList.contains("rounded-field")).toBe(false);
    const host = await mount(<Input className="rounded-none" />, config);
    expect(el(host, "input").classList.contains("merged")).toBe(true);
    expect(el(host, "input").classList.contains("rounded-field")).toBe(true);
  });
});

describe("Button", () => {
  it("replaces the base, variant and size classes it names, and merges className last", async () => {
    const config: UiConfig = {
      Button: { classes: { base: "btn", variant: { ghost: "ghost" }, size: { sm: "small" } } },
    };
    expect(cls(await mount(<Button variant="ghost" size="sm" className="mt-1">Go</Button>, config), "button")).toBe(
      "btn ghost small mt-1",
    );
    // `default` variant and size are not in the entry: built-in classes stay
    const host = await mount(<Button>Go</Button>, config);
    expect(el(host, "button").classList.contains("btn")).toBe(true);
    expect(el(host, "button").classList.contains("bg-primary")).toBe(true);
    expect(el(host, "button").classList.contains("h-10")).toBe(true);
  });

  it("has an xs size", async () => {
    const host = await mount(<Button size="xs">Go</Button>);
    expect(el(host, "button").classList.contains("h-7")).toBe(true);
    expect(el(host, "button").classList.contains("hit-target")).toBe(true);
  });
});

describe("Badge", () => {
  it("replaces base and variant classes", async () => {
    const config: UiConfig = { Badge: { classes: { base: "pill", variant: { warning: "warn" } } } };
    expect(cls(await mount(<Badge variant="warning">!</Badge>, config), "div")).toBe("pill warn");
    expect(cls(await mount(<Badge variant="success">!</Badge>, config), "div")).toBe(
      "pill border-success/25 bg-success/12 text-success",
    );
  });
});

describe("Input and Textarea", () => {
  it("replace the field classes", async () => {
    const config: UiConfig = { Input: { classes: { base: "field" } }, Textarea: { classes: { base: "area" } } };
    expect(cls(await mount(<Input className="w-10" />, config), "input")).toBe("field w-10");
    expect(cls(await mount(<Textarea />, config), "textarea")).toBe("area");
  });
});

describe("Checkbox", () => {
  it("replaces part classes and takes the icon from config, the prop winning", async () => {
    const config: UiConfig = {
      Checkbox: { classes: { root: "box", indicator: "tick" }, icon: <i data-icon="config" /> },
    };
    const host = await mount(<Checkbox defaultChecked />, config);
    expect(cls(host, "button")).toBe("box");
    expect(cls(host, "span")).toBe("tick");
    expect(host.querySelector("[data-icon=config]")).not.toBeNull();
    const own = await mount(<Checkbox defaultChecked icon={<i data-icon="prop" />} />, config);
    expect(own.querySelector("[data-icon=prop]")).not.toBeNull();
    expect(own.querySelector("[data-icon=config]")).toBeNull();
  });
});

describe("Switch and Slider", () => {
  it("replace part classes", async () => {
    const sw = await mount(<Switch />, { Switch: { classes: { root: "track", thumb: "knob" } } });
    expect(cls(sw, "button")).toBe("track");
    expect(cls(sw, "span")).toBe("knob");
    const slider = await mount(<Slider defaultValue={[10]} trackClassName="h-2" />, {
      Slider: { classes: { root: "r", track: "t", range: "g", thumb: "b" } },
    });
    expect(cls(slider, "span")).toBe("r");
    expect(cls(slider, "span > span")).toBe("t h-2");
    expect(cls(slider, "span > span > span")).toBe("g");
    expect(cls(slider, "[role=slider]")).toBe("b");
  });
});

describe("ButtonGroup and InputGroup", () => {
  it("replace the parts they name", async () => {
    const group = await mount(
      <ButtonGroup>
        <ButtonGroupText>B</ButtonGroupText>
      </ButtonGroup>,
      { ButtonGroup: { classes: { base: "row", text: "label" } } },
    );
    const root = el(group, "[data-slot=button-group]");
    expect(root.classList.contains("row")).toBe(true);
    expect(root.classList.contains("[&>*:not(:first-child)]:rounded-l-none")).toBe(true);
    expect(cls(group, "[data-slot=button-group] > div")).toBe("label");

    const input = await mount(
      <InputGroup>
        <InputGroupInput />
        <InputGroupAddon align="inline-end"><InputGroupButton size="sm">Go</InputGroupButton></InputGroupAddon>
      </InputGroup>,
      {
        InputGroup: {
          classes: { root: "ig", input: "ctl", addon: { align: { "inline-end": "end" } }, button: { size: { sm: "s" } } },
        },
      },
    );
    expect(cls(input, "[data-slot=input-group]")).toBe("ig");
    expect(el(input, "input").classList.contains("ctl")).toBe(true);
    expect(el(input, "[data-slot=input-group-addon]").classList.contains("end")).toBe(true);
    expect(el(input, "[data-slot=input-group-addon]").classList.contains("order-last")).toBe(false);
    expect(el(input, "button").classList.contains("s")).toBe(true);
  });
});

describe("ClearInput animation none", () => {
  it("renders wrapper, input and a clear button that clears at once and focuses", async () => {
    const onChange = vi.fn();
    const host = await mount(<ClearInput value="abc" onChange={onChange} animation="none" className="h-9" />);
    expect(host.querySelector(".t-clear")).toBeNull();
    expect(host.querySelector(".t-clear-clip")).toBeNull();
    expect(cls(host, "div")).toBe("relative");
    expect(el(host, "input").classList.contains("pr-9")).toBe(true);
    await act(async () => el(host, "button").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(onChange).toHaveBeenCalledWith("");
    expect(document.activeElement).toBe(el(host, "input"));
    const empty = await mount(<ClearInput value="" onChange={onChange} animation="none" />);
    expect(empty.querySelector("button")).toBeNull();
  });

  it("takes the animation and classes from config; the prop wins", async () => {
    const config: UiConfig = { ClearInput: { animation: "none", classes: { wrapper: "w", input: "i", button: "b" } } };
    const host = await mount(<ClearInput value="a" onChange={() => {}} />, config);
    expect(cls(host, "div")).toBe("w");
    expect(cls(host, "input")).toBe("i pr-9");
    expect(cls(host, "button")).toBe("b");
    const dissolve = await mount(<ClearInput value="a" onChange={() => {}} animation="dissolve" />, config);
    expect(dissolve.querySelector(".t-clear")?.classList.contains("w")).toBe(true);
    expect(cls(dissolve, "button")).toBe("t-clear-btn b");
  });
});

describe("SearchInput", () => {
  it("calls onClear after onChange when the value empties", async () => {
    const calls: string[] = [];
    const host = await mount(
      <SearchInput value="a" onChange={(v) => calls.push(`change:${v}`)} onClear={() => calls.push("clear")} animation="none" />,
    );
    await act(async () => el(host, "button").dispatchEvent(new MouseEvent("click", { bubbles: true })));
    expect(calls).toEqual(["change:", "clear"]);
  });

  it("merges inputClassName into the input", async () => {
    const host = await mount(<SearchInput value="" onChange={() => {}} className="a" inputClassName="b" />);
    expect(el(host, "input").classList.contains("a")).toBe(true);
    expect(el(host, "input").classList.contains("b")).toBe(true);
  });

  it("takes defaults from config: wrapper className, no aria-label or enter hint, classes", async () => {
    const config: UiConfig = {
      SearchInput: {
        classNameTarget: "wrapper",
        label: false,
        enterKeyHint: false,
        placeholder: "Search...",
        clearLabel: "Clear",
        iconSize: 15,
        classes: { wrapper: "wrap", input: "h-9", icon: "glyph" },
      },
      ClearInput: { animation: "none" },
    };
    const host = await mount(<SearchInput value="x" onChange={() => {}} className="max-w-none" inputClassName="h-8" />, config);
    const input = el(host, "input");
    expect(cls(host, "div")).toBe("relative wrap max-w-none");
    expect(input.getAttribute("class")).toContain("pr-9 h-8");
    expect(input.classList.contains("max-w-none")).toBe(false);
    expect(input.hasAttribute("aria-label")).toBe(false);
    expect(input.hasAttribute("enterkeyhint")).toBe(false);
    expect(input.getAttribute("placeholder")).toBe("Search...");
    expect(el(host, "button").getAttribute("aria-label")).toBe("Clear");
    expect(el(host, "svg").getAttribute("width")).toBe("15");
    expect(el(host, "svg").getAttribute("class")).toBe("tabler-icon tabler-icon-search glyph");
    const labelled = await mount(<SearchInput value="" onChange={() => {}} label="Find" enterKeyHint="go" />, config);
    expect(el(labelled, "input").getAttribute("aria-label")).toBe("Find");
    expect(el(labelled, "input").getAttribute("enterkeyhint")).toBe("go");
  });
});

describe("Calendar", () => {
  const month = new Date(2026, 0, 1);

  it("replaces the root classes and each classNames key it names", async () => {
    const host = await mount(<Calendar mode="single" month={month} className="extra" />, {
      Calendar: { classes: { base: "cal", weekday: "wd" } },
    });
    expect(cls(host, "[data-slot=calendar]")).toBe("w-fit rdp-root cal extra");
    expect(cls(host, "th")).toBe("wd");
    expect(el(host, "[data-slot=calendar]").querySelector(".rdp-month_grid, .w-full.border-collapse")).not.toBeNull();
  });

  it("CalendarDayButton mirrors selected onto the button, via config components", async () => {
    const selected = new Date(2026, 0, 15);
    const host = await mount(<Calendar mode="single" month={month} selected={selected} />, {
      Calendar: { components: { DayButton: CalendarDayButton } },
    });
    expect(host.querySelectorAll("button[data-selected=true]")).toHaveLength(1);
    expect(host.querySelector("button[day]")).toBeNull();
    const plain = await mount(<Calendar mode="single" month={month} selected={selected} />);
    expect(plain.querySelector("button[data-selected]")).toBeNull();
  });
});

describe("Carousel", () => {
  function Probe() {
    const { selectedIndex, scrollSnaps, scrollTo } = useCarousel();
    return <output data-index={selectedIndex} data-snaps={scrollSnaps.length} data-scroll={typeof scrollTo} />;
  }

  it("exposes the selected index, snaps and scrollTo; dots render nothing for one page", async () => {
    const host = await mount(
      <Carousel>
        <CarouselContent><CarouselItem>A</CarouselItem></CarouselContent>
        <CarouselDots />
        <Probe />
      </Carousel>,
      { Carousel: { classes: { dots: "dots" } } },
    );
    expect(el(host, "output").getAttribute("data-index")).toBe("0");
    expect(el(host, "output").getAttribute("data-scroll")).toBe("function");
    expect(host.querySelector(".dots")).toBeNull();
  });
});

describe("Tabs", () => {
  const tabs = (list?: ReactNode) => (
    <Tabs defaultValue="a">
      {list ?? (
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
        </TabsList>
      )}
      <TabsContent value="a">A</TabsContent>
    </Tabs>
  );

  it("takes the list variant from config; the prop wins", async () => {
    const config: UiConfig = { Tabs: { variant: "segmented" } };
    expect(el(await mount(tabs(), config), "[role=tablist]").getAttribute("data-variant")).toBe("segmented");
    const own = await mount(tabs(<TabsList variant="soft"><TabsTrigger value="a">A</TabsTrigger></TabsList>), config);
    expect(el(own, "[role=tablist]").getAttribute("data-variant")).toBe("soft");
  });

  it("replaces list, size, pill, trigger and content classes", async () => {
    const config: UiConfig = {
      Tabs: {
        variant: "segmented",
        classes: { list: "list", size: { default: "h-10", sm: "h-8" }, pill: "pill", trigger: "tab", content: "panel" },
      },
    };
    const host = await mount(tabs(), config);
    expect(cls(host, "[role=tablist]")).toBe("list h-10");
    expect(cls(host, "[aria-hidden=true]")).toBe("pill");
    expect(cls(host, "[role=tab]")).toBe("tab");
    expect(cls(host, "[role=tabpanel]")).toBe("panel");
    const sm = await mount(tabs(<TabsList size="sm"><TabsTrigger value="a">A</TabsTrigger></TabsList>), config);
    expect(cls(sm, "[role=tablist]")).toBe("list h-8");
  });

  it("has a built-in sm size that shrinks the triggers", async () => {
    const host = await mount(tabs(<TabsList size="sm"><TabsTrigger value="a">A</TabsTrigger></TabsList>));
    expect(el(host, "[role=tablist]").classList.contains("[&_.t-tab]:text-xs")).toBe(true);
  });

  it("moves the pill on both axes with pillMotion xy", () => {
    const list = document.createElement("div");
    const tab = document.createElement("button");
    tab.className = "t-tab";
    tab.setAttribute("data-state", "active");
    list.appendChild(tab);
    const pill = document.createElement("span");
    syncTabsPill(list, pill, true, "xy");
    expect(pill.getAttribute("style")).toBe("top: 0px; transform: translate(0px, 0px); width: 0px; height: 0px;");
    syncTabsPill(list, pill, true);
    expect(pill.style.transform).toBe("translateX(0px)");
  });

  it("TabsBar renders the strip with an actions slot", async () => {
    const host = await mount(<TabsBar size="sm" actions={<button type="button">Act</button>}>T</TabsBar>);
    expect(cls(host, "div")).toBe("flex shrink-0 flex-wrap items-center gap-2 border-b border-border px-2 py-1.5");
    expect(cls(host, ".ml-auto")).toBe("ml-auto flex items-center gap-2");
    expect((await mount(<TabsBar>T</TabsBar>)).querySelector(".ml-auto")).toBeNull();
  });
});

describe("Accordion", () => {
  it("replaces part classes and takes the icon from config, the prop winning", async () => {
    const config: UiConfig = {
      Accordion: {
        classes: { item: "item", header: "head", trigger: "trig", content: "panel", contentInner: "inner" },
        icon: <i data-icon="config" />,
      },
    };
    const node = (icon?: ReactNode) => (
      <Accordion type="single" defaultValue="a">
        <AccordionItem value="a">
          <AccordionTrigger icon={icon}>Q</AccordionTrigger>
          <AccordionContent>A</AccordionContent>
        </AccordionItem>
      </Accordion>
    );
    const host = await mount(node(), config);
    expect(cls(host, "[data-slot=accordion-item]")).toBe("item");
    expect(cls(host, "h3")).toBe("head");
    expect(cls(host, "button")).toBe("trig");
    expect(cls(host, "[data-slot=accordion-content]")).toBe("panel");
    expect(cls(host, "[data-slot=accordion-content] > div")).toBe("inner");
    expect(host.querySelector("[data-icon=config]")).not.toBeNull();
    expect((await mount(node(<i data-icon="prop" />), config)).querySelector("[data-icon=config]")).toBeNull();
  });
});

describe("Collapsible", () => {
  it("adds the configured classes before className", async () => {
    const host = await mount(
      <Collapsible defaultOpen>
        <CollapsibleTrigger className="x">T</CollapsibleTrigger>
        <CollapsibleContent>B</CollapsibleContent>
      </Collapsible>,
      { Collapsible: { classes: { trigger: "cursor-pointer", content: "animate" } } },
    );
    expect(cls(host, "button")).toBe("cursor-pointer x");
    expect(cls(host, "div[id]")).toBe("animate");
  });
});

describe("root entry", () => {
  it("exports the new controls", () => {
    for (const name of ["TabsBar", "CalendarDayButton", "CarouselDots", "useCarousel"]) {
      expect(rootEntry, name).toHaveProperty(name);
    }
  });
});
