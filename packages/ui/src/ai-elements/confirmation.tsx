"use client";

import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import { useCn } from "../ui/ui-config";

export type ConfirmationState = "pending" | "accepted" | "rejected";

interface ConfirmationContextValue {
  state: ConfirmationState;
}

const ConfirmationContext = createContext<ConfirmationContextValue | null>(
  null,
);

const useConfirmation = () => {
  const context = useContext(ConfirmationContext);
  if (!context) {
    throw new Error("Confirmation components must be used within Confirmation");
  }
  return context;
};

export type ConfirmationProps = ComponentProps<typeof Alert> & {
  state: ConfirmationState;
};

/** An approve / reject prompt (for example a tool call) and its outcome. */
export const Confirmation = ({
  className,
  state,
  ...props
}: ConfirmationProps) => {
  const merge = useCn();
  return (
    <ConfirmationContext.Provider value={{ state }}>
      <Alert className={merge("flex flex-col gap-2", className)} {...props} />
    </ConfirmationContext.Provider>
  );
};

export type ConfirmationTitleProps = ComponentProps<typeof AlertDescription>;

export const ConfirmationTitle = ({
  className,
  ...props
}: ConfirmationTitleProps) => {
  const merge = useCn();
  return <AlertDescription className={merge("inline", className)} {...props} />;
};

/** Children shown only while the confirmation is pending. */
export const ConfirmationRequest = ({ children }: { children?: ReactNode }) => {
  const { state } = useConfirmation();
  if (state !== "pending") return null;
  return children;
};

/** Children shown only once accepted. */
export const ConfirmationAccepted = ({
  children,
}: {
  children?: ReactNode;
}) => {
  const { state } = useConfirmation();
  if (state !== "accepted") return null;
  return children;
};

/** Children shown only once rejected. */
export const ConfirmationRejected = ({
  children,
}: {
  children?: ReactNode;
}) => {
  const { state } = useConfirmation();
  if (state !== "rejected") return null;
  return children;
};

export type ConfirmationActionsProps = ComponentProps<"div">;

/** Action row, rendered only while pending. */
export const ConfirmationActions = ({
  className,
  ...props
}: ConfirmationActionsProps) => {
  const { state } = useConfirmation();
  const merge = useCn();
  if (state !== "pending") return null;
  return (
    <div
      className={merge("flex items-center justify-end gap-2 self-end", className)}
      {...props}
    />
  );
};

export type ConfirmationActionProps = ComponentProps<typeof Button>;

export const ConfirmationAction = (props: ConfirmationActionProps) => (
  <Button className="h-8 px-3 text-sm" type="button" {...props} />
);
