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
