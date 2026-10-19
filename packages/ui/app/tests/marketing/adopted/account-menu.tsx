// SidebarUserMenu.tsx of app-a and app-c after moving the theme item, the
// sign-out item and its confirm dialog into `SidebarAccountMenu`.
import { IconSearch, IconSettings, IconUserCog } from "@tabler/icons-react";
import { DropdownMenuItem, DropdownMenuSeparator, SidebarAccountMenu } from "../../../../src/index";
import { useClerk, useNavigate, useTheme, useThemeContext, useUser } from "../fixtures/stubs";

// --- app-a: components/sidebar/SidebarUserMenu.tsx ---
export function AppASidebarUserMenu() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { isDark, toggleTheme } = useThemeContext();

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress;
  const name = user.fullName ?? email ?? "Account";

  return (
    <SidebarAccountMenu
      name={name}
      imageUrl={user.imageUrl}
      themeToggle={{ isDark, onToggle: toggleTheme }}
      signOut={{
        onSignOut: () => signOut(),
        description: "You'll need to sign back in to access your memories.",
      }}
    >
      <DropdownMenuItem onSelect={() => openUserProfile()}>
        <IconUserCog />
        Manage account
      </DropdownMenuItem>
    </SidebarAccountMenu>
  );
}

// --- app-c: lib/components/SidebarUserMenu.tsx ---
export function AppCSidebarUserMenu({ onOpenSearch }: { onOpenSearch: () => void }) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress;
  const name = user.fullName ?? email ?? "Account";

  return (
    <SidebarAccountMenu
      name={name}
      imageUrl={user.imageUrl}
      itemIconSize={16}
      themeToggle={{ isDark: theme === "dark", onToggle: toggleTheme }}
      signOut={{
        onSignOut: () => signOut(),
        description: "You'll need to sign back in to continue.",
      }}
    >
      <DropdownMenuItem onSelect={() => onOpenSearch()}>
        <IconSearch size={16} />
        Search
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={() => {
          void navigate({ to: "/settings/general" });
        }}
      >
        <IconSettings size={16} />
        Settings
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem onSelect={() => void openUserProfile()}>
        <IconUserCog size={16} />
        Manage account
      </DropdownMenuItem>
    </SidebarAccountMenu>
  );
}
