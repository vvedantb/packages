---
"@vvedantb/native-ui": minor
---

Auth: add `ResetPasswordScreen` (`SignInScreen` with `mode="reset-password"`), the forgot-password flow: email, emailed code, new password typed twice, then signed in. `SignInScreen` takes `forgotPasswordHref` for a "Forgot password?" link. Sign-up now has a confirm-password field: a mismatch blocks the submit and shows under the field. Every password field has the show and hide button.
