import { useState } from "react";
import { useUser, useClerk } from "../stubs";
import { useNavigate } from "../stubs";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
  SidebarAccountMenu,
  SignOutDialog,
  useRequestConfirm,
} from "../../../../../src/index";
import {
  IconSearch,
  IconSettings,
  IconUserCog,
  IconLogout,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";
import { useTheme } from "../stubs";
import { ConfirmSkipHint, skipConfirmTitle } from "../../../../../src/index";

interface SidebarUserMenuProps {
  onOpenSearch: () => void;
}

export function SidebarUserMenu({ onOpenSearch }: SidebarUserMenuProps) {
  const navigate = useNavigate();
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();
  const { theme, toggleTheme } = useTheme();
  const { request } = useRequestConfirm();
  const [isSignOutOpen, setIsSignOutOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);

  if (!user) return null;

  const email = user.primaryEmailAddress?.emailAddress;
  const name = user.fullName ?? email ?? "Account";
  const isDark = theme === "dark";

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
    } catch {
      setIsSigningOut(false);
    }
  };

  return (
    <>
      <SidebarAccountMenu name={name} imageUrl={user.imageUrl}>
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
        <DropdownMenuItem onSelect={() => toggleTheme()}>
          {isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
          {isDark ? "Light mode" : "Dark mode"}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() =>
            request(
              () => setIsSignOutOpen(true),
              () => void handleSignOut(),
            )
          }
          className="text-danger focus:text-danger data-[highlighted]:text-danger"
          title={skipConfirmTitle("Sign out")}
        >
          <IconLogout size={16} />
          Sign out
          <ConfirmSkipHint />
        </DropdownMenuItem>
      </SidebarAccountMenu>

      <SignOutDialog
        open={isSignOutOpen}
        onOpenChange={setIsSignOutOpen}
        pending={isSigningOut}
        onConfirm={handleSignOut}
        description="You'll need to sign back in to continue."
      />
    </>
  );
}
