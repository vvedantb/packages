// `@vvedantb/native-ui/tab-bar`. Does not import `expo-router`; reaches
// `expo-blur` and `expo-haptics` only through their optional-peer loaders.
export { FloatingTabBar } from "../FloatingTabBar";
export type { FloatingTabBarProps } from "../FloatingTabBar";
export {
  FLOATING_INSET,
  FLOATING_TAB_BAR_HEIGHT,
  FLOATING_TAB_BAR_HEIGHT_LARGE,
  tabBarReserve,
} from "../floating";
