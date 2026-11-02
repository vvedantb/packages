import { useEffect, useState, type ReactNode } from "react";
import { IconBolt, IconChevronLeft, IconChevronRight, IconSearch, IconX } from "@tabler/icons-react";
// The client entry: everything the demo needs, without the artifact viewers'
// `@vvedantb/server` import, so it runs without building that package.
import {
  Button,
  ButtonGroup,
  ButtonGroupText,
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  type ButtonProps,
} from "../../src/client";

const params = new URLSearchParams(window.location.search);

type Variant = NonNullable<ButtonProps["variant"]>;
type Size = NonNullable<ButtonProps["size"]>;
type Shape = NonNullable<ButtonProps["shape"]>;

const VARIANTS: Variant[] = ["default", "destructive", "outline", "secondary", "ghost", "link", "flat", "success", "warning"];
// The `rounded` grid keeps four variants so the page stays one screenshot long.
const ROUNDED_VARIANTS: Variant[] = ["default", "outline", "secondary", "ghost"];
const TEXT_SIZES: Size[] = ["xs", "sm", "default", "lg"];
const ICON_SIZES: Size[] = ["icon-xs", "icon-sm", "icon"];
const SIZES: Size[] = [...TEXT_SIZES, ...ICON_SIZES];

function Section({ title, children }: { title: ReactNode; children: ReactNode }) {
  return (
    <section className="space-y-3 rounded-lg border border-border p-4">
      <h2 className="text-sm font-medium text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

/** One row per variant, one column per size. Icon sizes show a bolt. */
function ShapeGrid({ shape, variants }: { shape?: Shape; variants: Variant[] }) {
  return (
    <div className="grid grid-cols-[6rem_repeat(7,max-content)] items-center gap-x-3 gap-y-2">
      <span />
      {SIZES.map((size) => (
        <span key={size} className="text-xs text-muted-foreground">
          {size}
        </span>
      ))}
      {variants.map((variant) => (
        <Row key={variant} variant={variant} shape={shape} />
      ))}
    </div>
  );
}

function Row({ variant, shape }: { variant: Variant; shape?: Shape }) {
  return (
    <>
      <span className="text-xs text-muted-foreground">{variant}</span>
      {SIZES.map((size) =>
        ICON_SIZES.includes(size) ? (
          <Button key={size} variant={variant} size={size} shape={shape} aria-label={`${variant} ${size}`}>
            <IconBolt />
          </Button>
        ) : (
          <Button key={size} variant={variant} size={size} shape={shape}>
            Button
          </Button>
        ),
      )}
    </>
  );
}

export function Fixture() {
  const [dark, setDark] = useState(params.get("theme") === "dark");

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <main className="min-h-screen max-w-4xl space-y-4 bg-background p-8 text-foreground">
      <div className="flex items-center gap-3">
        <Button onClick={() => setDark((d) => !d)}>Toggle theme</Button>
        <span className="text-sm text-muted-foreground">{dark ? "Dark" : "Light"}</span>
      </div>

      <Section title={<>Pill (default): every variant and size. Icon sizes are circles.</>}>
        <ShapeGrid variants={VARIANTS} />
      </Section>

      <Section title={<><code>shape=&quot;rounded&quot;</code> opt-out: the radius from before 0.31.0</>}>
        <ShapeGrid shape="rounded" variants={ROUNDED_VARIANTS} />
      </Section>

      <Section title={<>ButtonGroup with <code>shape=&quot;rounded&quot;</code> children</>}>
        <div className="flex flex-wrap items-start gap-6">
          <ButtonGroup>
            <Button variant="outline" shape="rounded">Day</Button>
            <Button variant="outline" shape="rounded">Week</Button>
            <Button variant="outline" shape="rounded">Month</Button>
          </ButtonGroup>

          <ButtonGroup className="[&>*:not(:first-child)]:rounded-l-md [&>*:not(:last-child)]:rounded-r-md">
            <Button variant="ghost" size="icon-sm" shape="rounded" aria-label="Previous branch">
              <IconChevronLeft size={14} />
            </Button>
            <ButtonGroupText className="border-none bg-transparent text-muted-foreground shadow-none">
              1 of 3
            </ButtonGroupText>
            <Button variant="ghost" size="icon-sm" shape="rounded" aria-label="Next branch">
              <IconChevronRight size={14} />
            </Button>
          </ButtonGroup>

          <ButtonGroup orientation="vertical">
            <Button variant="outline" shape="rounded">Top</Button>
            <Button variant="outline" shape="rounded">Middle</Button>
            <Button variant="outline" shape="rounded">Bottom</Button>
          </ButtonGroup>
        </div>
        <p className="text-xs text-muted-foreground">
          For comparison, default pill children. The inner edges still join, but the outer ends are half circles.
        </p>
        <ButtonGroup>
          <Button variant="outline">Day</Button>
          <Button variant="outline">Week</Button>
          <Button variant="outline">Month</Button>
        </ButtonGroup>
      </Section>

      <Section title={<>InputGroup with InputGroupButton (sets <code>shape=&quot;rounded&quot;</code> itself)</>}>
        <div className="max-w-md space-y-3">
          <InputGroup>
            <InputGroupAddon>
              <IconSearch />
            </InputGroupAddon>
            <InputGroupInput placeholder="Search" />
            <InputGroupAddon align="inline-end">
              <InputGroupButton size="icon-xs" aria-label="Clear">
                <IconX />
              </InputGroupButton>
              <InputGroupButton size="sm" variant="default">
                Go
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
        </div>
      </Section>
    </main>
  );
}
