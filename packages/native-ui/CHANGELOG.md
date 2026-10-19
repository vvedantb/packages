# Changelog

## 0.2.1

- `exports` now includes `./package.json`, so tools that read `@vvedantb/native-ui/package.json` (Metro, bundlers, version checks) resolve it instead of failing with `ERR_PACKAGE_PATH_NOT_EXPORTED`. The `.` entry is unchanged.
- Adds the `prepack` entry check to the published `package.json` (it already ran in this repository after 0.2.0).
