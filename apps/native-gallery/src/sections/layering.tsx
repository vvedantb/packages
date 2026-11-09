// Layering stress: a tab bar over glass, with every overlay opened over it.
// The triggers sit just above the bar so each overlay has to cover it.
import { useState } from "react";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconDots, IconPencil, IconTrash } from "@tabler/icons-react-native";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  BottomSheetContainer,
  Button,
  ConfirmDialog,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  FloatingTabBar,
  GlassBlurProvider,
  GlassBlurTarget,
  Select,
  Sheet,
  SheetBody,
  SheetClose,
  SheetContent,
  SheetHandle,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  tabBarReserve,
  tokens,
  toast,
} from "@vvedantb/native-ui";
import { useScheme } from "../useScheme";
import { TAB_BAR_PROPS } from "./glass";
import { GText } from "../ui";

const COLOURS = [
  { label: "Pink", value: "pink" },
  { label: "A colour with a very long name that needs to wrap on a narrow phone", value: "long" },
  { label: "None", value: null },
];

export function LayeringSection() {
  const insets = useSafeAreaInsets();
  const scheme = useScheme();
  const [result, setResult] = useState("none");
  const [colour, setColour] = useState<string | null | undefined>(undefined);
  const [sort, setSort] = useState("newest");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [bottomSheet, setBottomSheet] = useState(false);
  const [confirm, setConfirm] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: tokens.color.background[scheme] }}>
      <GlassBlurProvider>
        <GlassBlurTarget style={{ flex: 1 }}>
          <View style={{ flex: 1, paddingTop: insets.top + 12, paddingHorizontal: 16, gap: 12 }}>
            {/* Colour bands under the tab bar, so the glass has something to blur. */}
            <View style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 300 }}>
              {["#db2777", "#2563eb", "#16a34a", "#f59e0b"].map((c) => (
                <View key={c} style={{ flex: 1, backgroundColor: c }} />
              ))}
            </View>
            <GText testID="layering-result" style={{ fontSize: 16, fontWeight: "600" }}>{`Result: ${result}`}</GText>
            <GText testID="layering-select-value">{`Select: ${String(colour)}`}</GText>
            <View style={{ position: "absolute", left: 16, right: 16, bottom: tabBarReserve(false, insets.bottom) + 8, gap: 12 }}>
            <View className="flex-row items-center gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger testID="dd-trigger" accessibilityLabel="Open menu" hitSlop={6} className="h-11 w-11 items-center justify-center">
                  <IconDots size={20} color={tokens.color.foreground[scheme]} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuLabel>Sort</DropdownMenuLabel>
                  <DropdownMenuRadioItem testID="dd-radio-newest" checked={sort === "newest"} onSelect={() => setSort("newest")}>
                    Newest first
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem testID="dd-radio-oldest" checked={sort === "oldest"} onSelect={() => setSort("oldest")}>
                    Oldest first
                  </DropdownMenuRadioItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem testID="dd-item-rename" icon={IconPencil} onSelect={() => setResult("rename")}>
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem testID="dd-item-delete" icon={IconTrash} destructive onSelect={() => setResult("delete")}>
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <GText testID="dd-sort">{`Sort: ${sort}`}</GText>
            </View>
            <Select
              testID="layer-select"
              value={colour}
              onValueChange={(value) => {
                setColour(value);
                setResult(`select ${String(value)}`);
              }}
              placeholder="Pick a colour"
              options={COLOURS}
            />
            <View className="flex-row flex-wrap gap-2">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button testID="sheet-open" size="sm" fullWidth={false} variant="secondary">
                    Sheet
                  </Button>
                </SheetTrigger>
                <SheetContent showHandle={false}>
                  <SheetHandle />
                  <SheetHeader>
                    <SheetTitle>Filters</SheetTitle>
                    <SheetDescription>Sheet over the tab bar.</SheetDescription>
                  </SheetHeader>
                  <SheetBody>
                    <GText testID="sheet-body">Sheet body text</GText>
                  </SheetBody>
                  <SheetClose asChild>
                    <Button testID="sheet-close">Close sheet</Button>
                  </SheetClose>
                </SheetContent>
              </Sheet>
              <Button testID="bottom-sheet-open" size="sm" fullWidth={false} variant="secondary" onPress={() => setBottomSheet(true)}>
                Bottom sheet
              </Button>
              <Button testID="confirm-open" size="sm" fullWidth={false} variant="secondary" onPress={() => setConfirm(true)}>
                Confirm
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button testID="alert-open" size="sm" fullWidth={false} variant="secondary">
                    Alert
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this list?</AlertDialogTitle>
                    <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel testID="alert-cancel">Cancel</AlertDialogCancel>
                    <AlertDialogAction testID="alert-confirm" variant="destructive" onPress={() => setResult("alert deleted")}>
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              <Button testID="toast-open" size="sm" fullWidth={false} variant="secondary" onPress={() => toast.success("Saved over the tab bar")}>
                Toast
              </Button>
            </View>
            </View>
            <ConfirmDialog
              open={confirm}
              onOpenChange={setConfirm}
              title="Sign out?"
              description="You can sign back in at any time."
              confirmLabel="Sign out"
              variant="destructive"
              onConfirm={() => setResult("confirmed")}
            />
            <BottomSheetContainer visible={bottomSheet} onClose={() => setBottomSheet(false)} title="Bottom sheet" closeTestID="bottom-sheet-close">
              <Text testID="bottom-sheet-body" style={{ color: tokens.color.foreground[scheme] }}>
                Gorhom sheet over the tab bar
              </Text>
            </BottomSheetContainer>
          </View>
        </GlassBlurTarget>
        {/* A real height (not just the absolute bar inside): a 0 height wrapper is not
            visible to UI tests. `collapsable={false}` keeps the native view. */}
        <View
          collapsable={false}
          pointerEvents="box-none"
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: tabBarReserve(false, insets.bottom) }}
          testID="layering-tab-bar"
        >
          <FloatingTabBar {...TAB_BAR_PROPS} />
        </View>
      </GlassBlurProvider>
    </View>
  );
}
