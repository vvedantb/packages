import * as React from "react";
import { View } from "react-native";
import { Text, TextClassContext } from "./text";
import { cn } from "../cn";
import { typeStyle } from "../controlStyles";

type CardViewProps = React.ComponentPropsWithoutRef<typeof View> & {
  className?: string;
};

const Card = React.forwardRef<React.ElementRef<typeof View>, CardViewProps>(
  ({ className, ...props }, ref) => {
    return (
      <TextClassContext.Provider value="text-card-foreground">
        <View
          ref={ref}
          className={cn(
            "flex flex-col gap-6 rounded-lg bg-surface py-6",
            className,
          )}
          {...props}
        />
      </TextClassContext.Provider>
    );
  },
);

const CardHeader = React.forwardRef<
  React.ElementRef<typeof View>,
  CardViewProps
>(({ className, ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={cn("flex flex-col gap-1.5 px-6", className)}
      {...props}
    />
  );
});

const CardTitle = React.forwardRef<
  React.ElementRef<typeof Text>,
  React.ComponentPropsWithoutRef<typeof Text> & { className?: string }
>(({ className, style, ...props }, ref) => {
  // The web `font-semibold`: the semibold face, with its weight as a style.
  return (
    <Text
      ref={ref}
      role="heading"
      aria-level={3}
      className={cn("font-instrument-sans-semibold leading-none", className)}
      style={[typeStyle("semibold"), style]}
      {...props}
    />
  );
});

const CardDescription = React.forwardRef<
  React.ElementRef<typeof Text>,
  React.ComponentPropsWithoutRef<typeof Text> & { className?: string }
>(({ className, ...props }, ref) => {
  return (
    <Text
      ref={ref}
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
});

const CardContent = React.forwardRef<
  React.ElementRef<typeof View>,
  CardViewProps
>(({ className, ...props }, ref) => {
  return <View ref={ref} className={cn("px-6", className)} {...props} />;
});

const CardFooter = React.forwardRef<
  React.ElementRef<typeof View>,
  CardViewProps
>(({ className, ...props }, ref) => {
  return (
    <View
      ref={ref}
      className={cn("flex flex-row items-center px-6", className)}
      {...props}
    />
  );
});

Card.displayName = "Card";
CardHeader.displayName = "CardHeader";
CardTitle.displayName = "CardTitle";
CardDescription.displayName = "CardDescription";
CardContent.displayName = "CardContent";
CardFooter.displayName = "CardFooter";

export {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
};
