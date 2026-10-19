import { createContext, use, useEffect, useState, type ReactNode } from "react";

export type PageTitleValue = {
  pageTitle: string;
  setPageTitle: (title: string) => void;
  /** Element a mobile top bar registers (as a ref) so pages can portal actions into it. */
  mobileActionsSlot: HTMLElement | null;
  setMobileActionsSlot: (slot: HTMLElement | null) => void;
};

export type DocumentTitleOptions = {
  /** Appended after the page title, for example the app name. */
  suffix?: string;
  /** Between page title and suffix. Default `" · "`. */
  separator?: string;
  /** Title while no page title is set. Default: `document.title` when the provider mounted. */
  fallback?: string;
};

export type PageTitleContextOptions = {
  /**
   * `usePageTitle()` outside the provider throws this message. When unset it
   * returns an empty title and no-op setters instead.
   */
  missingProviderMessage?: string;
  /**
   * Also write `document.title` as `pageTitle + separator + suffix`, or
   * `fallback` while the page title is empty. Off by default: the provider
   * does not touch `document.title`. The mount-time title comes back on unmount.
   */
  documentTitle?: DocumentTitleOptions;
};

export type PageTitleContextKit = {
  PageTitleProvider: (props: { children: ReactNode }) => ReactNode;
  usePageTitle: () => PageTitleValue;
  /** Publishes `title` while the caller is mounted; non-string titles publish `""`. Clears on unmount. */
  usePageTitleSync: (title: ReactNode) => void;
};

const noop = () => {};

function formatDocumentTitle(pageTitle: string, suffix: string | undefined, separator: string): string {
  return suffix ? `${pageTitle}${separator}${suffix}` : pageTitle;
}

/** One page title context per app: the shell reads `pageTitle`, pages publish theirs. */
export function createPageTitleContext(options: PageTitleContextOptions = {}): PageTitleContextKit {
  const { missingProviderMessage, documentTitle } = options;
  const Context = createContext<PageTitleValue | null>(null);
  const fallbackValue: PageTitleValue = {
    pageTitle: "",
    setPageTitle: noop,
    mobileActionsSlot: null,
    setMobileActionsSlot: noop,
  };

  function useDocumentTitle(pageTitle: string): void {
    const [mountTitle] = useState(() => (documentTitle && typeof document !== "undefined" ? document.title : ""));
    useEffect(() => {
      if (!documentTitle) return;
      const { suffix, separator = " · ", fallback = mountTitle } = documentTitle;
      document.title = pageTitle ? formatDocumentTitle(pageTitle, suffix, separator) : fallback;
    }, [pageTitle, mountTitle]);
    useEffect(() => {
      if (!documentTitle) return;
      return () => {
        document.title = mountTitle;
      };
    }, [mountTitle]);
  }

  function PageTitleProvider({ children }: { children: ReactNode }) {
    const [pageTitle, setPageTitle] = useState("");
    const [mobileActionsSlot, setMobileActionsSlot] = useState<HTMLElement | null>(null);
    useDocumentTitle(pageTitle);
    return (
      <Context value={{ pageTitle, setPageTitle, mobileActionsSlot, setMobileActionsSlot }}>{children}</Context>
    );
  }

  function usePageTitle(): PageTitleValue {
    const value = use(Context);
    if (value !== null) return value;
    if (missingProviderMessage !== undefined) throw new Error(missingProviderMessage);
    return fallbackValue;
  }

  function usePageTitleSync(title: ReactNode): void {
    const { setPageTitle } = usePageTitle();
    const isStringTitle = typeof title === "string";
    useEffect(() => {
      setPageTitle(isStringTitle ? title : "");
      return () => setPageTitle("");
    }, [title, isStringTitle, setPageTitle]);
  }

  return { PageTitleProvider, usePageTitle, usePageTitleSync };
}
