using System;

public class ByteBuffer
{
    private byte[] _buffer;
    private int _position = 0;
    private bool bigEndian;

    public ByteBuffer(int capacity, bool bigEndian = false)
    {
        _buffer = new byte[capacity];
        this.bigEndian = bigEndian;
    }

    public ByteBuffer PutFloat(float value)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        if (BitConverter.IsLittleEndian == bigEndian)
            Array.Reverse(bytes);
        Buffer.BlockCopy(bytes, 0, _buffer, _position, 4);
        _position += 4;
        return this;
    }

    public ByteBuffer PutDouble(double value)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        if (BitConverter.IsLittleEndian == bigEndian)
            Array.Reverse(bytes);
        Buffer.BlockCopy(bytes, 0, _buffer, _position, 8);
        _position += 8;
        return this;
    }

    public float GetFloat()
    {
        byte[] bytes = new byte[4];
        Buffer.BlockCopy(_buffer, _position, bytes, 0, 4);
        if (BitConverter.IsLittleEndian == bigEndian)
            Array.Reverse(bytes);
        _position += 4;
        return BitConverter.ToSingle(bytes, 0);
    }

    public double GetDouble()
    {
        byte[] bytes = new byte[8];
        Buffer.BlockCopy(_buffer, _position, bytes, 0, 8);
        if (BitConverter.IsLittleEndian == bigEndian)
            Array.Reverse(bytes);
        _position += 8;
        return BitConverter.ToDouble(bytes, 0);
    }

    public void Rewind() => _position = 0;
    public byte[] ToArray() => _buffer;
    public int Position => _position;
}
