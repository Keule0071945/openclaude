' Starts the overlay with no console window at all.
' powershell -WindowStyle Hidden still flashes a window for a moment;
' WScript.Shell.Run with intWindowStyle 0 does not.
Dim shell, here
Set shell = CreateObject("WScript.Shell")
here = CreateObject("Scripting.FileSystemObject").GetParentFolderName(WScript.ScriptFullName)
shell.Run "powershell -NoProfile -ExecutionPolicy Bypass -File """ & here & "\notch.ps1""", 0, False
