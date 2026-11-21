---
"@vvedantb/ui": patch
---

`@vvedantb/ui/tokens` now imports `css/tabs.css`. Without it, the rail trough pill sits in the normal flow and pushes the rail tiles down. Apps that import `tabs.css` themselves still work.
