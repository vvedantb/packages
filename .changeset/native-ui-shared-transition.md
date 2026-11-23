---
"@vvedantb/native-ui": minor
---

Add shared element transitions: `SharedTransitionView`, `SharedTransitionText`, `useSharedTransitionStyle`, `createSharedTransition`, `DEFAULT_SHARED_TRANSITION` and `sharedTransitionTag`. The default is a 450 ms critically damped spring with `fadeContent`, and it follows the system Reduce Motion setting: with Reduce Motion on, the wrappers render a plain `View` or `Text` and the screens change with no shared move. The helper uses `SharedTransition.fadeContent`, so it needs `react-native-reanimated` 4.8 or later (the peer range is still `*`). This repository now tests on 4.8.0 with `react-native-worklets` 0.14.0.
