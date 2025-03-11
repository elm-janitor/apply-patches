# Development

Look into `./deno.jsonc` for the available shortcuts or run `deno task`.

Run `deno task update-deps` to refresh the dependency lock file

## Publish as an npm package

Bump the version number in `./scripts/build_npm.ts` and then execute

```sh
deno task build-npm-package
cd ../npm
npm publish
```
