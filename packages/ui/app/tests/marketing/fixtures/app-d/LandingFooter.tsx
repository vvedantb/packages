import { Separator, Button } from "../../../../../src/index";
import {
  IconBrandTwitter,
  IconBrandLinkedin,
  IconBrandGithub,
} from "@tabler/icons-react";
import dayjs from "dayjs";

const PLAY_STORE_URL =
  "https://play.google.com/store/apps/details?id=com.example.app-d";

export function LandingFooter() {
  return (
    <footer className="mx-auto max-w-5xl bg-background pt-8 text-foreground pb-[max(2rem,env(safe-area-inset-bottom))] md:pt-16 md:pb-16">
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
            <div className="flex-1 lg:flex-none">
              <div className="text-lg font-michroma font-normal tracking-wider mb-3 md:mb-4">
                APP-D
              </div>
              <p className="text-sm text-muted-foreground mb-4 md:mb-6 max-w-sm">
                Track vitals, manage medications, and stay on top of
                appointments — all from one health app.
              </p>
              <div className="flex gap-3 md:gap-4">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="App D on Twitter"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-sm:hit-target h-9 w-9 rounded-lg bg-default hover:bg-surface-tertiary md:h-8 md:w-8"
                  >
                    <IconBrandTwitter className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="App D on LinkedIn"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-sm:hit-target h-9 w-9 rounded-lg bg-default hover:bg-surface-tertiary md:h-8 md:w-8"
                  >
                    <IconBrandLinkedin className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="App D on GitHub"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="max-sm:hit-target h-9 w-9 rounded-lg bg-default hover:bg-surface-tertiary md:h-8 md:w-8"
                  >
                    <IconBrandGithub className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 md:gap-12 lg:gap-16 xl:gap-20">
              <div className="flex-1 sm:flex-none">
                <h4 className="font-thin tracking-wide mb-3 md:mb-4 text-muted-foreground">
                  Navigation
                </h4>
                <div className="flex flex-col gap-2 text-sm font-thin tracking-wide text-muted-foreground md:gap-3">
                  <a
                    href="#features"
                    className="max-sm:hit-target max-sm:py-1 hover:text-foreground"
                  >
                    Features
                  </a>
                  <a
                    href="#why"
                    className="max-sm:hit-target max-sm:py-1 hover:text-foreground"
                  >
                    Why App D
                  </a>
                  <a
                    href="#more"
                    className="max-sm:hit-target max-sm:py-1 hover:text-foreground"
                  >
                    More features
                  </a>
                  <a
                    href={PLAY_STORE_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-sm:hit-target max-sm:py-1 hover:text-foreground"
                  >
                    Get the app
                  </a>
                </div>
              </div>

              <div className="flex-1 sm:flex-none">
                <h4 className="font-thin tracking-wide mb-3 md:mb-4 text-muted-foreground">
                  Apps
                </h4>
                <div className="flex flex-col gap-2 text-sm font-thin tracking-wide text-muted-foreground md:gap-3">
                  <a
                    href="https://app-b.example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-sm:hit-target flex flex-row items-center gap-2 max-sm:py-1 hover:text-foreground"
                  >
                    <img
                      src="https://example.com/app-b.png"
                      alt="App B"
                      width={20}
                      height={20}
                      className="rounded-full object-cover w-5 h-5 md:w-5 md:h-5"
                    />
                    App B
                  </a>
                  <a
                    href="https://app-d.example.com"
                    className="max-sm:hit-target flex flex-row items-center gap-2 max-sm:py-1 hover:text-foreground"
                  >
                    <img
                      src="https://example.com/app-d.png"
                      alt="App D"
                      width={20}
                      height={20}
                      className="rounded-full object-cover w-5 h-5 md:w-5 md:h-5"
                    />
                    App D
                  </a>
                  <a
                    href="https://app-c.example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="max-sm:hit-target flex flex-row items-center gap-2 max-sm:py-1 hover:text-foreground"
                  >
                    <img
                      src="https://example.com/app-c.png"
                      alt="App C"
                      width={20}
                      height={20}
                      className="rounded-full object-cover w-5 h-5 md:w-5 md:h-5"
                    />
                    App C
                  </a>
                </div>
              </div>
            </div>
          </div>

          <Separator className="my-6 md:my-8 bg-separator" />

          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-0">
            <div className="flex flex-col gap-1 text-center sm:text-left">
              <p className="text-xs md:text-sm text-muted-foreground">
                Copyright &copy; {dayjs().year()} App D
              </p>
              <p className="text-xs md:text-sm text-muted-foreground/80">
                All rights reserved.
              </p>
            </div>

            <div className="flex flex-col gap-1 text-center sm:text-right">
              <a
                href="https://example.com/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="max-sm:hit-target text-xs underline text-muted-foreground hover:text-foreground md:text-sm"
              >
                Privacy Policy
              </a>
              <a
                href="https://example.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="max-sm:hit-target text-xs underline text-muted-foreground hover:text-foreground md:text-sm"
              >
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
