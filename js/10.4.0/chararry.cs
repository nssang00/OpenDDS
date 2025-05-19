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


///////
void ReadCharArray(Array value, int length)
{
    if (value == null)
        throw new ArgumentNullException(nameof(value));

    if (value.Rank == 1)
    {
        // 1차원 배열 처리
        char[] array1D = (char[])value;
        if (array1D.Length < length)
            throw new ArgumentException("Array length is less than requested length.");
        ReadChars(array1D, length);
    }
    else if (value.Rank == 2)
    {
        // 2차원 배열 처리
        char[,] array2D = (char[,])value;
        int rows = array2D.GetLength(0);
        int cols = array2D.GetLength(1);
        if (cols < length)
            throw new ArgumentException("Second dimension length is less than requested length.");

        // 2차원 배열을 1차원으로 변환하여 ReadChars 호출
        char[] tempArray = new char[rows * cols];
        int readLength = Math.Min(length, cols);
        int charsRead = ReadChars(tempArray, readLength);

        // 읽은 데이터를 2차원 배열에 복사
        for (int i = 0; i < rows && i * cols < charsRead; i++)
        {
            for (int j = 0; j < cols && i * cols + j < charsRead; j++)
            {
                array2D[i, j] = tempArray[i * cols + j];
            }
        }
    }
    else
    {
        throw new ArgumentException("Only 1D or 2D arrays are supported.");
    }
}

int ReadChars(char[] dst, int maxLength)
{
    return _buffer.GetChars(dst, 0, maxLength);
}

void WriteCharArray(Array value, int length)
{
    if (value == null)
        throw new ArgumentNullException(nameof(value));

    if (value.Rank == 1)
    {
        // 1차원 배열 처리
        char[] array1D = (char[])value;
        if (array1D.Length < length)
            throw new ArgumentException("Array length is less than requested length.');
        WriteChars(array1D, length);
    }
    else if (value.Rank == 2)
    {
        // 2차원 배열 처리
        char[,] array2D = (char[,])value;
        int rows = array2D.GetLength(0);
        int cols = array2D.GetLength(1);
        if (cols < length)
            throw new ArgumentException("Second dimension length is less than requested length.");

        // 2차원 배열을 1차원으로 변환
        char[] tempArray = new char[rows * cols];
        Buffer.BlockCopy(array2D, 0, tempArray, 0, rows * cols * sizeof(char));
        WriteChars(tempArray, Math.Min(length, cols));
    }
    else
    {
        throw new ArgumentException("Only 1D or 2D arrays are supported.");
    }
}

void WriteShortArray(Array value, int length)
{
    if (value == null)
        throw new ArgumentNullException(nameof(value));

    if (value.Rank == 1)
    {
        // 1차원 배열 처리
        short[] array1D = (short[])value;
        if (array1D.Length < length)
            throw new ArgumentException("Array length is less than requested length.");
        for (int i = 0; i < length; ++i)
        {
            WriteShort(array1D[i]);
        }
    }
    else if (value.Rank == 2)
    {
        // 2차원 배열 처리
        short[,] array2D = (short[,])value;
        int rows = array2D.GetLength(0);
        int cols = array2D.GetLength(1);
        if (cols < length)
            throw new ArgumentException("Second dimension length is less than requested length.");

        // 행 우선 방식으로 처리
        int writeCount = 0;
        for (int i = 0; i < rows && writeCount < length; i++)
        {
            for (int j = 0; j < cols && writeCount < length; j++)
            {
                WriteShort(array2D[i, j]);
                writeCount++;
            }
        }
    }
    else
    {
        throw new ArgumentException("Only 1D or 2D arrays are supported.");
    }
}


//////
// 1차원 배열
char[] charArray1D = new char[] { 'a', 'b', 'c' };
ReadCharArray(charArray1D, 3);
WriteCharArray(charArray1D, 3);

short[] shortArray1D = new short[] { 1, 2, 3 };
WriteShortArray(shortArray1D, 3);

// 2차원 배열
char[,] charArray2D = new char[,] { { 'a', 'b' }, { 'c', 'd' } };
ReadCharArray(charArray2D, 2);
WriteCharArray(charArray2D, 2);

short[,] shortArray2D = new short[,] { { 1, 2 }, { 3, 4 } };
WriteShortArray(shortArray2D, 2);
