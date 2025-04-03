using System;

public class ByteBuffer
{
    private byte[] buffer;
    private int position;
    private bool bigEndian;

    public ByteBuffer(int capacity, bool bigEndian = true)
    {
        buffer = new byte[capacity];
        this.bigEndian = bigEndian;
        this.position = 0;
    }

    public ByteBuffer SetEndian(bool bigEndian)
    {
        this.bigEndian = bigEndian;
        return this;
    }

    public ByteBuffer Rewind()
    {
        position = 0;
        return this;
    }

    public int Position()
    {
        return position;
    }

    public ByteBuffer Position(int newPosition)
    {
        position = newPosition;
        return this;
    }

    public byte[] ToArray()
    {
        return buffer;
    }

    public ByteBuffer Put(byte value)
    {
        buffer[position++] = value;
        return this;
    }

    public ByteBuffer PutShort(short value)
    {
        if (bigEndian)
        {
            buffer[position] = (byte)(value >> 8);
            buffer[position + 1] = (byte)value;
        }
        else
        {
            buffer[position] = (byte)value;
            buffer[position + 1] = (byte)(value >> 8);
        }
        position += 2;
        return this;
    }

    public ByteBuffer PutUShort(ushort value)
    {
        return PutShort((short)value);
    }

    public ByteBuffer PutInt(int value)
    {
        for (int i = 0; i < 4; i++)
        {
            int shift = bigEndian ? (3 - i) * 8 : i * 8;
            buffer[position + i] = (byte)(value >> shift);
        }
        position += 4;
        return this;
    }

    public ByteBuffer PutUInt(uint value)
    {
        return PutInt((int)value);
    }

    public ByteBuffer PutLong(long value)
    {
        for (int i = 0; i < 8; i++)
        {
            int shift = bigEndian ? (7 - i) * 8 : i * 8;
            buffer[position + i] = (byte)(value >> shift);
        }
        position += 8;
        return this;
    }

    public ByteBuffer PutULong(ulong value)
    {
        return PutLong((long)value);
    }

    public ByteBuffer PutFloat(float value)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        return PutRawBytes(bytes);
    }

    public ByteBuffer PutDouble(double value)
    {
        byte[] bytes = BitConverter.GetBytes(value);
        return PutRawBytes(bytes);
    }

    private ByteBuffer PutRawBytes(byte[] bytes)
    {
        if (BitConverter.IsLittleEndian != !bigEndian)
        {
            Array.Reverse(bytes);
        }
        Array.Copy(bytes, 0, buffer, position, bytes.Length);
        position += bytes.Length;
        return this;
    }
}
