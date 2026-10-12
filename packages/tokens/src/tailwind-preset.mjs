/**
 * @vvedantb/tokens/tailwind-preset: theme blocks shared by the apps that load
 * a JS tailwind.config through `@config` (Tailwind v4 compat).
 *
 *   import { tokensPreset } from "@vvedantb/tokens/tailwind-preset";
 *   export default { presets: [tokensPreset()], theme: { extend: { ... } } };
 *
 * `color` maps a CSS variable name to a colour value. The default is
 * `var(--name)`; pass a wrapper (e.g. color-mix with `<alpha-value>`) to
 * keep an app's opacity-modifier behaviour. App-specific colours, fonts,
 * plugins and content globs stay in the app config.
 *
 * Do not also import css/animations.css: these keyframes and animations are
 * its config-side counterpart.
 */

export const cssVar = (name) => `var(--${name})`;

export function tokensPreset({ color = cssVar } = {}) {
  const v = color;
  return {
    darkMode: "class",
    theme: {
      extend: {
        colors: {
          border: v("border"),
          backdrop: v("backdrop"),
          background: v("background"),
          foreground: v("foreground"),
          danger: {
            DEFAULT: v("danger"),
            foreground: v("danger-foreground"),
            ring: v("danger-ring"),
            border: v("danger-border"),
          },
          default: {
            DEFAULT: v("default"),
            foreground: v("default-foreground"),
          },
          field: {
            background: v("field-background"),
            border: v("field-border"),
            foreground: v("field-foreground"),
            placeholder: v("field-placeholder"),
          },
          focus: {
            DEFAULT: v("focus"),
            ring: v("focus-ring"),
            border: v("focus-border"),
          },
          overlay: {
            DEFAULT: v("overlay"),
            foreground: v("overlay-foreground"),
          },
          scrollbar: v("scrollbar"),
          segment: {
            DEFAULT: v("segment"),
            foreground: v("segment-foreground"),
          },
          separator: v("separator"),
          success: {
            DEFAULT: v("success"),
            foreground: v("success-foreground"),
          },
          surface: {
            DEFAULT: v("surface"),
            foreground: v("surface-foreground"),
            secondary: v("surface-secondary"),
            "secondary-foreground": v("surface-secondary-foreground"),
            tertiary: v("surface-tertiary"),
            "tertiary-foreground": v("surface-tertiary-foreground"),
            card: v("surface-card"),
          },
          warning: {
            DEFAULT: v("warning"),
            foreground: v("warning-foreground"),
          },
          // Legacy shadcn names mapped to the same tokens.
          primary: {
            DEFAULT: v("accent"),
            foreground: v("accent-foreground"),
          },
          destructive: {
            DEFAULT: v("danger"),
            foreground: v("danger-foreground"),
          },
          secondary: {
            DEFAULT: v("default"),
            foreground: v("default-foreground"),
          },
          input: v("border"),
          popover: {
            DEFAULT: v("overlay"),
            foreground: v("overlay-foreground"),
          },
          card: {
            DEFAULT: v("surface-card"),
            foreground: v("surface-foreground"),
          },
        },
        borderRadius: {
          lg: "var(--radius)",
          field: "var(--field-radius)",
          md: "calc(var(--radius) - 2px)",
          sm: "calc(var(--radius) - 4px)",
        },
        boxShadow: {
          soft: "0 1px 2px rgba(16, 24, 40, 0.06), 0 10px 28px rgba(16, 24, 40, 0.06)",
          panel:
            "0 1px 2px rgba(16, 24, 40, 0.05), 0 16px 44px rgba(16, 24, 40, 0.1)",
          insetSoft:
            "inset 0 1px 0 rgba(255, 255, 255, 0.72), inset 0 -1px 0 rgba(16, 24, 40, 0.04)",
        },
        transitionTimingFunction: {
          smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
        },
        screens: {
          xs: "475px",
          sm: "640px",
          md: "768px",
          lg: "1024px",
          xl: "1280px",
          "2xl": "1536px",
        },
        keyframes: {
          aurora: {
            "0%": {
              backgroundPosition: "0% 50%",
              transform: "rotate(-5deg) scale(0.9)",
            },
            "25%": {
              backgroundPosition: "50% 100%",
              transform: "rotate(5deg) scale(1.1)",
            },
            "50%": {
              backgroundPosition: "100% 50%",
              transform: "rotate(-3deg) scale(0.95)",
            },
            "75%": {
              backgroundPosition: "50% 0%",
              transform: "rotate(3deg) scale(1.05)",
            },
            "100%": {
              backgroundPosition: "0% 50%",
              transform: "rotate(-5deg) scale(0.9)",
            },
          },
          "fade-in-up": {
            "0%": { opacity: "0", transform: "translateY(10px)" },
            "100%": { opacity: "1", transform: "translateY(0)" },
          },
          indeterminate: {
            "0%": { transform: "translateX(-100%)" },
            "100%": { transform: "translateX(400%)" },
          },
          // Used by @vvedantb/ui accordion; each app sets its own
          // `animation["accordion-down" | "accordion-up"]` timing.
          "accordion-down": {
            from: { height: "0" },
            to: { height: "var(--radix-accordion-content-height)" },
          },
          "accordion-up": {
            from: { height: "var(--radix-accordion-content-height)" },
            to: { height: "0" },
          },
        },
        animation: {
          aurora: "aurora 8s ease-in-out infinite alternate",
          "fade-in-up": "fade-in-up 0.4s ease-out forwards",
          indeterminate: "indeterminate 1.5s ease-in-out infinite",
        },
      },
    },
  };
}

export default tokensPreset();
