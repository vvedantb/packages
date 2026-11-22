import type { ReactNode } from "react";
import * as expoRouterHtml from "expo-router/html";
import { tokens } from "./tokens";

const { ScrollViewStyleReset } = expoRouterHtml;

// From Expo SDK 58 the static render no longer writes the page's CSS links and
// script tags into the HTML afterwards: it hands them to the root as nodes, and
// a root that leaves them out gives a blank page. Earlier SDKs have no such
// hook and still write the tags themselves.
type ServerDocument = ReturnType<NonNullable<typeof expoRouterHtml.useServerDocumentContext>>;
const emptyDocument: ServerDocument = {};
const useServerDocument = expoRouterHtml.useServerDocumentContext ?? (() => emptyDocument);

/** `"native"` stops pinch-zoom so the page acts like the app; `"accessible"` allows it (WCAG 1.4.4). Both cover the notch. */
export type ExpoWebRootViewport = "native" | "accessible";

export const EXPO_WEB_VIEWPORT: Record<ExpoWebRootViewport, string> = {
  native: "width=device-width,initial-scale=1,minimum-scale=1,maximum-scale=1.00001,viewport-fit=cover",
  accessible: "width=device-width, initial-scale=1.0, viewport-fit=cover",
};

export type ExpoWebRootProps = {
  children: ReactNode;
  /** `<html lang>`. Default `"en"`. */
  lang?: string;
  /** Default `"native"`. */
  viewport?: ExpoWebRootViewport;
  /** `ScrollViewStyleReset`: no body scroll, so `ScrollView` works as on native. Default `true`. */
  scrollReset?: boolean;
  /** Body fill in light. Default `tokens.color.background.light`. */
  lightBackground?: string;
  /** Body fill in dark. Default `tokens.color.background.dark`. */
  darkBackground?: string;
  /** More `<head>` nodes, after the defaults. */
  head?: ReactNode;
};

/**
 * The body fill as raw CSS, so the background does not flash in dark mode
 * before the app paints. Dark follows the system, and the NativeWind `dark`
 * class on `<html>` when the app sets the scheme (`darkMode: "class"`).
 */
export function expoWebBackgroundCss(light: string, dark: string): string {
  return `
body {
  background-color: ${light};
}
@media (prefers-color-scheme: dark) {
  body {
    background-color: ${dark};
  }
}
html.dark body {
  background-color: ${dark};
}`;
}

/**
 * The root HTML for Expo web static rendering. Use it as the whole of
 * `app/+html.tsx`:
 *
 *   export default function Root({ children }: { children: React.ReactNode }) {
 *     return <ExpoWebRoot>{children}</ExpoWebRoot>;
 *   }
 *
 * Runs in Node during the static render, with no DOM.
 */
export function ExpoWebRoot({
  children,
  lang = "en",
  viewport = "native",
  scrollReset = true,
  lightBackground = tokens.color.background.light,
  darkBackground = tokens.color.background.dark,
  head,
}: ExpoWebRootProps) {
  const { htmlAttributes, headNodes, bodyAttributes, bodyNodes } = useServerDocument();
  return (
    <html lang={lang} {...htmlAttributes}>
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content={EXPO_WEB_VIEWPORT[viewport]} />
        {scrollReset ? <ScrollViewStyleReset /> : null}
        <style dangerouslySetInnerHTML={{ __html: expoWebBackgroundCss(lightBackground, darkBackground) }} />
        {head}
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
      </body>
    </html>
  );
}
