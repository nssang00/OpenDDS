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
