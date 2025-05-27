@echo off

REM 0. Generate SWIG binding code
call gen_swig.bat

REM 1. Build C++ native DLL
msbuild src\smartgis_csharp.vcxproj /p:Configuration=Release

REM 2. Build C# projects
dotnet build src\SmartGISharp\SmartGISharp.csproj -c Release
dotnet build src\SmartGISharp.Wpf\SmartGISharp.Wpf.csproj -c Release

REM 3. Copy build outputs to lib folder
xcopy /E /I /Y src\SmartGISharp\bin\Release lib\SmartGISharp
xcopy /E /I /Y src\SmartGISharp.Wpf\bin\Release lib\SmartGISharp.Wpf

echo === Build and copy completed ===
