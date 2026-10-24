import * as React from "react";
import { Avatar as AvatarPrimitive } from "radix-ui";
import { useCn } from "./ui-config";

const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(({ className, ...props }, ref) => {
  const merge = useCn();
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={merge(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-border bg-surface-secondary",
        className,
      )}
      {...props}
    />
  );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => {
  const merge = useCn();
  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={merge("aspect-square h-full w-full", className)}
      {...props}
    />
  );
});
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => {
  const merge = useCn();
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={merge(
        "flex h-full w-full items-center justify-center rounded-full bg-secondary text-secondary-foreground",
        className,
      )}
      {...props}
    />
  );
});
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export { Avatar, AvatarImage, AvatarFallback };
