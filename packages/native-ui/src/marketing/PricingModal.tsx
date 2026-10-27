import type { ReactElement, ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { IconCheck, IconX } from "@tabler/icons-react-native";
import { APP_ICONS, IconProjectV } from "../brand/AppIcons";
import type { ProductAppName } from "../brand/AppWordmark";
import { familyApp } from "../brand/familyApps";
import type { AppName } from "../brand/svg";
import { Button } from "../Button";
import { cn } from "../cn";
import { typeStyle } from "../controlStyles";
import { palette, withAlpha } from "../palette";
import { tokens } from "../tokens";
import { useLargerText } from "../theme";
import { useReduceMotion } from "../useReduceMotion";
import { useScheme } from "../useScheme";
import { useControllableState } from "../primitives/use-controllable-state";
import {
  isEmphasised,
  planAppBenefits,
  planButton,
  sortAppBenefits,
  type PricingModalPeriod,
  type PricingPlan,
} from "./pricing";

export type PricingModalProps = {
  open: boolean;
  /** Called by the close button and Android back (and an iOS swipe-down). */
  onClose: () => void;
  /** Accessible title, read first. Not visible. */
  title: string;
  /** Accessible description. Not visible. */
  description?: string;
  /** Cards, top to bottom. */
  plans: readonly PricingPlan[];
  /** App marks at the top left. */
  apps?: readonly AppName[];
  /** App the modal is shown in. Its `appBenefits` group comes first. */
  currentApp?: ProductAppName;
  /** Centred headline, for example "One plan. Every V app." */
  headline?: ReactNode;
  /** Small print under the cards. */
  finePrint?: ReactNode;
  billingPeriod?: PricingModalPeriod;
  onBillingPeriodChange?: (period: PricingModalPeriod) => void;
  /** Default `"month"`. */
  defaultBillingPeriod?: PricingModalPeriod;
  /** Called by a plan's button. Not called for the `current` plan. Route it to the store's purchase flow. */
  onCheckout?: (plan: PricingPlan, period: PricingModalPeriod) => void;
  /** Wraps each plan's button (the web `renderCheckout`). The button already calls `onCheckout`. Not called for the `current` plan. */
  renderCheckout?: (
    button: ReactElement,
    plan: PricingPlan,
    period: PricingModalPeriod,
  ) => ReactNode;
  /** Called when an app mark is pressed. Without it the marks are not pressable. */
  onAppPress?: (app: AppName, url: string) => void;
  testID?: string;
};

/**
 * Upgrade sheet, the native counterpart of the web `PricingModal` multi-plan
 * layout: a page sheet on iOS (full screen on Android) with a Monthly / Annual
 * switch and stacked plan cards. The web single-plan layout (logo URLs and a
 * Michroma wordmark) is not ported: pass one plan instead.
 */
export function PricingModal({
  open,
  onClose,
  title,
  description,
  plans,
  apps,
  currentApp,
  headline,
  finePrint,
  billingPeriod,
  onBillingPeriodChange,
  defaultBillingPeriod = "month",
  onCheckout,
  renderCheckout,
  onAppPress,
  testID,
}: PricingModalProps) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const insets = useSafeAreaInsets();
  const reduceMotion = useReduceMotion();
  const [period, setPeriod] = useControllableState({
    value: billingPeriod,
    defaultValue: defaultBillingPeriod,
    onChange: onBillingPeriodChange,
  });
  const fg = tokens.color.foreground[scheme];
  const muted = tokens.color.muted[scheme];

  return (
    <Modal
      visible={open}
      animationType={reduceMotion ? "none" : "slide"}
      presentationStyle="pageSheet"
      onRequestClose={onClose}
      testID={testID}
    >
      <View
        className="flex-1"
        style={{
          backgroundColor: tokens.color.background[scheme],
          paddingBottom: insets.bottom,
        }}
      >
        {/* The web `sr-only` DialogTitle: a visually hidden header. */}
        <View
          accessible
          accessibilityRole="header"
          accessibilityLabel={title}
          accessibilityHint={description}
          style={styles.srOnly}
        />
        <View className="flex-row items-center justify-between gap-3 px-4 pb-3 pt-4">
          <View className="flex-row items-center gap-3">
            {apps?.map((app) => {
              const Icon = APP_ICONS[app];
              const { name, url } = familyApp(app);
              return onAppPress ? (
                <Pressable
                  key={app}
                  accessibilityRole="link"
                  accessibilityLabel={name}
                  hitSlop={8}
                  onPress={() => onAppPress(app, url)}
                  className="active:opacity-70"
                >
                  <Icon size={22} color={fg} />
                </Pressable>
              ) : (
                <Icon key={app} size={22} color={fg} title={name} />
              );
            })}
          </View>
          <View className="flex-row items-center gap-2">
            <View
              accessibilityLabel="Billing period"
              className="flex-row rounded-full p-0.5"
              style={{ backgroundColor: palette.surfaceTertiary[scheme] }}
            >
              {(["month", "year"] as const).map((value) => {
                const selected = period === value;
                return (
                  <Pressable
                    key={value}
                    testID={testID ? `${testID}-period-${value}` : undefined}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    hitSlop={6}
                    onPress={() => setPeriod(value)}
                    className="rounded-full px-3 py-1.5"
                    style={selected ? { backgroundColor: palette.segment[scheme] } : null}
                  >
                    <Text
                      className={cn(
                        "font-instrument-sans-medium",
                        largerText ? "text-base" : "text-sm",
                      )}
                      style={[
                        { color: selected ? palette.segmentForeground[scheme] : muted },
                        typeStyle("medium"),
                      ]}
                    >
                      {value === "month" ? "Monthly" : "Annual"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              testID={testID ? `${testID}-close` : undefined}
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={8}
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full active:opacity-70"
            >
              <IconX size={22} color={muted} />
            </Pressable>
          </View>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-3 px-4 pb-6"
          showsVerticalScrollIndicator={false}
        >
          {headline ? (
            <Text
              className={cn(
                "pb-2 text-center font-instrument-sans-medium",
                largerText ? "text-3xl" : "text-2xl",
              )}
              style={[{ color: fg }, typeStyle("medium")]}
            >
              {headline}
            </Text>
          ) : null}

          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              period={period}
              currentApp={currentApp}
              onCheckout={onCheckout}
              renderCheckout={renderCheckout}
            />
          ))}

          {finePrint ? (
            <Text className="px-1 pt-1 font-instrument-sans text-sm" style={{ color: muted }}>
              {finePrint}
            </Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}

function PlanCard({
  plan,
  period,
  currentApp,
  onCheckout,
  renderCheckout,
}: {
  plan: PricingPlan;
  period: PricingModalPeriod;
  currentApp?: ProductAppName;
  onCheckout: PricingModalProps["onCheckout"];
  renderCheckout: PricingModalProps["renderCheckout"];
}) {
  const scheme = useScheme();
  const largerText = useLargerText();
  const fg = tokens.color.foreground[scheme];
  const muted = tokens.color.muted[scheme];
  const separator = tokens.color.separator[scheme];
  const emphasised = isEmphasised(plan);
  const appBenefits = planAppBenefits(plan);
  const cta = planButton(plan);
  const bodyText = largerText ? "text-lg" : "text-base";

  const button = (
    <Button
      variant={cta.variant}
      disabled={cta.disabled}
      shadowType="flat"
      onPress={() => onCheckout?.(plan, period)}
    >
      {cta.label}
    </Button>
  );

  return (
    <View
      className="p-5"
      style={{
        borderRadius: tokens.radius.card,
        borderWidth: 1,
        borderColor: emphasised ? withAlpha(fg, 0.25) : separator,
        backgroundColor: tokens.color.surfaceSecondary[scheme],
      }}
    >
      <View className="flex-row items-center gap-2">
        {emphasised ? <IconProjectV size={16} color={fg} /> : null}
        <Text
          accessibilityRole="header"
          className={cn("font-instrument-sans-medium", bodyText)}
          style={[{ color: fg }, typeStyle("medium")]}
        >
          {plan.name}
        </Text>
      </View>

      <View className="mt-4 flex-row items-baseline gap-1">
        <Text
          className="font-instrument-sans-medium"
          style={[
            {
              color: fg,
              fontSize: 48,
              lineHeight: 52,
              letterSpacing: -0.5,
              fontVariant: ["tabular-nums"],
            },
            typeStyle("medium"),
          ]}
        >
          {plan.price[period]}
        </Text>
        <Text className={cn("font-instrument-sans", bodyText)} style={{ color: muted }}>
          {plan.periodSuffix ?? "/month"}
        </Text>
      </View>

      <View className="mt-5">
        {plan.current || !renderCheckout ? button : renderCheckout(button, plan, period)}
      </View>

      {plan.intro ? (
        <Text className={cn("mt-6 font-instrument-sans", bodyText)} style={{ color: muted }}>
          {plan.intro}
        </Text>
      ) : null}

      {plan.highlight ? (
        <View className="mt-3">
          <Text
            className="font-instrument-sans-medium text-2xl"
            style={[{ color: fg }, typeStyle("medium")]}
          >
            {plan.highlight.title}
          </Text>
          <Text className={cn("font-instrument-sans", bodyText)} style={{ color: fg }}>
            {plan.highlight.description}
          </Text>
        </View>
      ) : null}

      {plan.benefits?.length ? (
        <View
          className="mt-5 gap-2.5 pt-4"
          style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separator }}
        >
          {plan.benefits.map((benefit, index) => {
            const BenefitIcon =
              benefit.icon && benefit.icon !== "check" ? APP_ICONS[benefit.icon] : null;
            return (
              <View key={index} className="flex-row items-start gap-2.5">
                <View className="mt-1 h-4 w-5 items-center justify-center">
                  {BenefitIcon ? (
                    <BenefitIcon size={14} color={benefit.muted ? muted : fg} />
                  ) : (
                    <IconCheck size={16} stroke={2} color={benefit.muted ? muted : fg} />
                  )}
                </View>
                <Text
                  className={cn("min-w-0 flex-1 font-instrument-sans", bodyText)}
                  style={{ color: benefit.muted ? muted : fg }}
                >
                  {benefit.label}
                </Text>
              </View>
            );
          })}
        </View>
      ) : null}

      {appBenefits?.length ? (
        <View
          className="mt-4 gap-3 pt-3"
          style={{ borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: separator }}
        >
          {sortAppBenefits(appBenefits, currentApp).map((group) => {
            const GroupIcon = APP_ICONS[group.app];
            return (
              <View key={group.app}>
                <View className="flex-row items-center gap-2">
                  <GroupIcon size={14} color={fg} />
                  <Text
                    className="font-instrument-sans-medium text-sm"
                    style={[{ color: fg }, typeStyle("medium")]}
                  >
                    {familyApp(group.app).name}
                  </Text>
                </View>
                <View className="mt-1 gap-0.5 pl-[22px]">
                  {group.items.map((item, index) => (
                    <Text
                      key={index}
                      className={cn("font-instrument-sans", bodyText)}
                      style={{ color: fg }}
                    >
                      {item}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
