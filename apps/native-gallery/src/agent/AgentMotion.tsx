// Best effort for Reanimated. Reanimated 4 runs worklet animations on the UI
// runtime, which the JS clock cannot step, so agent builds ask it to skip them.
import { ReduceMotion, ReducedMotionConfig } from "react-native-reanimated";

export function AgentMotion() {
  return <ReducedMotionConfig mode={ReduceMotion.Always} />;
}
