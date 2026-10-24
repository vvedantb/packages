"use client";
import type { ChatStatus, FileUIPart, SourceDocumentUIPart } from "ai";
import type {
  ChangeEvent,
  ChangeEventHandler,
  ClipboardEventHandler,
  ComponentProps,
  FormEvent,
  FormEventHandler,
  HTMLAttributes,
  KeyboardEventHandler,
  MouseEvent,
  PropsWithChildren,
  ReactNode,
  RefObject,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import {
  DropdownMenu as Dropdown,
  DropdownMenuTrigger as DropdownTrigger,
  DropdownMenuContent as DropdownMenu,
  DropdownMenuItem as DropdownItem,
} from "../ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "../ui/hover-card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "../ui/input-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/radix-select";
import { CrossfadeIconSlot } from "../ui/crossfade-icon";
import { Spinner } from "../ui/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { useCn, useUiConfig } from "../ui/ui-config";
import { segmentExpandedStateClass } from "../ui/surface-classes";
import {
  IconCornerDownLeft,
  IconPhoto,
  IconPlus,
  IconSquare,
  IconX,
} from "@tabler/icons-react";
import { nanoid } from "nanoid";
import {
  Children,
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
/** `existing` with `file` in its place when the ids match (old blob URL revoked). */
const replaceFile = (
  existing: FileUIPart & { id: string },
  id: string,
  file: File,
): FileUIPart & { id: string } => {
  if (existing.id !== id) return existing;
  if (existing.url) URL.revokeObjectURL(existing.url);
  return {
    ...existing,
    filename: file.name,
    mediaType: file.type,
    url: URL.createObjectURL(file),
  };
};
const convertBlobUrlToDataUrl = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
};
/**
 * `UiConfig.PromptInput`. `classes` replace built-in classes: `group` (the
 * input group, default `overflow-hidden`), `groupIdle` / `groupDragOver`
 * (added while no drag / an accepted drag is over the form), `groupDefault`
 * (added when no `containerClassName` is given), `textarea`, `footer`,
 * `submit` and `tabItem`. `submitIcons` replace the submit
 * button's icon per status; `submitCrossfade` cross-fades between them.
 * `menuTriggerAsChild` makes `PromptInputActionMenuTrigger` the trigger
 * itself rather than a button inside the menu's trigger button.
 */
export interface PromptInputConfig {
  classes?: {
    group?: string;
    groupIdle?: string;
    groupDragOver?: string;
    groupDefault?: string;
    textarea?: string;
    footer?: string;
    submit?: string;
    tabItem?: string;
  };
  submitIcons?: Partial<Record<"send" | "submitted" | "streaming" | "error", ReactNode>>;
  submitCrossfade?: boolean;
  menuTriggerAsChild?: boolean;
}
export interface AttachmentsContext {
  files: (FileUIPart & {
    id: string;
  })[];
  add: (files: File[] | FileList) => void;
  remove: (id: string) => void;
  /** Replace one attachment in place (same id and position). No re-validation. */
  replace: (id: string, file: File) => void;
  clear: () => void;
  openFileDialog: () => void;
  fileInputRef: RefObject<HTMLInputElement | null>;
}
export interface TextInputContext {
  value: string;
  setInput: (v: string) => void;
  clear: () => void;
}
export interface PromptInputControllerProps {
  textInput: TextInputContext;
  attachments: AttachmentsContext;
  __registerFileInput: (
    ref: RefObject<HTMLInputElement | null>,
    open: () => void,
  ) => void;
}
const PromptInputController = createContext<PromptInputControllerProps | null>(
  null,
);
const ProviderAttachmentsContext = createContext<AttachmentsContext | null>(
  null,
);
export const usePromptInputController = () => {
  const ctx = useContext(PromptInputController);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use usePromptInputController().",
    );
  }
  return ctx;
};
/** The provider's controller, or `null` outside `PromptInputProvider`. */
export const useOptionalPromptInputController = () =>
  useContext(PromptInputController);
export const useProviderAttachments = () => {
  const ctx = useContext(ProviderAttachmentsContext);
  if (!ctx) {
    throw new Error(
      "Wrap your component inside <PromptInputProvider> to use useProviderAttachments().",
    );
  }
  return ctx;
};
const useOptionalProviderAttachments = () =>
  useContext(ProviderAttachmentsContext);
export type PromptInputProviderProps = PropsWithChildren<{
  initialInput?: string;
}>;
export const PromptInputProvider = ({
  initialInput: initialTextInput = "",
  children,
}: PromptInputProviderProps) => {
  const [textInput, setTextInput] = useState(initialTextInput);
  const clearInput = () => setTextInput("");
  const [attachmentFiles, setAttachmentFiles] = useState<
    (FileUIPart & {
      id: string;
    })[]
  >([]);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const openRef = useRef<() => void>(() => {});
  const add = (files: File[] | FileList) => {
    const incoming = [...files];
    if (incoming.length === 0) return;
    setAttachmentFiles((prev) => [
      ...prev,
      ...incoming.map((file) => ({
        filename: file.name,
        id: nanoid(),
        mediaType: file.type,
        type: "file" as const,
        url: URL.createObjectURL(file),
      })),
    ]);
  };
  const remove = (id: string) => {
    setAttachmentFiles((prev) => {
      const found = prev.find((f) => f.id === id);
      if (found?.url) URL.revokeObjectURL(found.url);
      return prev.filter((f) => f.id !== id);
    });
  };
  const replace = (id: string, file: File) => {
    setAttachmentFiles((prev) => prev.map((existing) => replaceFile(existing, id, file)));
  };
  const clear = () => {
    setAttachmentFiles((prev) => {
      for (const f of prev) {
        if (f.url) URL.revokeObjectURL(f.url);
      }
      return [];
    });
  };
  const attachmentsRef = useRef(attachmentFiles);
  useEffect(() => {
    attachmentsRef.current = attachmentFiles;
  }, [attachmentFiles]);
  useEffect(
    () => () => {
      for (const f of attachmentsRef.current) {
        if (f.url) URL.revokeObjectURL(f.url);
      }
    },
    [],
  );
  const openFileDialog = () => {
    openRef.current?.();
  };
  const attachments = {
    add,
    clear,
    fileInputRef,
    files: attachmentFiles,
    openFileDialog,
    remove,
    replace,
  };
  const __registerFileInput = (
    ref: RefObject<HTMLInputElement | null>,
    open: () => void,
  ) => {
    fileInputRef.current = ref.current;
    openRef.current = open;
  };
  const controller = {
    __registerFileInput,
    attachments,
    textInput: {
      clear: clearInput,
      setInput: setTextInput,
      value: textInput,
    },
  };
  return (
    <PromptInputController.Provider value={controller}>
      <ProviderAttachmentsContext.Provider value={attachments}>
        {children}
      </ProviderAttachmentsContext.Provider>
    </PromptInputController.Provider>
  );
};
const LocalAttachmentsContext = createContext<AttachmentsContext | null>(null);
export const usePromptInputAttachments = () => {
  const provider = useOptionalProviderAttachments();
  const local = useContext(LocalAttachmentsContext);
  const context = local ?? provider;
  if (!context) {
    throw new Error(
      "usePromptInputAttachments must be used within a PromptInput or PromptInputProvider",
    );
  }
  return context;
};
export interface ReferencedSourcesContext {
  sources: (SourceDocumentUIPart & {
    id: string;
  })[];
  add: (sources: SourceDocumentUIPart[] | SourceDocumentUIPart) => void;
  remove: (id: string) => void;
  clear: () => void;
}
export const LocalReferencedSourcesContext =
  createContext<ReferencedSourcesContext | null>(null);
export const usePromptInputReferencedSources = () => {
  const ctx = useContext(LocalReferencedSourcesContext);
  if (!ctx) {
    throw new Error(
      "usePromptInputReferencedSources must be used within a LocalReferencedSourcesContext.Provider",
    );
  }
  return ctx;
};
export type PromptInputActionAddAttachmentsProps = ComponentProps<
  typeof DropdownItem
> & {
  label?: string;
};
export const PromptInputActionAddAttachments = ({
  label = "Add photos or files",
  ...props
}: PromptInputActionAddAttachmentsProps) => {
  const attachments = usePromptInputAttachments();
  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    attachments.openFileDialog();
  };
  return (
    <DropdownItem {...props} onClick={handleClick}>
      <IconPhoto className="mr-2 size-4" /> {label}
    </DropdownItem>
  );
};
export interface PromptInputMessage {
  text: string;
  files: FileUIPart[];
}
export type PromptInputProps = Omit<
  HTMLAttributes<HTMLFormElement>,
  "onSubmit" | "onError"
> & {
  accept?: string;
  multiple?: boolean;
  globalDrop?: boolean;
  syncHiddenInput?: boolean;
  maxFiles?: number;
  maxFileSize?: number;
  /** Merged onto the inner `InputGroup`. */
  containerClassName?: string;
  /** Same as `containerClassName`. */
  inputGroupClassName?: string;
  /**
   * Accepts a non-file drag of this MIME type: it counts as a drag over the
   * form (the `groupDragOver` classes) and `onDrop` receives its string
   * payload. Other types keep the browser's default drop.
   */
  dataDrop?: { type: string; onDrop: (payload: string) => void };
  onError?: (err: {
    code: "max_files" | "max_file_size" | "accept";
    message: string;
  }) => void;
  onSubmit: (
    message: PromptInputMessage,
    event: FormEvent<HTMLFormElement>,
  ) => void | Promise<void>;
};
export const PromptInput = ({
  className,
  accept,
  multiple,
  globalDrop,
  syncHiddenInput,
  maxFiles,
  maxFileSize,
  containerClassName,
  inputGroupClassName,
  dataDrop,
  onError,
  onSubmit,
  children,
  ...props
}: PromptInputProps) => {
  const classes = useUiConfig("PromptInput")?.classes;
  const merge = useCn();
  const controller = useOptionalPromptInputController();
  const usingProvider = !!controller;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  // Enter/leave pairs, not a boolean: `dragleave` also fires when the pointer
  // moves onto a child of the form.
  const dragEnterDepth = useRef(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [items, setItems] = useState<
    (FileUIPart & {
      id: string;
    })[]
  >([]);
  const files = usingProvider ? controller.attachments.files : items;
  const [referencedSources, setReferencedSources] = useState<
    (SourceDocumentUIPart & {
      id: string;
    })[]
  >([]);
  const filesRef = useRef(files);
  useEffect(() => {
    filesRef.current = files;
  }, [files]);
  const openFileDialogLocal = () => {
    inputRef.current?.click();
  };
  const matchesAccept = (f: File) => {
    if (!accept || accept.trim() === "") return true;
    const patterns = accept
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    return patterns.some((pattern) => {
      if (pattern.endsWith("/*")) {
        const prefix = pattern.slice(0, -1);
        return f.type.startsWith(prefix);
      }
      // Extension patterns (`.html`): browsers often omit the MIME type.
      if (pattern.startsWith(".")) {
        return f.name.toLowerCase().endsWith(pattern.toLowerCase());
      }
      return f.type === pattern;
    });
  };
  const addLocal = (fileList: File[] | FileList) => {
    const incoming = [...fileList];
    const accepted = incoming.filter((f) => matchesAccept(f));
    if (incoming.length && accepted.length === 0) {
      onError?.({
        code: "accept",
        message: "No files match the accepted types.",
      });
      return;
    }
    const withinSize = (f: File) =>
      maxFileSize ? f.size <= maxFileSize : true;
    const sized = accepted.filter(withinSize);
    if (accepted.length > 0 && sized.length === 0) {
      onError?.({
        code: "max_file_size",
        message: "All files exceed the maximum size.",
      });
      return;
    }
    setItems((prev) => {
      const capacity =
        typeof maxFiles === "number"
          ? Math.max(0, maxFiles - prev.length)
          : undefined;
      const capped =
        typeof capacity === "number" ? sized.slice(0, capacity) : sized;
      if (typeof capacity === "number" && sized.length > capacity) {
        onError?.({
          code: "max_files",
          message: "Too many files. Some were not added.",
        });
      }
      const next: (FileUIPart & {
        id: string;
      })[] = [];
      for (const file of capped) {
        next.push({
          filename: file.name,
          id: nanoid(),
          mediaType: file.type,
          type: "file",
          url: URL.createObjectURL(file),
        });
      }
      return [...prev, ...next];
    });
  };
  const removeLocal = (id: string) =>
    setItems((prev) => {
      const found = prev.find((file) => file.id === id);
      if (found?.url) URL.revokeObjectURL(found.url);
      return prev.filter((file) => file.id !== id);
    });
  const replaceLocal = (id: string, file: File) =>
    setItems((prev) => prev.map((existing) => replaceFile(existing, id, file)));
  const addWithProviderValidation = (fileList: File[] | FileList) => {
    const incoming = [...fileList];
    const accepted = incoming.filter((f) => matchesAccept(f));
    if (incoming.length && accepted.length === 0) {
      onError?.({
        code: "accept",
        message: "No files match the accepted types.",
      });
      return;
    }
    const withinSize = (f: File) =>
      maxFileSize ? f.size <= maxFileSize : true;
    const sized = accepted.filter(withinSize);
    if (accepted.length > 0 && sized.length === 0) {
      onError?.({
        code: "max_file_size",
        message: "All files exceed the maximum size.",
      });
      return;
    }
    const currentCount = files.length;
    const capacity =
      typeof maxFiles === "number"
        ? Math.max(0, maxFiles - currentCount)
        : undefined;
    const capped =
      typeof capacity === "number" ? sized.slice(0, capacity) : sized;
    if (typeof capacity === "number" && sized.length > capacity) {
      onError?.({
        code: "max_files",
        message: "Too many files. Some were not added.",
      });
    }
    if (capped.length > 0) {
      controller?.attachments.add(capped);
    }
  };
  const clearAttachments = () =>
    usingProvider
      ? controller?.attachments.clear()
      : setItems((prev) => {
          for (const file of prev) {
            if (file.url) URL.revokeObjectURL(file.url);
          }
          return [];
        });
  const clearReferencedSources = () => setReferencedSources([]);
  const add = usingProvider ? addWithProviderValidation : addLocal;
  const remove = usingProvider ? controller.attachments.remove : removeLocal;
  const replace = usingProvider ? controller.attachments.replace : replaceLocal;
  const openFileDialog = usingProvider
    ? controller.attachments.openFileDialog
    : openFileDialogLocal;
  const clear = () => {
    clearAttachments();
    clearReferencedSources();
  };
  useEffect(() => {
    if (!usingProvider) return;
    controller.__registerFileInput(inputRef, () => inputRef.current?.click());
  }, [usingProvider, controller]);
  useEffect(() => {
    if (syncHiddenInput && inputRef.current && files.length === 0) {
      inputRef.current.value = "";
    }
  }, [files, syncHiddenInput]);
  // Drops land on the form, or anywhere in the document with `globalDrop`.
  useEffect(() => {
    const target: EventTarget | null = globalDrop ? document : formRef.current;
    if (!target) return;
    // Types are readable during the drag; the payload only on drop.
    const carriesData = (event: DragEvent) =>
      dataDrop !== undefined &&
      event.dataTransfer?.types?.includes(dataDrop.type) === true;
    const isAcceptedDrag = (event: DragEvent) =>
      event.dataTransfer?.types?.includes("Files") === true || carriesData(event);
    const onDragEnter = (event: Event) => {
      if (!(event instanceof DragEvent) || !isAcceptedDrag(event)) return;
      dragEnterDepth.current += 1;
      setIsDragOver(true);
    };
    const onDragOver = (event: Event) => {
      if (event instanceof DragEvent && isAcceptedDrag(event)) event.preventDefault();
    };
    const onDragLeave = (event: Event) => {
      if (!(event instanceof DragEvent) || !isAcceptedDrag(event)) return;
      dragEnterDepth.current = Math.max(0, dragEnterDepth.current - 1);
      if (dragEnterDepth.current === 0) setIsDragOver(false);
    };
    const onDrop = (event: Event) => {
      if (!(event instanceof DragEvent)) return;
      if (isAcceptedDrag(event)) event.preventDefault();
      dragEnterDepth.current = 0;
      setIsDragOver(false);
      if (dataDrop !== undefined && carriesData(event)) {
        const payload = event.dataTransfer?.getData(dataDrop.type);
        if (payload) dataDrop.onDrop(payload);
        return;
      }
      if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
        add(event.dataTransfer.files);
      }
    };
    target.addEventListener("dragenter", onDragEnter);
    target.addEventListener("dragover", onDragOver);
    target.addEventListener("dragleave", onDragLeave);
    target.addEventListener("drop", onDrop);
    return () => {
      target.removeEventListener("dragenter", onDragEnter);
      target.removeEventListener("dragover", onDragOver);
      target.removeEventListener("dragleave", onDragLeave);
      target.removeEventListener("drop", onDrop);
    };
  }, [add, globalDrop, dataDrop]);
  useEffect(
    () => () => {
      if (!usingProvider) {
        for (const f of filesRef.current) {
          if (f.url) URL.revokeObjectURL(f.url);
        }
      }
    },
    [usingProvider],
  );
  const handleChange: ChangeEventHandler<HTMLInputElement> = (event) => {
    if (event.currentTarget.files) add(event.currentTarget.files);
    event.currentTarget.value = "";
  };
  const attachmentsCtx = {
    add,
    clear: clearAttachments,
    fileInputRef: inputRef,
    files: files.map((item) => ({ ...item, id: item.id })),
    openFileDialog,
    remove,
    replace,
  };
  const refsCtx = {
    add: (incoming: SourceDocumentUIPart[] | SourceDocumentUIPart) => {
      const array = Array.isArray(incoming) ? incoming : [incoming];
      setReferencedSources((prev) => [
        ...prev,
        ...array.map((s) => ({ ...s, id: nanoid() })),
      ]);
    },
    clear: clearReferencedSources,
    remove: (id: string) => {
      setReferencedSources((prev) => prev.filter((s) => s.id !== id));
    },
    sources: referencedSources,
  };
  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const text = usingProvider
      ? controller.textInput.value
      : (() => {
          const formData = new FormData(form);
          return (formData.get("message") as string) || "";
        })();
    if (!usingProvider) form.reset();
    try {
      const convertedFiles: FileUIPart[] = await Promise.all(
        files.map(async ({ id: _id, ...item }) => {
          if (item.url?.startsWith("blob:")) {
            const dataUrl = await convertBlobUrlToDataUrl(item.url);
            return { ...item, url: dataUrl ?? item.url };
          }
          return item;
        }),
      );
      const result = onSubmit({ files: convertedFiles, text }, event);
      if (result instanceof Promise) {
        try {
          await result;
          clear();
          if (usingProvider) controller.textInput.clear();
        } catch {
          /* Don't clear on error */
        }
      } else {
        clear();
        if (usingProvider) controller.textInput.clear();
      }
    } catch {
      /* Don't clear on error */
    }
  };
  const inner = (
    <>
      <input
        accept={accept}
        aria-label="Upload files"
        className="hidden"
        multiple={multiple}
        onChange={handleChange}
        ref={inputRef}
        title="Upload files"
        type="file"
      />
      <form
        className={merge("w-full", className)}
        onSubmit={handleSubmit}
        ref={formRef}
        {...props}
      >
        <InputGroup
          className={merge(
            classes?.group ?? "overflow-hidden",
            isDragOver ? classes?.groupDragOver : classes?.groupIdle,
            containerClassName ?? inputGroupClassName ?? classes?.groupDefault,
          )}
        >
          {children}
        </InputGroup>
      </form>
    </>
  );
  const withReferencedSources = (
    <LocalReferencedSourcesContext.Provider value={refsCtx}>
      {inner}
    </LocalReferencedSourcesContext.Provider>
  );
  return (
    <LocalAttachmentsContext.Provider value={attachmentsCtx}>
      {withReferencedSources}
    </LocalAttachmentsContext.Provider>
  );
};
export type PromptInputBodyProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputBody = ({
  className,
  ...props
}: PromptInputBodyProps) => {
  const merge = useCn();
  return (
    <div className={merge("contents", className)} {...props} />
  );
};
export type PromptInputTextareaProps = ComponentProps<
  typeof InputGroupTextarea
>;
export const PromptInputTextarea = ({
  onChange,
  onKeyDown,
  className,
  placeholder = "What would you like to know?",
  ...props
}: PromptInputTextareaProps) => {
  const controller = useOptionalPromptInputController();
  const attachments = usePromptInputAttachments();
  const textarea = useUiConfig("PromptInput")?.classes?.textarea;
  const merge = useCn();
  const [isComposing, setIsComposing] = useState(false);
  const handleKeyDown: KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "Enter") {
      if (isComposing || e.nativeEvent.isComposing) return;
      if (e.shiftKey) return;
      e.preventDefault();
      const { form } = e.currentTarget;
      const submitButton = form?.querySelector(
        'button[type="submit"]',
      ) as HTMLButtonElement | null;
      if (submitButton?.disabled) return;
      form?.requestSubmit();
    }
    if (
      e.key === "Backspace" &&
      e.currentTarget.value === "" &&
      attachments.files.length > 0
    ) {
      e.preventDefault();
      const lastAttachment = attachments.files.at(-1);
      if (lastAttachment) attachments.remove(lastAttachment.id);
    }
  };
  const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = (event) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    const pastedFiles: File[] = [];
    for (const item of items) {
      if (item.kind === "file") {
        const file = item.getAsFile();
        if (file) pastedFiles.push(file);
      }
    }
    if (pastedFiles.length > 0) {
      event.preventDefault();
      attachments.add(pastedFiles);
    }
  };
  const handleCompositionEnd = () => setIsComposing(false);
  const handleCompositionStart = () => setIsComposing(true);
  const controlledProps = controller
    ? {
        onChange: (e: ChangeEvent<HTMLTextAreaElement>) => {
          controller.textInput.setInput(e.currentTarget.value);
          onChange?.(e);
        },
        value: controller.textInput.value,
      }
    : { onChange };
  return (
    <InputGroupTextarea
      className={merge(textarea ?? "field-sizing-content max-h-48 min-h-16", className)}
      name="message"
      onCompositionEnd={handleCompositionEnd}
      onCompositionStart={handleCompositionStart}
      onKeyDown={handleKeyDown}
      onPaste={handlePaste}
      placeholder={placeholder}
      {...props}
      {...controlledProps}
    />
  );
};
export type PromptInputHeaderProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;
export const PromptInputHeader = ({
  className,
  ...props
}: PromptInputHeaderProps) => {
  const merge = useCn();
  return (
    <InputGroupAddon
      align="block-end"
      className={merge("order-first flex-wrap gap-1", className)}
      {...props}
    />
  );
};
export type PromptInputFooterProps = Omit<
  ComponentProps<typeof InputGroupAddon>,
  "align"
>;
export const PromptInputFooter = ({
  className,
  ...props
}: PromptInputFooterProps) => {
  const footer = useUiConfig("PromptInput")?.classes?.footer;
  const merge = useCn();
  return (
    <InputGroupAddon
      align="block-end"
      className={merge(footer ?? "justify-between gap-1", className)}
      {...props}
    />
  );
};
export type PromptInputToolsProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTools = ({
  className,
  ...props
}: PromptInputToolsProps) => {
  const merge = useCn();
  return (
    <div
      className={merge("flex min-w-0 items-center gap-1", className)}
      {...props}
    />
  );
};
export type PromptInputButtonTooltip =
  | string
  | {
      content: ReactNode;
      shortcut?: string;
      side?: ComponentProps<typeof TooltipContent>["side"];
    };
export type PromptInputButtonProps = ComponentProps<typeof InputGroupButton> & {
  tooltip?: PromptInputButtonTooltip;
};
export const PromptInputButton = ({
  variant = "ghost",
  className,
  size,
  tooltip,
  ...props
}: PromptInputButtonProps) => {
  const merge = useCn();
  const newSize =
    size ?? (Children.count(props.children) > 1 ? "sm" : "icon-sm");
  const button = (
    <InputGroupButton
      className={merge(className)}
      size={newSize}
      type="button"
      variant={variant}
      {...props}
    />
  );
  if (!tooltip) return button;
  const tooltipContent =
    typeof tooltip === "string" ? tooltip : tooltip.content;
  const shortcut = typeof tooltip === "string" ? undefined : tooltip.shortcut;
  const side = typeof tooltip === "string" ? "top" : tooltip.side ?? "top";
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side={side}>
        {tooltipContent}
        {shortcut && <span className="ml-2 text-muted-foreground">{shortcut}</span>}
      </TooltipContent>
    </Tooltip>
  );
};
export type PromptInputActionMenuProps = ComponentProps<typeof Dropdown>;
export const PromptInputActionMenu = (props: PromptInputActionMenuProps) => (
  <Dropdown {...props} />
);
export type PromptInputActionMenuTriggerProps = PromptInputButtonProps;
export const PromptInputActionMenuTrigger = ({
  className,
  children,
  ...props
}: PromptInputActionMenuTriggerProps) => {
  const asChild = useUiConfig("PromptInput")?.menuTriggerAsChild;
  const button = (
    <PromptInputButton className={className} {...props}>
      {children ?? <IconPlus className="size-4" />}
    </PromptInputButton>
  );
  return asChild ? <DropdownTrigger asChild>{button}</DropdownTrigger> : <DropdownTrigger>{button}</DropdownTrigger>;
};
export type PromptInputActionMenuContentProps = ComponentProps<
  typeof DropdownMenu
>;
export const PromptInputActionMenuContent = ({
  className,
  ...props
}: PromptInputActionMenuContentProps) => {
  const merge = useCn();
  return (
    <DropdownMenu align="start" className={merge(className)} {...props} />
  );
};
export type PromptInputActionMenuItemProps = ComponentProps<
  typeof DropdownItem
>;
export const PromptInputActionMenuItem = ({
  className,
  ...props
}: PromptInputActionMenuItemProps) => {
  const merge = useCn();
  return (
    <DropdownItem className={merge(className)} {...props} />
  );
};
export type PromptInputSubmitProps = ComponentProps<typeof InputGroupButton> & {
  status?: ChatStatus;
  onStop?: () => void;
};
export const PromptInputSubmit = ({
  className,
  variant = "default",
  size = "icon-sm",
  status,
  onStop,
  onClick,
  children,
  ...props
}: PromptInputSubmitProps) => {
  const config = useUiConfig("PromptInput");
  const icons = config?.submitIcons;
  const merge = useCn();
  const isGenerating = status === "submitted" || status === "streaming";
  const iconKey =
    status === "submitted" || status === "streaming" || status === "error"
      ? status
      : "send";
  let Icon = icons?.send ?? <IconCornerDownLeft className="size-4" />;
  if (status === "submitted") {
    Icon = icons?.submitted ?? <Spinner size="sm" />;
  } else if (status === "streaming") {
    Icon = icons?.streaming ?? <IconSquare className="size-4" />;
  } else if (status === "error") {
    Icon = icons?.error ?? <IconX className="size-4" />;
  }
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (isGenerating && onStop) {
      e.preventDefault();
      onStop();
      return;
    }
    onClick?.(e);
  };
  return (
    <InputGroupButton
      aria-label={isGenerating ? "Stop" : "Submit"}
      className={merge(config?.classes?.submit, className)}
      onClick={handleClick}
      size={size}
      type={isGenerating && onStop ? "button" : "submit"}
      variant={variant}
      {...props}
    >
      {children ??
        (config?.submitCrossfade ? (
          // Keyed by status, so send, spinner, stop and error cross-fade.
          <CrossfadeIconSlot iconKey={iconKey}>{Icon}</CrossfadeIconSlot>
        ) : (
          Icon
        ))}
    </InputGroupButton>
  );
};
export type PromptInputModelSelectProps = ComponentProps<typeof Select>;
export const PromptInputModelSelect = (props: PromptInputModelSelectProps) => (
  <Select {...props} />
);
export type PromptInputModelSelectTriggerProps = ComponentProps<
  typeof SelectTrigger
>;
export const PromptInputModelSelectTrigger = ({
  className,
  ...props
}: PromptInputModelSelectTriggerProps) => {
  const merge = useCn();
  return (
    <SelectTrigger
      className={merge(
        "border-none bg-transparent font-medium text-muted-foreground shadow-none transition-[color,transform] duration-150 ease-out active:scale-[0.97]",
        "hover:bg-surface-secondary hover:text-foreground",
        segmentExpandedStateClass,
        className,
      )}
      {...props}
    />
  );
};
export type PromptInputModelSelectContentProps = ComponentProps<
  typeof SelectContent
>;
export const PromptInputModelSelectContent = ({
  className,
  ...props
}: PromptInputModelSelectContentProps) => {
  const merge = useCn();
  return (
    <SelectContent className={merge(className)} {...props} />
  );
};
export type PromptInputModelSelectItemProps = ComponentProps<typeof SelectItem>;
export const PromptInputModelSelectItem = ({
  className,
  ...props
}: PromptInputModelSelectItemProps) => {
  const merge = useCn();
  return (
    <SelectItem className={merge(className)} {...props} />
  );
};
export type PromptInputModelSelectValueProps = ComponentProps<
  typeof SelectValue
>;
export const PromptInputModelSelectValue = ({
  className,
  ...props
}: PromptInputModelSelectValueProps) => {
  const merge = useCn();
  return (
    <SelectValue className={merge(className)} {...props} />
  );
};
export type PromptInputHoverCardProps = ComponentProps<typeof HoverCard>;
export const PromptInputHoverCard = ({
  openDelay = 0,
  closeDelay = 0,
  ...props
}: PromptInputHoverCardProps) => (
  <HoverCard closeDelay={closeDelay} openDelay={openDelay} {...props} />
);
export type PromptInputHoverCardTriggerProps = ComponentProps<
  typeof HoverCardTrigger
>;
export const PromptInputHoverCardTrigger = (
  props: PromptInputHoverCardTriggerProps,
) => <HoverCardTrigger {...props} />;
export type PromptInputHoverCardContentProps = ComponentProps<
  typeof HoverCardContent
>;
export const PromptInputHoverCardContent = ({
  align = "start",
  ...props
}: PromptInputHoverCardContentProps) => (
  <HoverCardContent align={align} {...props} />
);
export type PromptInputTabsListProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTabsList = ({
  className,
  ...props
}: PromptInputTabsListProps) => {
  const merge = useCn();
  return <div className={merge(className)} {...props} />;
};
export type PromptInputTabProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTab = ({
  className,
  ...props
}: PromptInputTabProps) => {
  const merge = useCn();
  return <div className={merge(className)} {...props} />;
};
export type PromptInputTabLabelProps = HTMLAttributes<HTMLHeadingElement>;
export const PromptInputTabLabel = ({
  className,
  ...props
}: PromptInputTabLabelProps) => {
  const merge = useCn();
  return (
    <h3
      className={merge("mb-2 px-3 font-medium text-muted-foreground text-xs", className)}
      {...props}
    />
  );
};
export type PromptInputTabBodyProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTabBody = ({
  className,
  ...props
}: PromptInputTabBodyProps) => {
  const merge = useCn();
  return (
    <div className={merge("space-y-1", className)} {...props} />
  );
};
export type PromptInputTabItemProps = HTMLAttributes<HTMLDivElement>;
export const PromptInputTabItem = ({
  className,
  ...props
}: PromptInputTabItemProps) => {
  const tabItem = useUiConfig("PromptInput")?.classes?.tabItem;
  const merge = useCn();
  return (
    <div
      className={merge(
        tabItem ??
          "flex items-center gap-2 rounded-md px-3 py-2 text-xs transition-[background-color,transform] duration-150 ease-out active:scale-[0.99] hover:bg-surface-secondary",
        className,
      )}
      {...props}
    />
  );
};
export type PromptInputCommandProps = ComponentProps<typeof Command>;
export const PromptInputCommand = ({
  className,
  ...props
}: PromptInputCommandProps) => {
  const merge = useCn();
  return <Command className={merge(className)} {...props} />;
};
export type PromptInputCommandInputProps = ComponentProps<typeof CommandInput>;
export const PromptInputCommandInput = ({
  className,
  ...props
}: PromptInputCommandInputProps) => {
  const merge = useCn();
  return (
    <CommandInput className={merge(className)} {...props} />
  );
};
export type PromptInputCommandListProps = ComponentProps<typeof CommandList>;
export const PromptInputCommandList = ({
  className,
  ...props
}: PromptInputCommandListProps) => {
  const merge = useCn();
  return (
    <CommandList className={merge(className)} {...props} />
  );
};
export type PromptInputCommandEmptyProps = ComponentProps<typeof CommandEmpty>;
export const PromptInputCommandEmpty = ({
  className,
  ...props
}: PromptInputCommandEmptyProps) => {
  const merge = useCn();
  return (
    <CommandEmpty className={merge(className)} {...props} />
  );
};
export type PromptInputCommandGroupProps = ComponentProps<typeof CommandGroup>;
export const PromptInputCommandGroup = ({
  className,
  ...props
}: PromptInputCommandGroupProps) => {
  const merge = useCn();
  return (
    <CommandGroup className={merge(className)} {...props} />
  );
};
export type PromptInputCommandItemProps = ComponentProps<typeof CommandItem>;
export const PromptInputCommandItem = ({
  className,
  ...props
}: PromptInputCommandItemProps) => {
  const merge = useCn();
  return (
    <CommandItem className={merge(className)} {...props} />
  );
};
export type PromptInputCommandSeparatorProps = ComponentProps<
  typeof CommandSeparator
>;
export const PromptInputCommandSeparator = ({
  className,
  ...props
}: PromptInputCommandSeparatorProps) => {
  const merge = useCn();
  return (
    <CommandSeparator className={merge(className)} {...props} />
  );
};
