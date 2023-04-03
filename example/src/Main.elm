module Main exposing (main)

import Html
import Parser


main =
    Parser.run Parser.int "abc"
        |> Result.mapError Parser.deadEndsToString
        |> print


print any =
    Html.pre [] [ Html.text <| Debug.toString any ]
