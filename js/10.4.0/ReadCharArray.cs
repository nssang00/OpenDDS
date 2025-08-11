public override void ReadCharArray(Array value, int length)
{
    int rows = value.GetLength(0);
    int cols = value.GetLength(1);
    char[,] charArray = (char[,])value;
    char[] rowChars = new char[cols];

    Array.Clear(charArray, 0, charArray.Length);

    for (int row = 0; row < rows; r++)
    {
        int n = ReadChars(rowChars, cols);
        Buffer.BlockCopy(rowChars, 0, charArray, (row * cols) * sizeof(char), n * sizeof(char));
    }
}


public override void ReadCharArray(Array value, int length)
{
    int rows = value.GetLength(0);
    int cols = value.GetLength(1);
    char[,] charArray = (char[,])value;
    char[] rowChars = new char[cols]; 

    for (int r = 0; r < rows; r++)
    {
        int n = ReadChars(rowChars, cols);

        for (int c = 0; c < n; c++)
            charArray[r, c] = rowChars[c];

        if (n < cols)
        {
            for (int c = n; c < cols; c++)
                charArray[r, c] = '\0'; 
        }
    }
}

//////////////////////////
using System;
using System.Text;

class Program
{
    static void Main()
    {
        int rows = 5;
        int width = 20; // 바이트 단위 폭

        // 1) 20바이트 간격으로 한글 문자열 저장된 byte[] 생성
        string[] src = { "가나다", "라마바", "사아자", "차카타", "파하" };
        byte[] buf = BuildFixedWidthUtf8Buffer(src, rows, width);

        // 2) byte[] -> char[,] 변환
        char[,] parsed = new char[rows, width];
        var utf8 = new UTF8Encoding(false, false);

        for (int r = 0; r < rows; r++)
        {
            int offset = r * width;

            // 널(0x00) 전까지만 디코드
            int byteLen = width;
            for (int i = 0; i < width; i++)
            {
                if (buf[offset + i] == 0) { byteLen = i; break; }
            }

            char[] rowChars = new char[width];
            int charLen = utf8.GetChars(buf, offset, byteLen, rowChars, 0);

            for (int c = 0; c < charLen; c++)
                parsed[r, c] = rowChars[c];
            for (int c = charLen; c < width; c++)
                parsed[r, c] = '\0'; // 패딩
        }

        // 3) 결과 출력
        Console.WriteLine("=== char[,] 출력 ===");
        for (int r = 0; r < rows; r++)
        {
            Console.Write($"Row{r}: \"");
            for (int c = 0; c < width; c++)
            {
                if (parsed[r, c] == '\0') break;
                Console.Write(parsed[r, c]);
            }
            Console.WriteLine("\"");
        }
    }

    // 고정폭 UTF-8 버퍼 만들기
    static byte[] BuildFixedWidthUtf8Buffer(string[] strings, int rows, int width)
    {
        var utf8 = new UTF8Encoding(false, false);
        byte[] data = new byte[rows * width]; // 기본 0x00 패딩됨

        for (int r = 0; r < rows; r++)
        {
            if (r < strings.Length)
            {
                byte[] bytes = utf8.GetBytes(strings[r]);
                int copyLen = Math.Min(bytes.Length, width);
                Buffer.BlockCopy(bytes, 0, data, r * width, copyLen);
            }
        }
        return data;
    }
}
