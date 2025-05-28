%module example

// UTF-8 변환을 위한 csin/csfreearg 타입맵
%typemap(csin) char* %{
  // C# 문자열 -> UTF-8 바이트 배열 변환 (Null 종료 포함)
  byte[] utf8Bytes$csinput = System.Text.Encoding.UTF8.GetBytes($csinput + "\0");
  global::System.IntPtr ptr$csinput = global::System.Runtime.InteropServices.Marshal.AllocHGlobal(utf8Bytes$csinput.Length);
  global::System.Runtime.InteropServices.Marshal.Copy(utf8Bytes$csinput, 0, ptr$csinput, utf8Bytes$csinput.Length);
  ptr$csinput
%}

%typemap(csfreearg) char* %{
  // 할당된 메모리 해제
  if (ptr$csinput != global::System.IntPtr.Zero) {
    global::System.Runtime.InteropServices.Marshal.FreeHGlobal(ptr$csinput);
  }
%}

// C++ 함수 선언
void setText(char* text);
