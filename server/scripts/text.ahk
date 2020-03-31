text = %1%
text := StrReplace(text, "LNBR", "`r")

ClipSaved := ClipboardAll
clipboard := ""
clipboard = %text%
ClipWait, 2
if (!ErrorLevel)
    Send, ^v
Sleep, 150
clipboard := ClipSaved
ClipSaved =

;"According to all known laws of aviation, there is no way a bee should be able to fly.LNBRIts wings are too small to get its fat little body off the ground.LNBRThe bee, of course, flies anywayLNBRbecause bees don't care what humans think is impossible."