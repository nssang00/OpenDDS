%module MyModule
%{
#include <windows.h>
#include "myheader.h" // HWND를 사용하는 헤더 파일
%}

%typemap(cstype) HWND "IntPtr" // C#에서 HWND를 IntPtr로 처리
%typemap(imtype) HWND "IntPtr" // 중간 코드에서도 IntPtr 사용
%typemap(csin) HWND "$csinput" // C#에서 전달된 IntPtr를 그대로 사용

void Window(HWND hwnd); // 변환하려는 함수


%typemap(ctype)  HWND "void*"
%typemap(imtype) HWND "System.IntPtr"
%typemap(cstype) HWND "System.IntPtr"
%typemap(in)     HWND %{ $1 = (HWND)$input; %}
%typemap(out)    HWND %{ $result = (void*)$1; %}
