void WriteShortArray(Array value, int length)
{
    if (value.Rank == 1)
    {
        var arr = (short[])value;
        for (int i = 0; i < arr.Length; ++i)
            WriteShort(arr[i]);
    }
    else if (value.Rank == 2)
    {
        var arr = (short[,])value;
        int dim0 = arr.GetLength(0);
        int dim1 = arr.GetLength(1);
        for (int i = 0; i < dim0; ++i)
            for (int j = 0; j < dim1; ++j)
                WriteShort(arr[i, j]);
    }
    else
    {
        throw new NotSupportedException("Arrays with rank greater than 2 are not supported.");
    }
}

void ReadShortArray(Array value, int length)
{
    if (value.Rank == 1)
    {
        var arr = (short[])value;
        for (int i = 0; i < arr.Length; ++i)
            arr[i] = ReadShort();
    }
    else if (value.Rank == 2)
    {
        var arr = (short[,])value;
        int dim0 = arr.GetLength(0);
        int dim1 = arr.GetLength(1);
        for (int i = 0; i < dim0; ++i)
            for (int j = 0; j < dim1; ++j)
                arr[i, j] = ReadShort();
    }
    else
    {
        throw new NotSupportedException("Arrays with rank greater than 2 are not supported.");
    }
}
