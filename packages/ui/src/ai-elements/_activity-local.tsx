"use client";

// Temporary local copies of eva's `FileChip` and simple `CodeBlock` (a frame
// with a copy button around caller markup) for the activity timeline. The chat
// core family moves both into vvedantb; once it lands, the activity files
// import those and this file goes. Not exported from the package root.

import type { HTMLAttributes } from "react";
import { createContext, useContext, useState } from "react";
import { IconCheck, IconCopy, IconFile } from "@tabler/icons-react";

import { Button } from "../ui/button";
import { useCn } from "../ui/ui-config";
import { SURFACE_RADIUS_CLASS } from "../utils/surface-radius";

function FileChipLabel({ name, className }: { name: string; className?: string }) {
  const merge = useCn();
  return (
    <span
      className={merge(
        "inline-flex w-fit max-w-full items-center gap-1.5 rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-xs text-foreground",
        className,
      )}
    >
      <IconFile className="size-3 shrink-0" />
      <span className="truncate">{name}</span>
    </span>
  );
}

/**
 * A file name in an activity line or step body. Opens the file viewer when the
 * full path and an `onOpenFile` handler are both known; plain text otherwise.
 */
export function FileChip({
  name,
  path,
  onOpenFile,
}: {
  name: string;
  path?: string;
  onOpenFile?: (path: string) => void;
}) {
  if (!path || !onOpenFile) return <FileChipLabel name={name} />;
  return (
    <button
      type="button"
      title={path}
      onClick={(event) => {
        event.stopPropagation();
        onOpenFile(path);
      }}
      className="inline-flex min-w-0 max-w-full cursor-pointer"
    >
      <FileChipLabel name={name} className="transition-colors hover:bg-muted" />
    </button>
  );
}

const CodeFrameContext = createContext<string | null>(null);

/** A copyable code frame: `children` render inside, the copy button copies `code`. */
export function CodeFrame({
  code,
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement> & { code: string }) {
  const merge = useCn();
  return (
    <CodeFrameContext.Provider value={code}>
      <div className={merge("relative bg-secondary", SURFACE_RADIUS_CLASS, className)} {...props}>
        {children}
      </div>
    </CodeFrameContext.Provider>
  );
}

export function CodeFrameCopyButton({ className, ...props }: HTMLAttributes<HTMLButtonElement>) {
  const code = useContext(CodeFrameContext);
  const merge = useCn();
  const [copied, setCopied] = useState(false);
  if (code === null) throw new Error("CodeFrameCopyButton must be used within CodeFrame");

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button
      className={merge(
        "absolute right-2 top-2 size-7 p-0 text-muted-foreground hover:text-foreground after:absolute after:inset-[-6px]",
        className,
      )}
      size="sm"
      variant="ghost"
      onClick={handleCopy}
      {...props}
    >
      {copied ? <IconCheck className="size-3.5" /> : <IconCopy className="size-3.5" />}
      <span className="sr-only">Copy code</span>
    </Button>
  );
}
