using System;
using System.Text;

public class BufferHandler
{
    private byte[] _buffer;
    private int _position;

    public BufferHandler(int bufferSize)
    {
        _buffer = new byte[bufferSize];
        _position = 0;
    }

    // Put method for byte array
    public void Put(byte[] src, int offset, int length)
    {
        Buffer.BlockCopy(src, offset, _buffer, _position, length);
        _position += length;
    }

    // Put method for char array, converting it to byte array
    public void Put(char[] src, int offset, int length)
    {
        // Convert the specified range of char[] to byte[]
        byte[] byteArray = Encoding.UTF8.GetBytes(src, offset, length);

        // Copy the converted byte array to _buffer
        Buffer.BlockCopy(byteArray, 0, _buffer, _position, byteArray.Length);
        _position += byteArray.Length;
    }

    // Get method for byte array
    public void Get(byte[] dst, int offset, int length)
    {
        Buffer.BlockCopy(_buffer, _position, dst, offset, length);
        _position += length;
    }

    // Get method for char array, converting each byte to a char
    public void Get(char[] dst, int offset, int length)
    {
        // Decode byte[] back to char[]
        char[] charArray = Encoding.UTF8.GetChars(_buffer, _position, length);
        
        // Copy the decoded chars to dst
        Array.Copy(charArray, 0, dst, offset, charArray.Length);
        _position += length;
    }
}
