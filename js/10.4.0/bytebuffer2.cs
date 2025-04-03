using System;

public class ByteBuffer
{
    private byte[] _buffer;
    private int _position;
    private bool _bigEndian;

    public ByteBuffer(int capacity, bool bigEndian = true)
    {
        _buffer = new byte[capacity];
        _bigEndian = bigEndian;
        _position = 0;
    }

    public ByteBuffer SetEndian(bool bigEndian)
    {
        _bigEndian = bigEndian;
        return this;
    }

    public ByteBuffer Rewind()
    {
        _position = 0;
        return this;
    }

    public int Position()
    {
        return _position;
    }

    public ByteBuffer Position(int newPosition)
    {
        _position = newPosition;
        return this;
    }

    public byte[] ToArray()
    {
        return _buffer;
    }

    // ----- Common Internal Helpers -----

    private ByteBuffer WriteBytes(ulong value, int byteCount)
    {
        for (int i = 0; i < byteCount; i++)
        {
            int shift = _bigEndian ? (byteCount - 1 - i) * 8 : i * 8;
            _buffer[_position + i] = (byte)(value >> shift);
        }
        _position += byteCount;
        return this;
    }

    private ulong ReadBytes(int byteCount)
    {
        ulong result = 0;
        for (int i = 0; i < byteCount; i++)
        {
            int shift = _bigEndian ? (byteCount - 1 - i) * 8 : i * 8;
            result |= ((ulong)_buffer[_position + i]) << shift;
        }
        _position += byteCount;
        return result;
    }

    private ByteBuffer PutRawBytes(byte[] bytes)
    {
        if (BitConverter.IsLittleEndian != !_bigEndian)
        {
            Array.Reverse(bytes);
        }
        Array.Copy(bytes, 0, _buffer, _position, bytes.Length);
        _position += bytes.Length;
        return this;
    }

    // ----- Put Methods -----

    public ByteBuffer Put(byte value)
    {
        _buffer[_position++] = value;
        return this;
    }

    public ByteBuffer PutShort(short value)
    {
        return PutUShort((ushort)value);
    }

    public ByteBuffer PutUShort(ushort value)
    {
        return WriteBytes(value, 2);
    }

    public ByteBuffer PutInt(int value)
    {
        return PutUInt((uint)value);
    }

    public ByteBuffer PutUInt(uint value)
    {
        return WriteBytes(value, 4);
    }

    public ByteBuffer PutLong(long value)
    {
        return PutULong((ulong)value);
    }

    public ByteBuffer PutULong(ulong value)
    {
        return WriteBytes(value, 8);
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

    // ----- Get Methods -----

    public byte Get()
    {
        return _buffer[_position++];
    }

    public short GetShort()
    {
        return (short)GetUShort();
    }

    public ushort GetUShort()
    {
        return (ushort)ReadBytes(2);
    }

    public int GetInt()
    {
        return (int)GetUInt();
    }

    public uint GetUInt()
    {
        return (uint)ReadBytes(4);
    }

    public long GetLong()
    {
        return (long)GetULong();
    }

    public ulong GetULong()
    {
        return ReadBytes(8);
    }

    public float GetFloat()
    {
        byte[] bytes = new byte[4];
        Array.Copy(_buffer, _position, bytes, 0, 4);
        if (BitConverter.IsLittleEndian != !_bigEndian)
        {
            Array.Reverse(bytes);
        }
        _position += 4;
        return BitConverter.ToSingle(bytes, 0);
    }

    public double GetDouble()
    {
        byte[] bytes = new byte[8];
        Array.Copy(_buffer, _position, bytes, 0, 8);
        if (BitConverter.IsLittleEndian != !_bigEndian)
        {
            Array.Reverse(bytes);
        }
        _position += 8;
        return BitConverter.ToDouble(bytes, 0);
    }
}
