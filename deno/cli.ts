import { Flags } from "./deps.ts";
import { findElmHome, installPatch, knownPatches } from "./main.ts";

function printHelp() {
  console.log("To install one or more of the patched Elm packages from");
  console.log("https://github.com/elm-janitor");
  console.log("you need to pass its name.\n");
  console.log("For example");
  console.log("❯ elm-janitor-apply-patches parser");
  console.log("");
  console.log("If you want to apply all patches, run");
  console.log("❯ elm-janitor-apply-patches --all");
  console.log("");
  console.log("You can pass `--verbose` to increase log output.");
}

const elmHomeDir = findElmHome();
console.log(`Working with ELM_HOME '${elmHomeDir}'.`);

const flags = Flags(Deno.args, {
  boolean: ["all", "help", "verbose"],
});

if (flags.help) {
  printHelp();
} else if (flags.all) {
  for (const pkg of Object.keys(knownPatches)) {
    console.log("");
    await installPatch({ elmHomeDir, pkg, verbose: flags.verbose });
  }
} else if (Array.isArray(flags._) && flags._.length > 0) {
  flags._.forEach((pkg: string | number) => {
    if (typeof pkg !== "string" || !knownPatches[pkg]) {
      console.error(`I don't know how to patch package 'elm/${pkg}'.`);
      console.error("Will quit now.");
      Deno.exit(1);
    }
  });

  for (const pkg of flags._) {
    console.log("");
    await installPatch({
      elmHomeDir,
      pkg: pkg as string,
      verbose: flags.verbose,
    });
  }
} else {
  printHelp();
}
