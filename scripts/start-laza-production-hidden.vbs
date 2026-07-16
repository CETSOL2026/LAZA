Option Explicit

Dim shell, fileSystem, projectRoot, command, exitCode
Set shell = CreateObject("WScript.Shell")
Set fileSystem = CreateObject("Scripting.FileSystemObject")

projectRoot = fileSystem.GetParentFolderName(fileSystem.GetParentFolderName(WScript.ScriptFullName))
shell.CurrentDirectory = projectRoot
command = """C:\Program Files\nodejs\node.exe"" ""server\indicator-api.mjs"""

' Window style 0 keeps the supervised Node process completely hidden.
exitCode = shell.Run(command, 0, True)
WScript.Quit exitCode
