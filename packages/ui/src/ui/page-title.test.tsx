// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it } from "vitest";
import { PageHeader, PageTitle, pageTitleClass } from "./page-title";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

afterEach(() => {
  document.body.innerHTML = "";
});

it("PageTitle uses the page title class string", async () => {
  expect(pageTitleClass).toBe("text-xl font-semibold leading-tight tracking-tight");
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => createRoot(host).render(<PageTitle>Notes</PageTitle>));
  const h1 = host.querySelector("h1")!;
  expect(h1.className.split(" ")).toEqual(expect.arrayContaining(["text-xl", "font-semibold", "leading-tight", "tracking-tight"]));
  expect(h1.className).not.toMatch(/font-(light|normal|medium)/);
});

it("PageHeader renders the title and action", async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => createRoot(host).render(<PageHeader title="Notes" action={<button type="button">New</button>} />));
  expect(host.querySelector("header h1")?.textContent).toBe("Notes");
  expect(host.querySelector("header button")?.textContent).toBe("New");
});

it("PageHeader omits the action wrapper when empty", async () => {
  const host = document.createElement("div");
  document.body.appendChild(host);
  await act(async () => createRoot(host).render(<PageHeader title="Notes" />));
  expect(host.querySelector("header")?.children).toHaveLength(1);
});
