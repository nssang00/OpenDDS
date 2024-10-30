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

    public void Put(char[] src, int offset, int length)
    {
        _position += System.Text.Encoding.ASCII.GetBytes(src, offset, length, _buffer, _position);
    }

    // Get method for byte array
    public void Get(byte[] dst, int offset, int length)
    {
        Buffer.BlockCopy(_buffer, _position, dst, offset, length);
        _position += length;
    }

    public void Get(char[] dst, int offset, int length)
    {
        System.Text.Encoding.ASCII.GetChars(_buffer, _position, length, dst, offset); 

        _position += length; 
    }
}
