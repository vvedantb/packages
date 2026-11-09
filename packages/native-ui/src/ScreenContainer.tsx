import {
  RefreshControl,
  ScrollView,
  View,
  type RefreshControlProps,
  type ViewProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAccentColor, useLargerText } from "./theme";
import { tabBarReserve } from "./floating";

export interface ScreenContainerProps extends ViewProps {
  children: React.ReactNode;
  reserveTabBar?: boolean;
  footer?: React.ReactNode;
  /** Shows the pull-to-refresh spinner while true. Controlled: no timer, no minimum duration. */
  refreshing?: boolean;
  /** Called on pull. May return a promise. Adds a `RefreshControl` tinted with the accent colour. */
  onRefresh?: () => void | Promise<void>;
  /** Full control. Takes precedence over `refreshing` and `onRefresh`. */
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export function ScreenContainer({
  children,
  reserveTabBar = false,
  footer,
  refreshing = false,
  onRefresh,
  refreshControl,
  ...props
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const largerText = useLargerText();
  const accent = useAccentColor();
  const bottomPad = reserveTabBar
    ? tabBarReserve(largerText, insets.bottom)
    : 40;
  // No control unless the app asks for one.
  const control =
    refreshControl ??
    (onRefresh ? (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={() => void onRefresh()}
        tintColor={accent}
        colors={[accent]}
      />
    ) : undefined);

  return (
    <View className="flex-1 bg-transparent" {...props}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: bottomPad }}
        refreshControl={control}
      >
        <View className="flex-col gap-4 p-4">{children}</View>
        {footer ? <View className="pt-4">{footer}</View> : null}
      </ScrollView>
    </View>
  );
}
