# Changelog

Script to apply patches from [elm-janitor](https://github.com/elm-janitor) by
replacing the official `elm/<package>` packages in the local Elm package cache.

## [Unreleased](https://github.com/elm-janitor/apply-patches/compare/v0.1.2...main)

- Suppress writing console messages about the replaced packages, e.g.
  `❯ elm-janitor-apply-patches --noconsole parser`

## [0.1.2](https://github.com/elm-janitor/apply-patches/compare/v0.1.1...v0.1.2)

- Allow `❯ elm-janitor-apply-patches core` after #1 was fixed.

## [0.1.1](https://github.com/elm-janitor/apply-patches/compare/v0.1.0...v0.1.1) 2023-05-22

- Prohibit `❯ elm-janitor-apply-patches core` until #1 is fixed.

## [0.1.0](https://github.com/elm-janitor/apply-patches/commits/v0.1.0) - 2023-05-22

- Print help text `❯ elm-janitor-apply-patches` or
  `❯ elm-janitor-apply-patches --help`
- Apply one or more patches by passing their names, e.g.
  `❯ elm-janitor-apply-patches parser json`
- Apply all known patches `❯ elm-janitor-apply-patches --all`
- Print used commit hash of all applied patches
  `❯ elm-janitor-apply-patches --status`
- Print status of all known patches
  `❯ elm-janitor-apply-patches --status --verbose`
