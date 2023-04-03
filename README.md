# Apply elm-janitor patches to Elm dependencies

First draft at a script to apply the patches vetted by the
[elm-janitor](https://github.com/elm-janitor).

## Description

The script replaces for every package the `src` dir and also deletes
`artifacts.dat` if it exists. It does not unpack the `examples` dir or other
files that exist in the git branch.

It does not download (yet?) Elm packages that don't exist, because it would also
need to download the `docs.json` file from package.elm-lang.org and also the
License and README.md (I think).

It uses `$ELM_HOME` to find the directory, or defaults to `~/.elm`.\
Note: I guess for Windows, another fallback is needed. I think the default
location is `%appdata%/elm` (local/roaming), but have not tested it.

## Usage

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

This will fail, because it will only print a `TODO deadEndsToString` string.

After that, apply the patches:

```sh
cd deno
deno run --allow-env=ELM_HOME --allow-read=../elm-home --allow-write=../elm-home --allow-net=github.com,codeload.github.com main.ts
cd ..
```

Then re-run the tests or compile the example file to see the output of the
new `deadEndsToString`.
