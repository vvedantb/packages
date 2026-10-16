// Colour, radius, shadow and font tokens live in @vvedantb/tokens. Import that
// stylesheet in the app. This package does not ship a second token set.
export { cn } from "./utils/cn";
export { floatingSurfaceClass } from "./ui/_menu-classes";
export * from "./ui/surface-classes";
export * from "./motion/presets";

export * from "./ui/badge";
export * from "./ui/breadcrumb";
export * from "./ui/button";
export * from "./ui/button-group";
export * from "./ui/card";
export * from "./ui/carousel";
export * from "./ui/checkbox";
export * from "./ui/collapsible";
export * from "./ui/command";
export * from "./ui/context-menu";
export * from "./ui/dialog";
export * from "./ui/alert-dialog";
export * from "./ui/confirm-dialog";
export * from "./ui/dropdown-menu";
export * from "./ui/hover-card";
export * from "./ui/input";
export * from "./ui/label";
export * from "./ui/labeled-switch-row";
export * from "./ui/pagination";
export * from "./ui/popover";
export * from "./ui/progress";
export {
  Select as RadixSelect,
  SelectContent as RadixSelectContent,
  SelectGroup as RadixSelectGroup,
  SelectItem as RadixSelectItem,
  SelectLabel as RadixSelectLabel,
  SelectScrollDownButton as RadixSelectScrollDownButton,
  SelectScrollUpButton as RadixSelectScrollUpButton,
  SelectSeparator as RadixSelectSeparator,
  SelectTrigger as RadixSelectTrigger,
  SelectValue as RadixSelectValue,
} from "./ui/radix-select";
export * from "./ui/search-input";
export * from "./ui/select";
export * from "./ui/separator";
export * from "./ui/skeleton";
export * from "./ui/sonner";
export * from "./ui/spinner";
export * from "./ui/switch";
export * from "./ui/table";
export * from "./ui/tabs";
export * from "./ui/textarea";
export * from "./ui/time-picker";
export * from "./ui/tooltip";
export * from "./ui/kbd";
export * from "./ui/sheet";
export * from "./ui/visually-hidden";
export * from "./ui/clearInputDissolve";

// Dual copies: richer file uses the plain name; the other keeps a suffix (AppB / AppC).
export * from "./ui/accordion";
export {
  Accordion as AccordionAppC,
  AccordionItem as AccordionItemAppC,
  AccordionTrigger as AccordionTriggerAppC,
  AccordionContent as AccordionContentAppC,
} from "./ui/accordion.app-c";
export * from "./ui/clear-input";
export { ClearInput as ClearInputAppB } from "./ui/clear-input.app-b";
export * from "./ui/input-group";
export {
  InputGroup as InputGroupAppC,
  InputGroupAddon as InputGroupAddonAppC,
  InputGroupButton as InputGroupButtonAppC,
  InputGroupText as InputGroupTextAppC,
  InputGroupInput as InputGroupInputAppC,
  InputGroupTextarea as InputGroupTextareaAppC,
} from "./ui/input-group.app-c";
export * from "./ui/scroll-area";
export {
  ScrollArea as ScrollAreaAppC,
  ScrollBar as ScrollBarAppC,
} from "./ui/scroll-area.app-c";

export * from "./ai-elements/artifact";
export * from "./ai-elements/attachments";
export * from "./ai-elements/chain-of-thought";
export * from "./ai-elements/code-block";
export * from "./ai-elements/conversation";
export * from "./ai-elements/image";
export * from "./ai-elements/inline-citation";
export * from "./ai-elements/message";
export * from "./ai-elements/model-selector";
export * from "./ai-elements/prompt-input";
export * from "./ai-elements/queue";
export * from "./ai-elements/reasoning";
export * from "./ai-elements/shimmer";
export * from "./ai-elements/sources";
export * from "./ai-elements/speech-input";
export * from "./ai-elements/suggestion";

// Deprecated aliases for the pre-0.1.6 export names. Remove in the next minor release.
export {
  Accordion as AccordionVerve,
  AccordionItem as AccordionItemVerve,
  AccordionTrigger as AccordionTriggerVerve,
  AccordionContent as AccordionContentVerve,
} from "./ui/accordion.app-c";
export { ClearInput as ClearInputVibot } from "./ui/clear-input.app-b";
export {
  InputGroup as InputGroupVerve,
  InputGroupAddon as InputGroupAddonVerve,
  InputGroupButton as InputGroupButtonVerve,
  InputGroupText as InputGroupTextVerve,
  InputGroupInput as InputGroupInputVerve,
  InputGroupTextarea as InputGroupTextareaVerve,
} from "./ui/input-group.app-c";
export {
  ScrollArea as ScrollAreaVerve,
  ScrollBar as ScrollBarVerve,
} from "./ui/scroll-area.app-c";
