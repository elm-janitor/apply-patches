import { fs, isWindows, path, streams, Untar } from "./deps.ts";

export const knownPatches: Readonly<Record<string, string[]>> = {
  "bytes": ["1.0.8"],
  "browser": ["1.0.2"],
  "core": ["1.0.5"],
  "file": ["1.0.5"],
  "http": ["2.0.0"],
  "json": ["1.1.3"],
  "parser": ["1.1.0"],
  "project-metadata-utils": ["1.0.2"],
  "random": ["1.0.0"],
  "time": ["1.0.0"],
  // "virtual-dom": [], // TODO
};

const ELM_JANITOR_COMMIT_FILE = "elm-janitor-commit.json";

function baseElmPackagesDir(elmHomeDir: string) {
  return path.join(elmHomeDir, "0.19.1/packages/elm");
}

export interface InstallPatch {
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
  const elmPkgDir = baseElmPackagesDir(elmHomeDir);
  const dir = path.join(elmPkgDir, pkg, version);
  await fs.emptyDir(dir);
  if (verbose) console.log(`Created empty directory '${dir}'.`);

  const branch = `stack-${version}`;
  const hash = await saveCommitHash({ pkg, branch, dir });
  await downloadPatch({ pkg, branch, dir, hash, verbose, version });
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
    path.join(dir, ELM_JANITOR_COMMIT_FILE),
    JSON.stringify(json),
  );
  return hash.substring(0, 7);
}

interface DownloadPatch {
  pkg: string;
  branch: string;
  dir: string;
  hash: string;
  verbose: boolean;
  version: string;
}

async function downloadPatch(
  { pkg, branch, dir, hash, verbose, version }: DownloadPatch,
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
  const reader = streams.readerFromStreamReader(streamed);
  await unpack({ pkg, branch, dir, hash, reader, verbose, version });
}

interface Unpack {
  pkg: string;
  branch: string;
  dir: string;
  hash: string;
  reader: Deno.Reader;
  verbose: boolean;
  version: string;
}

async function unpack(
  { pkg, branch, dir, hash, reader, verbose, version }: Unpack,
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
          await streams.copy(entry, writer);
          if (entry.fileName.endsWith(".js")) {
            const encoder = new TextEncoder();
            const str =
              `Using elm-janitor/${pkg}@${hash} instead of elm/${pkg}@${version}`;
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

export function findElmHome(): string {
  const elmHome = Deno.env.get("ELM_HOME");
  if (elmHome) return elmHome;

  const home = Deno.env.get("HOME") ?? Deno.env.get("USERPROFILE");
  if (!home) {
    throw new Error("Could not find the user's home directory");
  }
  if (isWindows) {
    // Deno cannot resolve `%appdata%\elm`
    return path.join(home, "AppData/Roaming/elm");
  } else {
    return path.join(home, ".elm");
  }
}

export type Status = Array<[string, string | undefined]>;

export async function getStatus(
  elmHomeDir: string,
): Promise<Status> {
  const result: Status = [];
  const baseDir = baseElmPackagesDir(elmHomeDir);
  for (const [pkgName, versions] of Object.entries(knownPatches)) {
    for (const version of versions) {
      const file = path.join(
        baseDir,
        pkgName,
        version,
        ELM_JANITOR_COMMIT_FILE,
      );
      const json: Record<string, unknown> | undefined = await Deno.readTextFile(
        file,
      )
        .then((raw) => JSON.parse(raw) as Record<string, unknown>)
        .catch(() => undefined);

      const key = `${pkgName}@${version}`;
      if (json && json.sha && typeof json.sha === "string") {
        result.push([key, json.sha]);
      } else {
        result.push([key, undefined]);
      }
    }
  }
  return result;
}
