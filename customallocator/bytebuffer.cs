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

    // Get method for byte array
    public void Get(byte[] dst, int offset, int length)
    {
        Buffer.BlockCopy(_buffer, _position, dst, offset, length);
        _position += length;
    }

    public void Put(char[] src, int offset, int length)
    {
        byte[] bytes = Encoding.UTF8.GetBytes(src);
        Buffer.BlockCopy(bytes, 0, _buffer, _position, bytes.Length);
        _position += length;
    }    

    public void Get(char[] dst, int offset, int length)
    {
        Encoding.UTF8.GetChars(_buffer, _position, length, dst, offset);
        _position += length;
    }
}
