// @vitest-environment happy-dom
// The three page motion providers as the apps have them today (the server flag
// query replaced by a store) against PageMotionProvider with the app's own
// MotionConfig wrapper.
import { LazyMotion, MotionConfig, MotionConfigContext, domAnimation } from "motion/react";
import { createContext, use, useContext, useEffect, useLayoutEffect, type ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { PageMotionProvider, useDisablePageMotion, type PageMotionConfigProps } from "../src/index.js";
import { resetServer, server, useServerValue } from "./parity/fakeServer";
import { mount, resetDom, step } from "./parity/harness";

function applyPageMotionDataset(disabled: boolean): void {
  document.documentElement.dataset.pageMotion = disabled ? "off" : "on";
}

// ---------------------------------------------------------------- reference copies
const AContext = createContext(false);
function RefA({ children }: { children: ReactNode }) {
  const disabled = useServerValue(server.disablePageMotion) === true;
  useLayoutEffect(() => {
    applyPageMotionDataset(disabled);
  }, [disabled]);
  return (
    <AContext.Provider value={disabled}>
      <MotionConfig reducedMotion={disabled ? "always" : "never"}>{children}</MotionConfig>
    </AContext.Provider>
  );
}

const BContext = createContext(false);
function RefB({ children }: { children: ReactNode }) {
  const disabled = useServerValue(server.disablePageMotion) === true;
  useLayoutEffect(() => {
    applyPageMotionDataset(disabled);
  }, [disabled]);
  return (
    <BContext value={disabled}>
      <LazyMotion features={domAnimation}>
        <MotionConfig reducedMotion={disabled ? "always" : "never"}>{children}</MotionConfig>
      </LazyMotion>
    </BContext>
  );
}

function RefC({ children }: { children: ReactNode }) {
  const disabled = useServerValue(server.disablePageMotion) === true;
  useLayoutEffect(() => {
    applyPageMotionDataset(disabled);
  }, [disabled]);
  return <MotionConfig reducedMotion={disabled ? "always" : "never"}>{children}</MotionConfig>;
}

// ---------------------------------------------------------------- adopted (the recipes)
function AdoptA({ children }: { children: ReactNode }) {
  const disabled = useServerValue(server.disablePageMotion) === true;
  return (
    <PageMotionProvider disabled={disabled} motionConfig={MotionConfig}>
      {children}
    </PageMotionProvider>
  );
}

/** app-b keeps LazyMotion between the context and MotionConfig. */
function LazyMotionConfig({ reducedMotion, children }: PageMotionConfigProps) {
  return (
    <LazyMotion features={domAnimation}>
      <MotionConfig reducedMotion={reducedMotion}>{children}</MotionConfig>
    </LazyMotion>
  );
}
function AdoptB({ children }: { children: ReactNode }) {
  const disabled = useServerValue(server.disablePageMotion) === true;
  return (
    <PageMotionProvider disabled={disabled} motionConfig={LazyMotionConfig}>
      {children}
    </PageMotionProvider>
  );
}

const AdoptC = AdoptA;

// ---------------------------------------------------------------- scenario
function scenario(Provider: (props: { children: ReactNode }) => ReactNode, useFlag: () => boolean | null) {
  resetDom();
  resetServer();
  const seen: unknown[] = [];
  function Probe() {
    const reducedMotion = useContext(MotionConfigContext).reducedMotion;
    const flag = useFlag();
    useLayoutEffect(() => {
      seen.push({ phase: "layout", reducedMotion, flag, attr: document.documentElement.dataset.pageMotion });
    });
    useEffect(() => {
      seen.push({ phase: "effect", attr: document.documentElement.dataset.pageMotion });
    });
    return null;
  }
  const app = mount(
    <Provider>
      <Probe />
    </Provider>,
  );
  step(() => server.disablePageMotion.set(true));
  step(() => server.disablePageMotion.set(false));
  app.unmount();
  seen.push({ afterUnmount: document.documentElement.dataset.pageMotion });
  return seen;
}

const noFlag = () => null;

describe("page motion parity", () => {
  it("app-a: dataset, reducedMotion and useDisablePageMotion", () => {
    const expected = scenario(RefA, () => use(AContext));
    expect(scenario(AdoptA, useDisablePageMotion)).toEqual(expected);
    expect(expected).toContainEqual({ phase: "layout", reducedMotion: "always", flag: true, attr: "on" });
    expect(expected).toContainEqual({ phase: "effect", attr: "off" });
    expect(expected.at(-1)).toEqual({ afterUnmount: "on" });
  });

  it("app-b: dataset and reducedMotion inside LazyMotion", () => {
    expect(scenario(AdoptB, noFlag)).toEqual(scenario(RefB, noFlag));
  });

  it("app-c: dataset and reducedMotion", () => {
    expect(scenario(AdoptC, noFlag)).toEqual(scenario(RefC, noFlag));
  });

  it("useDisablePageMotion is false outside the provider", () => {
    let flag: boolean | undefined;
    function Read() {
      flag = useDisablePageMotion();
      return null;
    }
    mount(<Read />).unmount();
    expect(flag).toBe(false);
  });
});
