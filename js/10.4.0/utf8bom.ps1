# 현재 폴더 및 하위 폴더의 .cpp, .h 파일을 UTF-8 with BOM으로 변환
Get-ChildItem -Recurse -Include *.cpp, *.h | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    $utf8BOM = New-Object System.Text.UTF8Encoding $true
    [System.IO.File]::WriteAllText($_.FullName, $content, $utf8BOM)
}
