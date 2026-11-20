---
"@vvedantb/ui": minor
---

Dropdown menus, context menus (and their sub-menus) and popovers grow out of their trigger and shrink back into it, as Dialog does. They start at 40% scale at the Radix transform origin (the trigger, or the cursor for a context menu), opening in 150 ms and closing in 100 ms. The new export `triggerZoomAnimateClass` lets an app reuse it in its own content classes. Hover cards and selects keep their motion.
