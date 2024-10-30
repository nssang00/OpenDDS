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

    // Overloaded Put method for char array
    public void Put(char[] src, int offset, int length)
    {
        Buffer.BlockCopy(src, offset * sizeof(char), _buffer, _position, length * sizeof(char));
        _position += length * sizeof(char);
    }

    // Get method for byte array
    public void Get(byte[] dst, int offset, int length)
    {
        Buffer.BlockCopy(_buffer, _position, dst, offset, length);
        _position += length;
    }

    // Overloaded Get method for char array
    public void Get(char[] dst, int offset, int length)
    {
        Buffer.BlockCopy(_buffer, _position, dst, offset * sizeof(char), length * sizeof(char));
        _position += length * sizeof(char);
    }
}
