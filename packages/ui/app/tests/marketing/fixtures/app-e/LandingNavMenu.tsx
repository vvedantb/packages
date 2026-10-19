import { IconMenu2 } from "@tabler/icons-react";
import { AppIcon } from "../stubs";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../../../../src/index";
import { LANDING_NAV_LINKS, APP_E_GITHUB_URL } from "./landingContent";

const MENU_ITEM_CLASS = "max-sm:py-2.5";

export function LandingNavMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Open menu"
          className="md:hidden"
        >
          <IconMenu2 size={18} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[70dvh] w-56 max-w-[calc(100vw-2rem)] overflow-y-auto"
      >
        {LANDING_NAV_LINKS.map((link) => (
          <DropdownMenuItem key={link.href} asChild className={MENU_ITEM_CLASS}>
            <a href={link.href}>{link.label}</a>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className={MENU_ITEM_CLASS}>
          <a href={APP_E_GITHUB_URL} target="_blank" rel="noreferrer">
            <AppIcon name="GitHub" size={16} framed={false} />
            GitHub
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
