using System;

public class ByteBuffer
{
    private byte[] buffer;
    private int position = 0;
    private bool isLittleEndian;

    public ByteBuffer(int capacity, bool littleEndian = false)
    {
        buffer = new byte[capacity];
        isLittleEndian = littleEndian;
    }

    public ByteBuffer PutFloat(float value)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        if (BitConverter.IsLittleEndian != isLittleEndian)
            Array.Reverse(bytes);
        Buffer.BlockCopy(bytes, 0, buffer, position, 4);
        position += 4;
        return this;
    }

    public ByteBuffer PutDouble(double value)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        if (BitConverter.IsLittleEndian != isLittleEndian)
            Array.Reverse(bytes);
        Buffer.BlockCopy(bytes, 0, buffer, position, 8);
        position += 8;
        return this;
    }

    public float GetFloat()
    {
        byte[] bytes = new byte[4];
        Buffer.BlockCopy(buffer, position, bytes, 0, 4);
        if (BitConverter.IsLittleEndian != isLittleEndian)
            Array.Reverse(bytes);
        position += 4;
        return BitConverter.ToSingle(bytes, 0);
    }

    public double GetDouble()
    {
        byte[] bytes = new byte[8];
        Buffer.BlockCopy(buffer, position, bytes, 0, 8);
        if (BitConverter.IsLittleEndian != isLittleEndian)
            Array.Reverse(bytes);
        position += 8;
        return BitConverter.ToDouble(bytes, 0);
    }

    public void Rewind() => position = 0;
    public byte[] ToArray() => buffer;
    public int Position => position;
}
