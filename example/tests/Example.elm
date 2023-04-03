module Example exposing (..)

import Expect exposing (Expectation)
import Fuzz exposing (Fuzzer, int, list, string)
import Parser
import Test exposing (..)


suite : Test
suite =
    test "Was Parser.deadEndsToString patched?" <|
        \_ ->
            -- See elm-home/0.19.1/packages/elm/parser/1.1.0/src/Parser.elm
            Parser.run Parser.int "abc"
                |> Result.mapError Parser.deadEndsToString
                |> Expect.notEqual (Err "TODO deadEndsToString")
