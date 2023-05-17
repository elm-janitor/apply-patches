import * as fs from "https://deno.land/std@0.182.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.182.0/path/mod.ts";
import { Untar } from "https://deno.land/std@0.182.0/archive/untar.ts";
import { parse } from "https://deno.land/std@0.187.0/flags/mod.ts";
import {
  copy,
  readerFromStreamReader,
} from "https://deno.land/std@0.182.0/streams/mod.ts";

const knownPatches: Record<string, string[]> = {
  "bytes": ["1.0.8"],
  "browser": ["1.0.2"],
  // "core": ["1.0.5"], // TODO fails to compile
  "file": ["1.0.5"],
  "http": ["2.0.0"],
  "json": ["1.1.3"],
  "parser": ["1.1.0"],
  "project-metadata-utils": ["1.0.2"],
  "random": ["1.0.0"],
  "time": ["1.0.0"],
  "virtual-dom": [], // TODO
};

interface InstallPatch {
  elmHomeDir: string;
  pkg: string;
  verbose: boolean;
}

export async function installPatch(
  { elmHomeDir, pkg, verbose }: InstallPatch,
): Promise<void> {
  const versions = knownPatches[pkg];
  if (!versions || versions.length === 0) {
    const err = `I don't know how to patch elm/${pkg}.`;
    console.error(err);
    throw new Error(err);
  }
  const version = versions[versions.length - 1];
  console.log(`Trying to install elm-janitor/${pkg} v${version}`);
  const elmPkgDir = path.join(elmHomeDir, "0.19.1/packages/elm");
  const dir = path.join(elmPkgDir, pkg, version);
  await fs.emptyDir(dir);
  if (verbose) console.log(`Created empty directory '${dir}'.`);

  const branch = `stack-${version}`;
  await saveCommitHash({ pkg, branch, dir });
  await downloadPatch({ pkg, branch, dir, verbose, version });
  console.log("Done.");
}

interface SaveCommitHash {
  pkg: string;
  branch: string;
  dir: string;
}

async function saveCommitHash({ pkg, branch, dir }: SaveCommitHash) {
  const url =
    `https://api.github.com/repos/elm-janitor/${pkg}/commits/${branch}`;
  const json = await (await fetch(url)).json();
  const hash: string = json.sha;

  if (hash) console.log(`Commit ${hash}`);

  await Deno.writeTextFile(
    path.join(dir, "elm-janitor-commit.json"),
    JSON.stringify(json),
  );
  return hash;
}

interface DownloadPatch {
  pkg: string;
  branch: string;
  dir: string;
  verbose: boolean;
  version: string;
}

async function downloadPatch(
  { pkg, branch, dir, verbose, version }: DownloadPatch,
) {
  console.log("Downloading");
  const url = `https://github.com/elm-janitor/${pkg}/archive/${branch}.tar.gz`;
  const res = await fetch(url);
  if (res.status !== 200) {
    throw `Got status ${res.status} when trying to download ${url}`;
  }
  if (!res.body) {
    throw `Empty body of ${url}`;
  }

  // const dl = path.join(outDir, `${pkg.name}_${version}.tar.gz`);
  // const file = await Deno.open(dl, {create: true, write: true })
  // res.body.pipeTo(file.writable)

  const streamed = res.body.pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const reader = readerFromStreamReader(streamed);
  await unpack({ pkg, branch, dir: dir, reader, verbose, version });
}

interface Unpack {
  pkg: string;
  branch: string;
  dir: string;
  reader: Deno.Reader;
  verbose: boolean;
  version: string;
}

async function unpack(
  { pkg, branch, dir, reader, verbose, version }: Unpack,
) {
  // github creates a dir like `parser-stack-1.1.0`
  const drop = `${pkg}-${branch}`;
  const trimFileName = (fileName: string) =>
    fileName.substring(drop.length + 1);
  const outputFileName = (fileName: string) =>
    path.join(dir, trimFileName(fileName));

  const untar = new Untar(reader);
  for await (const entry of untar) {
    if (
      entry.fileName === `${drop}/elm.json` ||
      entry.fileName === `${drop}/LICENSE` ||
      entry.fileName === `${drop}/README.md` ||
      entry.fileName.startsWith(`${drop}/src`)
    ) {
      if (verbose) {
        console.log(`  Unpacking: ${entry.fileName}`);
      }
      switch (entry.type) {
        case "directory": {
          await fs.ensureDir(outputFileName(entry.fileName));
          break;
        }
        case "file": {
          const out = outputFileName(entry.fileName);
          const writer = await Deno.open(out, {
            create: true,
            write: true,
          });
          await copy(entry, writer);
          if (entry.fileName.endsWith(".js")) {
            const encoder = new TextEncoder();
            const str =
              `Using patched elm-janitor/${pkg} instead of elm/${pkg}@${version}`;
            const data = encoder.encode(`console.info('${str}');\n`);
            writer.writeSync(data);
          }
          writer.close();
          break;
        }
      }
    } else {
      if (verbose) {
        console.log(`  Ignoring: ${entry.fileName}`);
      }
    }
  }
}

function findElmHome(): string {
  // TODO find out if Windows uses `%appdata%/elm` or `%localappdata%/elm`
  const elmHome = Deno.env.get("ELM_HOME") || "~/.elm";
  return elmHome;
}

function printHelp() {
  console.log("To install one or more of the patched Elm packages from");
  console.log("https://github.com/elm-janitor");
  console.log("you need to pass its name.\n");
  console.log("For example");
  console.log("❯ elm-janitor-apply-patches parser");
  console.log("");
}

if (import.meta.main) {
  const elmHomeDir = findElmHome();
  console.log(`Working with ELM_HOME '${elmHomeDir}'.`);

  const flags = parse(Deno.args, {
    boolean: ["help", "verbose"],
  });

  if (flags.help) {
    printHelp();
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
}
