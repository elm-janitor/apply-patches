import { build, emptyDir } from "https://deno.land/x/dnt@0.35.0/mod.ts";
import { path } from "../deps.ts";

const outDir = "../npm";
await emptyDir(outDir);

await build({
  entryPoints: [{
    kind: "bin",
    name: "elm-janitor-apply-patches",
    path: "./cli.ts",
  }],
  outDir,
  shims: {
    // see JS docs for overview and more options
    deno: true,
  },
  typeCheck: false,
  test: false,
  declaration: false,
  scriptModule: false,
  package: {
    // package.json properties
    name: "elm-janitor-apply-patches",
    version: "0.1.2",
    description: "Script to apply the elm-janitor patches to ELM_HOME.",
    license: "UNLICENSE",
    repository: {
      type: "git",
      url: "git+https://github.com/elm-janitor/apply-patches.git",
    },
    bugs: {
      url: "https://github.com/elm-janitor/apply-patches/issues",
    },
  },
  postBuild() {
    // steps to run after building and before running the tests
    Deno.copyFileSync("../UNLICENSE", path.join(outDir, "UNLICENSE"));
    Deno.copyFileSync("../README.md", path.join(outDir, "README.md"));
  },
});
