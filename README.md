# Apply elm-janitor patches to Elm dependencies
First draft at a script to apply the patches vetted by the [elm-janitor](https://github.com/elm-janitor).
## Usage

I configured `$ELM_HOME` to the local dir

```sh
# fish
set ELM_HOME (pwd)/elm-home
# sh
ELM_HOME=`pwd`/elm-home
```

And then used default Elm packages

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
