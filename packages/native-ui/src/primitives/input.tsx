import * as React from "react";
import { Platform, TextInput } from "react-native";
import { cn } from "../cn";
import { palette } from "../palette";
import { useScheme } from "../useScheme";

type InputProps = React.ComponentPropsWithoutRef<typeof TextInput> & {
  className?: string;
};

const Input = React.forwardRef<React.ElementRef<typeof TextInput>, InputProps>(
  ({ className, placeholderTextColor, ...props }, ref) => {
    const scheme = useScheme();
    return (
      <TextInput
        ref={ref}
        // A prop, not a `placeholder:` class: on native NativeWind turns that
        // class into `placeholderTextColor`, which beats the prop. The old
        // `placeholder:text-muted-foreground/50` was the light grey at half
        // opacity in apps that nest `dark` under `muted-foreground`.
        placeholderTextColor={placeholderTextColor ?? palette.fieldPlaceholder[scheme]}
        className={cn(
          "flex w-full flex-row items-center rounded-lg border-0 bg-secondary px-3 py-2 text-base text-foreground",
          props.editable === false &&
            cn(
              "opacity-50",
              Platform.select({
                web: "cursor-not-allowed pointer-events-none",
              }),
            ),
          Platform.select({
            web: "outline-none transition-[color,box-shadow] md:text-sm",
          }),
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = "Input";

export { Input };
