---
"@vvedantb/native-ui": patch
---

`WindowLayerHost`: with Reduce Motion (Android "Remove animations") a layer gets no fade at all and shows at once, as the fallback `Modal` does. Before, the context menu and `ImageViewer` layers could stay hidden with animations off.
