// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it } from "vitest";
import { buttonVariants } from "./button";
import { Field, FieldControl, FieldDescription, FieldError, FieldLabel } from "./field";
import { Input } from "./input";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | null = null;

async function mount(node: ReactNode) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const created = createRoot(host);
  root = created;
  await act(async () => created.render(node));
  return { rerender: (next: ReactNode) => act(async () => created.render(next)) };
}

const input = () => document.querySelector("input") as HTMLInputElement;
const label = () => document.querySelector("label") as HTMLLabelElement;

afterEach(async () => {
  await act(async () => root?.unmount());
  document.body.innerHTML = "";
  root = null;
});

describe("Field", () => {
  it("points the label at the control with a generated id", async () => {
    await mount(
      <Field>
        <FieldLabel>Name</FieldLabel>
        <FieldControl />
      </Field>,
    );
    expect(input().id).not.toBe("");
    expect(label().htmlFor).toBe(input().id);
  });

  it("uses controlId for the control and the label", async () => {
    await mount(
      <Field controlId="name">
        <FieldLabel>Name</FieldLabel>
        <FieldControl />
      </Field>,
    );
    expect(input().id).toBe("name");
    expect(label().htmlFor).toBe("name");
  });

  it("leaves aria-describedby and aria-invalid off without a description or error", async () => {
    await mount(
      <Field>
        <FieldLabel>Name</FieldLabel>
        <FieldControl />
      </Field>,
    );
    expect(input().hasAttribute("aria-describedby")).toBe(false);
    expect(input().hasAttribute("aria-invalid")).toBe(false);
  });

  it("lists the description id, then the error id, in aria-describedby", async () => {
    const { rerender } = await mount(
      <Field controlId="email">
        <FieldControl />
        <FieldDescription>We never share it.</FieldDescription>
      </Field>,
    );
    const description = document.getElementById("email-description");
    expect(description?.textContent).toBe("We never share it.");
    expect(input().getAttribute("aria-describedby")).toBe("email-description");
    expect(input().hasAttribute("aria-invalid")).toBe(false);

    await rerender(
      <Field controlId="email">
        <FieldControl />
        <FieldDescription>We never share it.</FieldDescription>
        <FieldError>Enter a valid email.</FieldError>
      </Field>,
    );
    expect(document.getElementById("email-error")?.textContent).toBe("Enter a valid email.");
    expect(input().getAttribute("aria-describedby")).toBe("email-description email-error");
    expect(input().getAttribute("aria-invalid")).toBe("true");

    await rerender(
      <Field controlId="email">
        <FieldControl />
      </Field>,
    );
    expect(input().hasAttribute("aria-describedby")).toBe(false);
  });

  it("keeps an aria-describedby the caller passes", async () => {
    await mount(
      <Field controlId="n">
        <FieldControl aria-describedby="extra" />
        <FieldError>Bad.</FieldError>
      </Field>,
    );
    expect(input().getAttribute("aria-describedby")).toBe("extra n-error");
  });

  it("throws outside a Field", async () => {
    const original = console.error;
    console.error = () => {};
    try {
      await expect(mount(<FieldControl />)).rejects.toThrow("FieldControl must be used inside <Field>");
    } finally {
      console.error = original;
    }
  });

  it("leaves a plain Input without wiring attributes", async () => {
    await mount(<Input />);
    expect(input().hasAttribute("id")).toBe(false);
    expect(input().hasAttribute("aria-describedby")).toBe(false);
  });
});

describe("buttonVariants", () => {
  it("is a class recipe for non-button elements", () => {
    expect(buttonVariants({ variant: "primary" })).toBe(buttonVariants({ variant: "default" }));
    expect(buttonVariants({ variant: "default" })).toContain("bg-primary");
  });
});
