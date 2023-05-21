module TestChar exposing (..)

import Char
import Expect exposing (Expectation)
import Fuzz exposing (Fuzzer, int, list, string)
import Test exposing (..)


suite : Test
suite =
    describe "Changes with https://github.com/elm/core/pull/970"
        [ verify "Char.isUpper" Char.isUpper 'Σ' True
        , verify "Char.isLower" Char.isLower 'π' True
        ]


before : Test
before =
    describe "Same behavior as before"
        [ describe "Char.isUpper" unchangedIsUpper
        , describe "Char.isLower" unchangedIsLower
        ]


unchangedIsUpper : List Test
unchangedIsUpper =
    [ ( 'A', True )
    , ( 'B', True )
    , ( 'Z', True )
    , ( '0', False )
    , ( 'a', False )
    , ( '-', False )
    ]
        |> verifyList "Char.isUpper" Char.isUpper


unchangedIsLower : List Test
unchangedIsLower =
    [ ( 'a', True )
    , ( 'b', True )
    , ( 'z', True )
    , ( '0', False )
    , ( 'A', False )
    , ( '-', False )
    ]
        |> verifyList "Char.isLower" Char.isLower


verifyList : String -> (a -> b) -> List ( a, b ) -> List Test
verifyList fnName fn list =
    List.map (\( input, expected ) -> verify fnName fn input expected) list


verify : String -> (a -> b) -> a -> b -> Test
verify fnName fn input expected =
    test ("Expected " ++ fnName ++ " " ++ Debug.toString input ++ " == " ++ Debug.toString expected) <|
        \_ ->
            fn input |> Expect.equal expected
