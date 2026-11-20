---
"@vvedantb/native-ui": minor
---

`@vvedantb/native-ui/auth` now uses `@clerk/expo` 4 in place of the deprecated `@clerk/clerk-expo`, and adds `ChangePasswordScreen` and `DeleteAccountScreen`.

**Breaking for apps that use `/auth`:** the peer dependency is now `@clerk/expo` `>=4.0.0`. Remove `@clerk/clerk-expo`, add `@clerk/expo`, and change the app's own imports (see Clerk's Core 3 upgrade guide). Pass `publishableKey` to `AuthProviders`: `@clerk/expo` needs it.

The sign-in, sign-up, reset and second-factor screens keep their behaviour: they use the same hooks from `@clerk/expo/legacy`.

- `ChangePasswordScreen`: current password, then the new one twice, with `user.updatePassword`. No current-password field for an account without a password.
- `DeleteAccountScreen`: type-to-confirm, then `user.delete()`. Needs "Allow users to delete their accounts" turned on in the Clerk dashboard.
