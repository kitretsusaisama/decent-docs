Derived from `vitefu`, trimmed to what `getConfig` needs.

This version keeps traversing below framework packages to handle ESM dependencies that reference CJS ones (e.g. `micromark > debug`).