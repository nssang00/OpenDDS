using System;

class Program
{
    public static uint RGBA(byte r, byte g, byte b, byte a)
    {
        return (uint)(
            ((int)r) |
            ((int)g << 8) |
            ((int)b << 16) |
            ((int)a << 24)
        );
    }

    static void Main()
    {
        uint color = RGBA(255, 128, 64, 200);
        Console.WriteLine($"{color:X8}"); // C84080FF 출력
    }
}

///////

%module example

/* ───────────── 입력 전용 UTF-8 typemap (pre/post 활용) ───────────── */
%typemap(cstype) char *UTF8        "string"
%typemap(cstype) const char *UTF8  "string"

/* pre: 래퍼 메서드 맨 위에서 실행 ─ 변수 선언용
 * body: 인코딩‧할당 및 C 쪽 인자 값 설정
 * post: 네이티브 함수 호출 **직후** 실행 ─ 버퍼 해제
 */
%typemap(csin,
         pre="System.IntPtr ptr$argnum = System.IntPtr.Zero;",
         post="if (ptr$argnum != System.IntPtr.Zero) System.Runtime.InteropServices.Marshal.FreeHGlobal(ptr$argnum);")
         char *UTF8
%{
    if ($csinput != null) {
        byte[] utf8Bytes = System.Text.Encoding.UTF8.GetBytes($csinput);
        ptr$argnum = System.Runtime.InteropServices.Marshal.AllocHGlobal(utf8Bytes.Length + 1);

        System.Runtime.InteropServices.Marshal.Copy(utf8Bytes, 0, ptr$argnum, utf8Bytes.Length);
        System.Runtime.InteropServices.Marshal.WriteByte(ptr$argnum, utf8Bytes.Length, 0);  /* null 종료 */
        $1 = (char*)ptr$argnum.ToPointer();
    } else {
        $1 = (char*)System.IntPtr.Zero.ToPointer();
    }
%}

/* 적용 */
%apply char *UTF8 { char *text, const char *text };

/* C++ 함수 예시 */
%inline %{
void setText(const char *text) { /* … */ }
%}
