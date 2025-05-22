%typemap(cstype) double* "double[]"
%typemap(imtype) double* "double[]"
%typemap(csin)   double* "$csinput"
%typemap(csout)  double* {
    int size = $self->get_payload_size();
    double[] result = new double[size];
    if ($imcall != IntPtr.Zero)
        System.Runtime.InteropServices.Marshal.Copy($imcall, result, 0, size);
    return result;
}


%define POINTER_ARRAY_TYPEMAP(TYPE, CSTYPE, FUNCNAME, SIZEFUNC)
%typemap(cstype) TYPE* "CSTYPE[]"

%typemap(csout) TYPE* FUNCNAME {
    int length = (int)$self->SIZEFUNC;
    CSTYPE[] result = new CSTYPE[length];
    if (length > 0)
        System.Runtime.InteropServices.Marshal.Copy($imcall, result, 0, length);
    return result;
}
%enddef



%include "MyPayload.h"

// 각 함수마다 typemap 적용
POINTER_ARRAY_TYPEMAP(double, double, MyPayload::get_payload, get_payload_size())
POINTER_ARRAY_TYPEMAP(int, int, MyPayload::get_flags, get_flags_size())
POINTER_ARRAY_TYPEMAP(float, float, MyPayload::get_temps, get_temps_size())
