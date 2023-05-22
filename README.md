# Apply elm-janitor patches to Elm dependencies

The script can install patches from
[elm-janitor](https://github.com/elm-janitor).

## Description

Like the Elm compiler, it uses the environment variable `$ELM_HOME` to find the
cache directory.\
If it is not set, `$HOME/.elm`, `$USERPROFILE/.elm` or `%appdata%\elm` will be
used instead.

It downloads the release, and unpacks `README.md`, `elm.json`, `LICENSE` and the
contents of the `src/` directory.\
If the package was already present in ELM_HOME, it is fully replaced.

During the first compilation, the Elm compiler creates the `docs.json` and
`artifacts.dat` files.

## Usage

There are multiple ways to apply the patches using this script.\
You can clone this repository and follow the
[development instructions](#development), run the script with
[deno](#with-the-deno-runtime), [node.js](#with-nodejs) or
[download a huge binary](#by-downloading-a-binary).

### CLI params and flags

```sh
# Show the help text
elm-janitor-apply-patches --help

# Install all patches
elm-janitor-apply-patches --all

# Install only patch for elm/parser
elm-janitor-apply-patches parser --verbose

# Install a few patches
elm-janitor-apply-patches parser json
```

The flag `--verbose` can be added to most other commands to print more
information.

### With the deno runtime

There are three options when you have [deno](https://deno.land) installed.

1. Run the script (recommended for one-time use)

```
❯ deno run --allow-env=ELM_HOME,HOME --allow-read --allow-write --allow-net=github.com,codeload.github.com,api.github.com  https://raw.githubusercontent.com/elm-janitor/apply-patches/main/deno/cli.ts
```

2. Install the script

```
❯ deno install --name elm-janitor-apply-patches --allow-env=ELM_HOME,HOME --allow-read --allow-write --allow-net=github.com,codeload.github.com,api.github.com https://raw.githubusercontent.com/elm-janitor/apply-patches/main/deno/cli.ts

# And uninstall it again
❯ deno uninstall elm-janitor-apply-patches
```

3. Compile a huge binary that contains the deno runtime

```
deno compile --allow-env=ELM_HOME,HOME --allow-read --allow-write --allow-net=github.com,codeload.github.com,api.github.com --output elm-janitor-apply-patches https://raw.githubusercontent.com/elm-janitor/apply-patches/main/deno/cli.ts
```

### With node.js

If there ever will be a stable version, use
https://deno.land/manual@v1.32.4/advanced/publishing/dnt to generate a node
module.

### By downloading a binary

If stable versions should ever be created,
[deno compile](https://deno.land/manual@v1.32.4/tools/compiler) can be used on
CI to create huge release binaries.

## Verifying the patch

To verify that applying the patch was successful, you can open the file
`elm-janitor-commit.json` inside the package directory (inside ELM_HOME).

Also during runtime, every patch will print a message listing the commit id, for
example:

```
console.info('Using elm-janitor/parser@a61f4ae instead of elm/parser@1.1.0');
```

**Important**: If you have an existing Elm project, it is best to remove the
`elm-stuff` directory after applying the patches to ensure that the new sources
are used and not old cached compiled files are used.

## Development

If you don't want to patch the dependencies used for every other Elm project,
you can configure `$ELM_HOME` to another directory.

```sh
# fish
set ELM_HOME (pwd)/elm-home
# sh
ELM_HOME=`pwd`/elm-home
# Windows CMD.exe
set ELM_HOME=%cd%\elm-home
```

And then let the Elm compiler download the dependencies by starting compilation.

```sh
cd example
# And run the test
elm-test
# OR
elm make src/Main.elm
# and then open the generated `index.html` file
cd ..
```

The test will fail, because it will only print a `TODO deadEndsToString` string.

After that, run the script to apply the patches for `elm/parser` like this:

```sh
cd deno
deno run --allow-env=ELM_HOME --allow-read=../elm-home --allow-write=../elm-home --allow-net=github.com,codeload.github.com,api.github.com cli.ts --verbose parser
cd ..
```

Then re-run the tests or compile the example `src/Main.elm` file to see the
output of the new `deadEndsToString`.

## Notes

If you rely on local documentation, you can also generate the `docs.json` file
of an Elm package by executing `elm make --docs docs.json`
