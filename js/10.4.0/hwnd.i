%module MyModule
%{
#include <windows.h>
#include "myheader.h" // HWND를 사용하는 헤더 파일
%}

typedef struct tagPOINT {
    LONG x;
    LONG y;
} POINT;

typedef void *HWND;
typedef void *HINSTANCE;
%apply void *VOID_INT_PTR { void * };

%include "example.h"//%template보다는 뒤에 
void Window(HWND hwnd); // 변환하려는 함수

