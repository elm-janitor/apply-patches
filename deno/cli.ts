import { Flags } from "./deps.ts";
import { findElmHome, getStatus, installPatch, knownPatches } from "./mod.ts";

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
  console.log("To check if (and which) patches were applied, run");
  console.log("❯ elm-janitor-apply-patches --status");
  console.log("");
  console.log("You can pass `--verbose` to increase log output.");
}

async function printStatus(elmHomeDir: string, verbose: boolean) {
  const allPackages = await getStatus(elmHomeDir);
  const filteredPackages = allPackages.filter(([_key, value]) => !!value);
  const count = filteredPackages.length;
  let msg = "";
  switch (count) {
    case 0:
      msg = "No Elm package was patched";
      break;
    case 1:
      msg = "One Elm package is patched";
      break;
    default:
      msg = `${count} Elm packages are patched`;
  }
  console.log(`${msg} with \`elm-janitor-apply-patches\`.`);
  const list = verbose ? allPackages : filteredPackages;
  for (const [pkg, commit] of list) {
    console.log(`  ${pkg}: ${commit ?? "not patched"}`);
  }
}

async function installAllPatches(elmHomeDir: string, verbose: boolean) {
  for (const pkg of Object.keys(knownPatches)) {
    console.log("");
    await installPatch({ elmHomeDir, pkg, verbose });
  }
}

async function installPatches(
  elmHomeDir: string,
  pkgs: Array<string>,
  verbose: boolean,
) {
  pkgs.forEach((pkg: string) => {
    if (!knownPatches[pkg]) {
      console.error(`I don't know how to patch package 'elm/${pkg}'.`);
      console.error("Will quit now.");
      Deno.exit(1);
    }
  });

  for (const pkg of pkgs) {
    console.log("");
    await installPatch({ elmHomeDir, pkg, verbose });
  }
}

const elmHomeDir = findElmHome();
console.log(`Working with ELM_HOME '${elmHomeDir}'.`);

const flags = Flags(Deno.args, {
  boolean: ["all", "help", "status", "verbose"],
});

if (flags.help) {
  printHelp();
} else if (flags.status) {
  await printStatus(elmHomeDir, flags.verbose);
} else if (flags.all) {
  await installAllPatches(elmHomeDir, flags.verbose);
} else if (Array.isArray(flags._) && flags._.length > 0) {
  const pkgs = flags._.filter((f: string | number) =>
    typeof f === "string"
  ) as string[];
  await installPatches(elmHomeDir, pkgs, flags.verbose);
} else {
  printHelp();
}
