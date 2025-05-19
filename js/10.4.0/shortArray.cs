// 내부 헬퍼 함수
private void WriteArray<T>(Array value, int length, Action<T> writeElement)
{
    if (value is T[] array1D)
    {
        for (int i = 0; i < length; ++i)
            writeElement(array1D[i]);
    }
    else if (value is T[,] array2D)
    {
        int dim0 = array2D.GetLength(0);
        int dim1 = array2D.GetLength(1);
        for (int i = 0; i < dim0; ++i)
            for (int j = 0; j < dim1; ++j)
                writeElement(array2D[i, j]);
    }
    else
    {
        throw new NotSupportedException("Arrays with rank greater than 2 are not supported.");
    }
}

public void WriteShortArray(Array value, int length)
{
    WriteArray<short>(value, length, WriteShort);
}

public void WriteIntArray(Array value, int length)
{
    WriteArray<int>(value, length, WriteInt);
}

public void WriteLongArray(Array value, int length)
{
    WriteArray<long>(value, length, WriteLong);
}

public void WriteFloatArray(Array value, int length)
{
    WriteArray<float>(value, length, WriteFloat);
}

public void WriteDoubleArray(Array value, int length)
{
    WriteArray<double>(value, length, WriteDouble);
}

public void WriteUShortArray(Array value, int length)
{
    WriteArray<ushort>(value, length, WriteUShort);
}

public void WriteUIntArray(Array value, int length)
{
    WriteArray<uint>(value, length, WriteUInt);
}

public void WriteULongArray(Array value, int length)
{
    WriteArray<ulong>(value, length, WriteULong);
}

private void ReadArray<T>(Array value, int length, Func<T> readElement)
{
    if (value is T[] array1D)
    {
        for (int i = 0; i < length; ++i)
            array1D[i] = readElement();
    }
    else if (value is T[,] array2D)
    {
        int dim0 = array2D.GetLength(0);
        int dim1 = array2D.GetLength(1);
        for (int i = 0; i < dim0; ++i)
            for (int j = 0; j < dim1; ++j)
                array2D[i, j] = readElement();
    }
    else
    {
        throw new NotSupportedException("Arrays with rank greater than 2 are not supported.");
    }
}

public void ReadShortArray(Array value, int length)
{
    ReadArray<short>(value, length, ReadShort);
}

public void ReadIntArray(Array value, int length)
{
    ReadArray<int>(value, length, ReadInt);
}

public void ReadLongArray(Array value, int length)
{
    ReadArray<long>(value, length, ReadLong);
}

public void ReadFloatArray(Array value, int length)
{
    ReadArray<float>(value, length, ReadFloat);
}

public void ReadDoubleArray(Array value, int length)
{
    ReadArray<double>(value, length, ReadDouble);
}

public void ReadUShortArray(Array value, int length)
{
    ReadArray<ushort>(value, length, ReadUShort);
}

public void ReadUIntArray(Array value, int length)
{
    ReadArray<uint>(value, length, ReadUInt);
}

public void ReadULongArray(Array value, int length)
{
    ReadArray<ulong>(value, length, ReadULong);
}
