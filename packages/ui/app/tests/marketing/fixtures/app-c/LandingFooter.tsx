import { Separator, Button } from "../../../../../src/index";
import {
  IconBrandTwitter,
  IconBrandLinkedin,
  IconBrandGithub,
} from "@tabler/icons-react";
import { dayjs } from "../stubs";

export function LandingFooter() {
  return (
    <footer className="bg-background text-foreground py-8 md:py-16 max-w-5xl mx-auto">
      <div className="relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8 lg:gap-12">
            <div className="flex-1 lg:flex-none">
              <div className="text-lg font-michroma font-normal tracking-wider mb-3 md:mb-4">
                APP-C
              </div>
              <p className="text-sm text-muted-foreground mb-4 md:mb-6 max-w-sm">
                The ultimate productivity suite — AI notes, tasks, habits, and
                focus tools in one minimal workspace.
              </p>
              <div className="flex gap-3 md:gap-4">
                <a
                  href="https://twitter.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 md:w-8 md:h-8 bg-default rounded-lg flex items-center justify-center hover:bg-surface-tertiary transition-[background-color]"
                  >
                    <IconBrandTwitter className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </a>
                <a
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 md:w-8 md:h-8 bg-default rounded-lg flex items-center justify-center hover:bg-surface-tertiary transition-[background-color]"
                  >
                    <IconBrandLinkedin className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </a>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-9 h-9 md:w-8 md:h-8 bg-default rounded-lg flex items-center justify-center hover:bg-surface-tertiary transition-[background-color]"
                  >
                    <IconBrandGithub className="w-4 h-4 text-muted-foreground" />
                  </Button>
                </a>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-8 md:gap-12 lg:gap-16 xl:gap-20">
              <div className="flex-1 sm:flex-none">
                <h4 className="font-thin tracking-wide mb-3 md:mb-4 text-muted-foreground">
                  Navigation
                </h4>
                <div className="flex flex-col gap-2 md:gap-3 text-sm text-muted-foreground font-thin tracking-wide">
                  <a
                    href="#features"
                    className="hover:text-foreground transition-[color]"
                  >
                    Features
                  </a>
                  <a
                    href="#benefits"
                    className="hover:text-foreground transition-[color]"
                  >
                    Benefits
                  </a>
                  <a
                    href="#testimonials"
                    className="hover:text-foreground transition-[color]"
                  >
                    Testimonials
                  </a>
                </div>
              </div>

              <div className="flex-1 sm:flex-none">
                <h4 className="font-thin tracking-wide mb-3 md:mb-4 text-muted-foreground">
                  Apps
                </h4>
                <div className="flex flex-col gap-2 md:gap-3 text-sm text-muted-foreground font-thin tracking-wide">
                  <a
                    href="https://app-b.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-[color] flex flex-row items-center gap-2"
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
                    href="https://app-d.app"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-foreground transition-[color] flex flex-row items-center gap-2"
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
                    href="#home"
                    className="hover:text-foreground transition-[color] flex flex-row items-center gap-2"
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
                Copyright &copy; {dayjs().year()} App C
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
                className="underline text-xs md:text-sm text-muted-foreground hover:text-foreground transition-[color]"
              >
                Privacy Policy
              </a>
              <a
                href="https://example.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="underline text-xs md:text-sm text-muted-foreground hover:text-foreground transition-[color]"
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
