void WriteCharArray(Array value, int length)
{
    // 1차원 배열: 그대로 WriteChars 호출
    if (value is char[] arr1d)
    {
        WriteChars(arr1d, length);
    }
    // 2차원 배열: 1차원 배열로 복사(flatten) 후 WriteChars 호출
    else if (value is char[,] arr2d)
    {
        char[] flat = new char[arr2d.Length];
        Array.Copy(arr2d, flat, arr2d.Length);
        WriteChars(flat, length); // flat.Length == length 보장하면 flat, 아니면 flat[..length] 등 사용
    }
    else
    {
        throw new ArgumentException("지원하지 않는 배열 타입입니다.");
    }
}

void WriteShortArray(Array value)
{
    if (value is short[] arr1d)
    {
        for (int i = 0; i < arr1d.Length; i++)
        {
            Console.WriteLine(arr1d[i]);
            // _buffer.PutShort(arr1d[i]);
        }
    }
    else if (value is short[,] arr2d)
    {
        int rows = arr2d.GetLength(0);
        int cols = arr2d.GetLength(1);

        for (int i = 0; i < rows; i++)
        {
            for (int j = 0; j < cols; j++)
            {
                Console.WriteLine(arr2d[i, j]);
                // _buffer.PutShort(arr2d[i, j]);
            }
        }
    }
    else
    {
        throw new ArgumentException("지원하지 않는 배열 타입입니다.");
    }
}
