# Apply elm-janitor patches to Elm dependencies

First draft at a script to apply the patches vetted by the
[elm-janitor](https://github.com/elm-janitor).

## Description

The script can install patches from
[elm-janitor](https://github.com/elm-janitor).

Like the Elm compiler, it uses the environment variable `$ELM_HOME` to find the
cache directory, or defaults to `~/.elm`.

Note: I guess for Windows, another fallback is needed. I think the default
location is `%appdata%/elm` (local/roaming), but have not tested it.

It downloads the release, and unpacks `README.md`, `elm.json`, `LICENSE` and the
contents of the `src/` directory.\
If the package was already present in ELM_HOME, it is fully replaced.

During the first compilation, the Elm compiler creates the `docs.json` and
`artifacts.dat` files.

## Development

I configured `$ELM_HOME` to the local dir

```sh
# fish
set ELM_HOME (pwd)/elm-home
# sh
ELM_HOME=`pwd`/elm-home
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
deno run --allow-env=ELM_HOME --allow-read=../elm-home --allow-write=../elm-home --allow-net=github.com,codeload.github.com main.ts --verbose parser
cd ..
```

Then re-run the tests or compile the example file to see the output of the new
`deadEndsToString`.

## Usage

### When deno is installed (3 options)

**NOTE: These will only work once the repo is public.**

1. Run the script

```
❯ deno run --allow-env=ELM_HOME --allow-read --allow-write --allow-net=github.com,codeload.github.com  https://raw.githubusercontent.com/elm-janitor/apply-patches/main/deno/main.ts
```

2. Install the script

```
❯ deno install --name elm-janitor-apply-patches --allow-env=ELM_HOME --allow-read --allow-write --allow-net=github.com,codeload.github.com https://raw.githubusercontent.com/elm-janitor/apply-patches/main/deno/main.ts

# And uninstall it again
❯ deno uninstall elm-janitor-apply-patches
```

3. Compile a huge binary that contains the deno runtime

```
deno compile --allow-env=ELM_HOME --allow-read --allow-write --allow-net=github.com,codeload.github.com --output elm-janitor-apply-patches https://raw.githubusercontent.com/elm-janitor/apply-patches/main/deno/main.ts
```

### When node is installed

If there ever will be a stable version, use
https://deno.land/manual@v1.32.4/advanced/publishing/dnt to generate a node
module.

### By downloading a binary

If stable versions should ever be created,
[deno compile](https://deno.land/manual@v1.32.4/tools/compiler) can be used on
CI to create huge release binaries.

## Notes

To generate the docs.json file of an Elm package, run
`elm make --docs docs.json`
