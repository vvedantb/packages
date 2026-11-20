---
"@vvedantb/native-ui": minor
---

`@vvedantb/native-ui/auth`: sign-in, sign-up, reset password and second factor now use the `useSignIn` and `useSignUp` hooks from the root of `@clerk/expo`. The import of `@clerk/expo/legacy` is gone. Screen props, `testID`s, copy and error messages are the same, so apps need no code change. The `@clerk/expo` peer range is now `>=4.16.0`.

Two things differ underneath. The second-factor code by SMS or email is sent with no explicit phone number or email id: Clerk uses the one on the sign-in. A password reset passes `signOutOfOtherSessions: false`, which keeps other sessions signed in as before.
