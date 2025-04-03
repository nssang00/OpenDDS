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

    // ----- Put Methods -----

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

    // ----- Get Methods -----

    public byte Get()
    {
        return buffer[position++];
    }

    public short GetShort()
    {
        short result;
        if (bigEndian)
        {
            result = (short)((buffer[position] << 8) | buffer[position + 1]);
        }
        else
        {
            result = (short)((buffer[position + 1] << 8) | buffer[position]);
        }
        position += 2;
        return result;
    }

    public ushort GetUShort()
    {
        return (ushort)GetShort();
    }

    public int GetInt()
    {
        int result = 0;
        for (int i = 0; i < 4; i++)
        {
            int shift = bigEndian ? (3 - i) * 8 : i * 8;
            result |= buffer[position + i] << shift;
        }
        position += 4;
        return result;
    }

    public uint GetUInt()
    {
        return (uint)GetInt();
    }

    public long GetLong()
    {
        long result = 0;
        for (int i = 0; i < 8; i++)
        {
            int shift = bigEndian ? (7 - i) * 8 : i * 8;
            result |= ((long)buffer[position + i]) << shift;
        }
        position += 8;
        return result;
    }

    public ulong GetULong()
    {
        return (ulong)GetLong();
    }

    public float GetFloat()
    {
        byte[] bytes = new byte[4];
        Array.Copy(buffer, position, bytes, 0, 4);
        if (BitConverter.IsLittleEndian != !bigEndian)
        {
            Array.Reverse(bytes);
        }
        position += 4;
        return BitConverter.ToSingle(bytes, 0);
    }

    public double GetDouble()
    {
        byte[] bytes = new byte[8];
        Array.Copy(buffer, position, bytes, 0, 8);
        if (BitConverter.IsLittleEndian != !bigEndian)
        {
            Array.Reverse(bytes);
        }
        position += 8;
        return BitConverter.ToDouble(bytes, 0);
    }
}
