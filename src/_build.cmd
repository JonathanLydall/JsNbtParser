@echo off
setlocal
cls
set projectPath=C:\Users\Jonathan Lydall\My Documents\Aptana Studio 3 Workspace\JsNbtParser
set jsFileList_Relative=src\_fileList.txt
set jsTempFile_Relative=src\_build.temp
set jsDestFile_Relative=bin\JsNbtParser-min.js
set javaBin="C:\Program Files (x86)\Java\jre6\bin\java.exe"
set yuiJarFile="C:\Utils\YUIC\build\yuicompressor-2.4.6.jar"

set   jsFileList="%projectPath%\%jsFileList_Relative%"
set   jsTempFile="%projectPath%\%jsTempFile_Relative%"
set   jsDestFile="%projectPath%\%jsDestFile_Relative%"

echo ProjectPath set to "%projectPath%\".
echo Deleting old temporary file...
del %jsTempFile%
echo Merging the following files into temporary file "\%jsTempFile_Relative%":
for /F "usebackq eol=;" %%i in (%jsFileList%) do (
	echo ; >> %jsTempFile%
	type "%projectPath%\%%i" >> %jsTempFile%
	echo   %%i...
)
echo Running YUI minifier to output file "\%jsDestFile_Relative%"...
%javaBin% -jar %yuiJarFile% %jsTempFile% -o %jsDestFile% --type js
echo End of batch file.
pause