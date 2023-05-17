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

export async function patchCachedElmDependencies(elmHomeDir: string) {
  console.log(`Trying to patch Elm dependencies in '${elmHomeDir}'`);
  const patched: string[] = [];

  const elmPkgDir = path.join(elmHomeDir, "0.19.1/packages/elm");
  for await (const pkg of Deno.readDir(elmPkgDir)) {
    if (!pkg.isDirectory) continue;
    const known = knownPatches[pkg.name];
    if (!known) continue;
    for await (const version of known) {
      const versionDir = path.join(elmPkgDir, pkg.name, version);
      if (!(await fs.exists(versionDir))) {
        continue;
      }
      console.log(`Trying to patch elm/${pkg.name} v${version}`);
      const branch = `stack-${version}`;
      const url =
        `https://github.com/elm-janitor/${pkg.name}/archive/${branch}.tar.gz`;
      const res = await fetch(url);
      if (res.status !== 200) {
        throw `Got status ${res.status} when trying to download ${url}`;
      }
      if (!res.body) throw `Empty body of ${url}`;

      // const dl = path.join(outDir, `${pkg.name}_${version}.tar.gz`);
      // const file = await Deno.open(dl, {create: true, write: true })
      // res.body.pipeTo(file.writable)

      const streamed = res.body.pipeThrough(new DecompressionStream("gzip"))
        .getReader();
      const reader = readerFromStreamReader(streamed);
      // github creates a dir like `parser-stack-1.1.0`
      const drop = `${pkg.name}-${branch}`;
      const trimFileName = (fileName: string) =>
        fileName.substring(drop.length + 1);
      const outputFileName = (fileName: string) =>
        path.join(versionDir, trimFileName(fileName));

      const untar = new Untar(reader);
      for await (const entry of untar) {
        // We are only interested in the `src` files. The docs.json was not created for our patch,
        // and elm.json, License and README.md already exists.
        if (entry.fileName.startsWith(`${drop}/src`)) {
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
                  `Using patched elm-janitor/${pkg.name} instead of elm/${pkg.name}@${version}`;
                const data = encoder.encode(`console.info('${str}');\n`);
                writer.writeSync(data);
              }
              patched.push(out);
              break;
            }
          }
        }
      }

      // After overwriting the `src/...` files, we must delete the old compilation artifacts
      await Deno.remove(path.join(versionDir, "artifacts.dat"))
        .then(() => {
          console.log("Removed the artifacts.dat");
        })
        .catch((err) => {
          if (err instanceof Deno.errors.NotFound) return;
          else throw err;
        });
      console.log("Success.\n");
    }
  }
  console.log("DONE.");

  console.log(
    "patched files:",
    patched.map((f) => path.relative(elmPkgDir, f)),
  );
}

export async function installPatch(
  elmHomeDir: string,
  pkg: string,
): Promise<void> {
  const versions = knownPatches[pkg];
  if (!versions || versions.length === 0) {
    const err = `I don't know how to patch elm/${pkg}.`;
    console.error(err);
    throw new Error(err);
  }
  const version = versions[versions.length - 1];
  console.log(
    `Trying to install elm-janitor/${pkg} v${version} in '${elmHomeDir}'`,
  );
  const elmPkgDir = path.join(elmHomeDir, "0.19.1/packages/elm");
  const versionDir = path.join(elmPkgDir, pkg, version);
  await fs.emptyDir(versionDir);
  console.log(`Created empty directory '${versionDir}'.`);

  const branch = `stack-${version}`;
  const url = `https://github.com/elm-janitor/${pkg}/archive/${branch}.tar.gz`;
  const res = await fetch(url);
  if (res.status !== 200) {
    throw `Got status ${res.status} when trying to download ${url}`;
  }
  if (!res.body) throw `Empty body of ${url}`;

  // const dl = path.join(outDir, `${pkg.name}_${version}.tar.gz`);
  // const file = await Deno.open(dl, {create: true, write: true })
  // res.body.pipeTo(file.writable)

  const streamed = res.body.pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const reader = readerFromStreamReader(streamed);
  // github creates a dir like `parser-stack-1.1.0`
  const drop = `${pkg}-${branch}`;
  const trimFileName = (fileName: string) =>
    fileName.substring(drop.length + 1);
  const outputFileName = (fileName: string) =>
    path.join(versionDir, trimFileName(fileName));

  const unpacked: string[] = [];
  const untar = new Untar(reader);
  for await (const entry of untar) {
    if (
      entry.fileName === `${drop}/elm.json` ||
      entry.fileName === `${drop}/LICENSE` ||
      entry.fileName === `${drop}/README.md` ||
      entry.fileName.startsWith(`${drop}/src`)
    ) {
      console.log(`  Unpacking: ${entry.fileName}`);
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
          unpacked.push(out);
          break;
        }
      }
    } else {
      console.log(`  Ignoring: ${entry.fileName}`);
    }
  }
}

function findElmHome(): string {
  // TODO find out if Windows uses `%appdata%/elm` or `%localappdata%/elm`
  const elmHome = Deno.env.get("ELM_HOME") || "~/.elm";
  return elmHome;
}

if (import.meta.main) {
  const elmHome = findElmHome();
  console.log(`Working with ELM_HOME '${elmHome}'.`);
  // await patchCachedElmDependencies(elmHome);
  await installPatch(elmHome, "parser");
}
