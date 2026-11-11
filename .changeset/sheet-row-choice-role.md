---
"@vvedantb/native-ui": minor
---

`SheetRow` with `active` set (`true` or `false`) is one choice of a picker: assistive tech reads it as a `radio` with `checked`, or a `checkbox` with the new `multiple` prop. Without `active` it is an action `button`, as before. The row no longer reports `selected`.
