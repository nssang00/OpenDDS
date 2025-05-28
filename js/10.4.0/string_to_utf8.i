%module example


%typemap(cstype)            char *UTF8        "string"
%typemap(cstype)            const char *UTF8  "string"
%typemap(csin, noblock=1)   char *UTF8
%{
    if ($csinput == null) {
        $1 = System.IntPtr.Zero;
    } else {
        byte[] utf8Bytes = System.Text.Encoding.UTF8.GetBytes($csinput);
        System.IntPtr buf  = System.Runtime.InteropServices.Marshal.AllocHGlobal(utf8Bytes.Length + 1);

        System.Runtime.InteropServices.Marshal.Copy(utf8Bytes, 0, buf, utf8Bytes.Length);
        System.Runtime.InteropServices.Marshal.WriteByte(buf, utf8Bytes.Length, 0); 

        $1 = (char*)buf.ToPointer();   /* C 함수에 넘길 포인터 */
    }
%}

%typemap(csfreearg)         char *UTF8
%{
    if ($1 != System.IntPtr.Zero) {
        System.Runtime.InteropServices.Marshal.FreeHGlobal($1);
    }
%}

%apply char *UTF8 { char *text, const char *text };

/************************************************************
 * C++ API 선언 (예시)
 ************************************************************/
%inline %{
void setText(const char *text) {
    /* text 는 UTF-8, null-terminated */
}
%}
