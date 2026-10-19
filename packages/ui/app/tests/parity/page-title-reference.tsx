// The three page title contexts and their page-side publishers as the apps
// have them today, copied verbatim (app-b's mobile actions portal is left out:
// it stays in the app and only reads `mobileActionsSlot`).
import { createContext, use, useEffect, useState, type ReactNode } from "react";

// ---------------------------------------------------------------- app-a
type AValue = { pageTitle: string; setPageTitle: (title: string) => void };
const AContext = createContext<AValue>({ pageTitle: "", setPageTitle: () => {} });

export const appA = {
  PageTitleProvider({ children }: { children: ReactNode }) {
    const [pageTitle, setPageTitle] = useState("");
    return <AContext value={{ pageTitle, setPageTitle }}>{children}</AContext>;
  },
  usePageTitle: () => use(AContext),
  /** The effect in the app's page container. */
  usePublish(title: string | undefined) {
    const { setPageTitle } = use(AContext);
    useEffect(() => {
      setPageTitle(title ?? "");
      return () => setPageTitle("");
    }, [title, setPageTitle]);
  },
};

// ---------------------------------------------------------------- app-b
type BValue = {
  pageTitle: string;
  setPageTitle: (title: string) => void;
  mobileActionsSlot: HTMLElement | null;
  setMobileActionsSlot: (slot: HTMLElement | null) => void;
};
const BContext = createContext<BValue | null>(null);
function useBPageTitle() {
  const context = use(BContext);
  if (context === null) {
    throw new Error("usePageTitle must be used within a PageTitleProvider");
  }
  return context;
}

export const appB = {
  PageTitleProvider({ children }: { children: ReactNode }) {
    const [pageTitle, setPageTitle] = useState("");
    const [mobileActionsSlot, setMobileActionsSlot] = useState<HTMLElement | null>(null);
    return (
      <BContext value={{ pageTitle, setPageTitle, mobileActionsSlot, setMobileActionsSlot }}>{children}</BContext>
    );
  },
  usePageTitle: useBPageTitle,
  /** `usePageTitleSync`. */
  usePublish(title: ReactNode) {
    const { setPageTitle } = useBPageTitle();
    const isStringTitle = typeof title === "string";
    useEffect(() => {
      setPageTitle(isStringTitle ? title : "");
      return () => setPageTitle("");
    }, [title, isStringTitle, setPageTitle]);
  },
};

// ---------------------------------------------------------------- app-e
type EValue = { pageTitle: string; setPageTitle: (title: string) => void };
const EContext = createContext<EValue | null>(null);
function useEPageTitle() {
  const value = use(EContext);
  if (!value) {
    throw new Error("usePageTitle must be used within PageTitleProvider");
  }
  return value;
}

export const appE = {
  PageTitleProvider({ children }: { children: ReactNode }) {
    const [pageTitle, setPageTitle] = useState("");
    return <EContext value={{ pageTitle, setPageTitle }}>{children}</EContext>;
  },
  usePageTitle: useEPageTitle,
  /** The effect in the app's page container. */
  usePublish(title: string | undefined) {
    const { setPageTitle } = useEPageTitle();
    useEffect(() => {
      setPageTitle(title ?? "");
      return () => setPageTitle("");
    }, [title, setPageTitle]);
  },
};
