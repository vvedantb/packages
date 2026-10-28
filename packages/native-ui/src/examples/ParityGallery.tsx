// Reference screen for the components that mirror `@vvedantb/ui`. Render it in
// an Expo route to compare against the web: it needs the same NativeWind setup
// as the rest of the package and a `SafeAreaProvider` above it. It always
// renders the default sizes (larger text off), as the web does. Prices below
// are placeholders, not real plan prices.
import { useState, type ReactNode } from "react";
import { ScrollView, Text, View, type TextProps } from "react-native";
import { IconInbox } from "@tabler/icons-react-native";
import {
  APP_ICONS,
  APP_NAMES,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AppMark,
  AppWordmark,
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  CenteredSpinner,
  Checkbox,
  ConfirmDialog,
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  EmptyState,
  GoogleMark,
  Input,
  Label,
  LabeledSwitchRow,
  NativeUiProvider,
  PageHeader,
  PageTitle,
  PricingModal,
  Progress,
  SearchInput,
  Select,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  Skeleton,
  Spinner,
  StatusDot,
  Switch,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  ThemeToggle,
  Toaster,
  UpgradeToProCard,
  initials,
  toast,
  tokens,
  useNativeUi,
  type BadgeVariant,
  type ButtonVariant,
  type PricingPlan,
  type StatusTone,
} from "../index";
import { typeStyle } from "../controlStyles";
import { useScheme } from "../useScheme";

const BUTTON_VARIANTS: ButtonVariant[] = [
  "default",
  "secondary",
  "outline",
  "destructive",
  "ghost",
  "link",
];

const BADGE_VARIANTS: BadgeVariant[] = [
  "default",
  "secondary",
  "destructive",
  "destructive-soft",
  "outline",
  "success",
  "warning",
];

const STATUS_TONES: StatusTone[] = [
  "progress",
  "business-review",
  "code-review",
  "done",
  "cancelled",
  "active",
  "critical",
  "neutral",
];

// Space after the last section, so Card, Upgrade and Overlays can scroll to the
// top of an 844-tall phone for screenshot crops.
const GALLERY_END_SPACE = 720;

const PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    price: { month: "£0", year: "£0" },
    current: true,
    benefits: [{ label: "Core features" }],
  },
  {
    id: "pro",
    name: "V Pro",
    price: { month: "£X", year: "£Y" },
    featured: true,
    intro: "Everything in Free, and:",
  },
];

/** Body text in the scheme's foreground (a style, so it reads in dark mode too). */
function GalleryText({ className, style, ...props }: TextProps & { className?: string }) {
  const scheme = useScheme();
  return (
    <Text
      className={className ?? "font-instrument-sans text-base"}
      style={[{ color: tokens.color.foreground[scheme] }, style]}
      {...props}
    />
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <GalleryText
        accessibilityRole="header"
        className="font-instrument-sans-semibold text-lg"
        style={typeStyle("semibold")}
      >
        {title}
      </GalleryText>
      {children}
    </View>
  );
}

export function ParityGallery() {
  const { accentColor } = useNativeUi();
  return (
    <NativeUiProvider largerText={false} accentColor={accentColor}>
      <GalleryScreen />
    </NativeUiProvider>
  );
}

function GalleryScreen() {
  const [checked, setChecked] = useState<boolean | "indeterminate">("indeterminate");
  const [switchOn, setSwitchOn] = useState(true);
  const [colour, setColour] = useState<string | null | undefined>(undefined);
  const [emptySearch, setEmptySearch] = useState("");
  const [search, setSearch] = useState("Pink");
  const [progress, setProgress] = useState(40);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <View className="flex-1">
      <ScrollView
        // So the SearchInput clear button takes the first tap while the keyboard is up.
        keyboardShouldPersistTaps="handled"
        contentContainerClassName="gap-8 px-4 pt-4"
        contentContainerStyle={{ paddingBottom: GALLERY_END_SPACE }}
      >
        <Section title="Page title">
          <PageTitle>Updates</PageTitle>
          {/* `safeTop={false}` and `px-0`: here the header is not at the top of the screen, and the scroll view pads the sides. */}
          <PageHeader
            title="Apps"
            safeTop={false}
            className="px-0"
            action={
              <Button variant="ghost" size="sm" fullWidth={false} onPress={() => toast("Updating all apps")}>
                Update all
              </Button>
            }
          />
          {/* A header icon action: switches the gallery between light and dark. */}
          <PageHeader title="Settings" safeTop={false} className="px-0" action={<ThemeToggle />} />
        </Section>

        <Section title="Brand">
          {(["vibot", "verve", "velth", "vmem", "vhub"] as const).map((app) => (
            <AppWordmark key={app} app={app} />
          ))}
          <View className="flex-row flex-wrap items-center gap-3">
            {APP_NAMES.map((app) => {
              const Icon = APP_ICONS[app];
              return <Icon key={app} size={28} />;
            })}
            <AppMark app="vibot" variant="tile" size={40} />
            <AppMark app="vibot" variant="tile-light" size={40} />
            <GoogleMark size={28} />
          </View>
          <Button variant="outline" leftIcon={<GoogleMark />} onPress={() => toast("Continue with Google")}>
            Continue with Google
          </Button>
        </Section>

        <Section title="Button">
          {/* The web gallery: a full-width column of variants, then the sm row. */}
          <View className="gap-2">
            {BUTTON_VARIANTS.map((variant) => (
              <Button key={variant} variant={variant} onPress={() => toast(variant)}>
                {variant}
              </Button>
            ))}
            <View className="flex-row gap-2">
              <Button size="sm" fullWidth={false} loading>
                Saving
              </Button>
              <Button size="sm" fullWidth={false} disabled>
                Disabled
              </Button>
            </View>
          </View>
          <View className="flex-row flex-wrap items-center gap-2">
            <Button size="sm" fullWidth={false}>
              Small
            </Button>
            <Button fullWidth={false}>Default</Button>
            <Button size="lg" fullWidth={false}>
              Large
            </Button>
          </View>
        </Section>

        <Section title="Badge">
          <View className="flex-row flex-wrap gap-2">
            {BADGE_VARIANTS.map((variant) => (
              <Badge key={variant} variant={variant}>
                {variant}
              </Badge>
            ))}
          </View>
        </Section>

        <Section title="StatusDot">
          <View className="flex-row flex-wrap items-center gap-3">
            {STATUS_TONES.map((tone) => (
              <StatusDot key={tone} tone={tone} size="md" />
            ))}
          </View>
        </Section>

        <Section title="Fields">
          <View className="gap-2">
            <Label nativeID="gallery-name">Name</Label>
            <Input placeholder="Your name" accessibilityLabel="Name" />
          </View>
          {/* Empty (`sm`: icon and placeholder) and filled (`md`: the clear button). */}
          <SearchInput value={emptySearch} onChange={setEmptySearch} />
          <SearchInput value={search} onChange={setSearch} size="md" label="Search colours" />
          <Textarea placeholder="Notes" accessibilityLabel="Notes" />
          <Select
            value={colour}
            onValueChange={setColour}
            placeholder="Pick a colour"
            options={[
              { label: "Pink", value: "pink" },
              { label: "None", value: null },
            ]}
          />
          <View className="flex-row items-center gap-3">
            <Checkbox
              checked={checked}
              onCheckedChange={setChecked}
              accessibilityLabel="Remember me"
            />
            <Label nativeID="gallery-remember">Remember me</Label>
            <Switch checked={switchOn} onCheckedChange={setSwitchOn} />
          </View>
          <LabeledSwitchRow
            label="Reminders"
            description="A daily nudge at 9:00."
            checked={switchOn}
            onCheckedChange={setSwitchOn}
          />
        </Section>

        <Section title="Tabs">
          <Tabs defaultValue="one">
            <TabsList variant="segmented">
              <TabsTrigger value="one">One</TabsTrigger>
              <TabsTrigger value="two">Two</TabsTrigger>
              <TabsTrigger value="three" disabled>
                Three
              </TabsTrigger>
            </TabsList>
            <TabsContent value="one">
              <GalleryText>First panel</GalleryText>
            </TabsContent>
            <TabsContent value="two">
              <GalleryText>Second panel</GalleryText>
            </TabsContent>
          </Tabs>
        </Section>

        <Section title="Avatar, Progress, Spinner, Skeleton">
          <View className="flex-row items-center gap-3">
            <Avatar>
              <AvatarFallback>{initials("Ada Lovelace")}</AvatarFallback>
            </Avatar>
            <Avatar size={56}>
              <AvatarFallback>{initials("vibot")}</AvatarFallback>
            </Avatar>
            <Spinner />
            <Spinner size="lg" />
          </View>
          <Progress value={progress} />
          <Button
            variant="secondary"
            size="sm"
            onPress={() => setProgress((value) => (value + 20) % 120)}
          >
            Step progress
          </Button>
          <Skeleton className="h-4 w-32" />
          <Separator />
          <View className="h-24">
            <CenteredSpinner label="Loading list" />
          </View>
        </Section>

        <Section title="Card">
          <Card title="Today" description="Card props, as before.">
            <GalleryText>Body</GalleryText>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Composed</CardTitle>
              <CardDescription>Web part names inside the native card.</CardDescription>
            </CardHeader>
            <CardContent>
              <GalleryText>Content</GalleryText>
            </CardContent>
            <CardFooter>
              <Button size="sm" fullWidth={false} variant="secondary">
                Later
              </Button>
              <Button size="sm" fullWidth={false}>
                Save
              </Button>
            </CardFooter>
          </Card>
        </Section>

        <Section title="Upgrade">
          <UpgradeToProCard onUpgrade={() => setPricingOpen(true)} />
          <UpgradeToProCard collapsed onUpgrade={() => setPricingOpen(true)} />
        </Section>

        <Section title="Overlays and toast">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="secondary">Open dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Rename list</DialogTitle>
                <DialogDescription>Pick a short name.</DialogDescription>
              </DialogHeader>
              <DialogBody>
                <Input placeholder="Name" accessibilityLabel="List name" />
              </DialogBody>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" shadowType="flat" fullWidth={false}>
                    Cancel
                  </Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button
                    shadowType="flat"
                    fullWidth={false}
                    onPress={() => toast.success("Renamed")}
                  >
                    Save
                  </Button>
                </DialogClose>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="secondary">Open alert dialog</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this list?</AlertDialogTitle>
                <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction variant="destructive" onPress={() => toast.error("Deleted")}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <Button variant="secondary" onPress={() => setConfirmOpen(true)}>
            Open confirm dialog
          </Button>
          <ConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            title="Sign out?"
            description="You can sign back in at any time."
            confirmLabel="Sign out"
            variant="destructive"
            onConfirm={() => toast.success("Signed out")}
          />

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="secondary">Open sheet</Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
                <SheetDescription>Narrow the list.</SheetDescription>
              </SheetHeader>
              <LabeledSwitchRow
                label="Done items"
                checked={switchOn}
                onCheckedChange={setSwitchOn}
              />
              <SheetFooter>
                <Button shadowType="flat">Apply</Button>
              </SheetFooter>
            </SheetContent>
          </Sheet>

          <View className="flex-row flex-wrap gap-2">
            <Button size="sm" fullWidth={false} onPress={() => toast.success("Saved")}>
              Success
            </Button>
            <Button size="sm" fullWidth={false} onPress={() => toast.warning("Offline")}>
              Warning
            </Button>
            <Button
              size="sm"
              fullWidth={false}
              onPress={() => {
                const id = toast.loading("Syncing");
                setTimeout(() => toast.success("Synced", { id }), 1500);
              }}
            >
              Loading
            </Button>
            <Button
              size="sm"
              fullWidth={false}
              onPress={() =>
                toast("Archived", {
                  description: "Moved to the archive.",
                  action: { label: "Undo", onPress: () => toast.info("Restored") },
                })
              }
            >
              Action
            </Button>
          </View>
        </Section>

        <Section title="EmptyState">
          <EmptyState title="Nothing yet" description="Items you add show here." compact />
          <EmptyState.Root variant="panel">
            <EmptyState.Icon icon={IconInbox} />
            <EmptyState.Title>No messages</EmptyState.Title>
            <EmptyState.Description>New messages land here.</EmptyState.Description>
          </EmptyState.Root>
        </Section>
      </ScrollView>

      <PricingModal
        open={pricingOpen}
        onClose={() => setPricingOpen(false)}
        title="Upgrade to V Pro"
        apps={["vibot", "verve", "velth", "vmem", "vhub"]}
        currentApp="vibot"
        headline="One plan. Every V app."
        plans={PLANS}
        finePrint="Placeholder prices for the gallery."
        onCheckout={(plan, period) => toast(`${plan.name} (${period})`)}
      />
      <Toaster />
    </View>
  );
}
