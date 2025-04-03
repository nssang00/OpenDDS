import java.nio.ByteOrder;
import java.util.Arrays;

public class ByteBuffer {
    private byte[] buffer;
    private int position;
    private boolean bigEndian;

    public ByteBuffer(int capacity) {
        this(capacity, true);
    }

    public ByteBuffer(int capacity, boolean bigEndian) {
        this.buffer = new byte[capacity];
        this.position = 0;
        this.bigEndian = bigEndian;
    }

    public ByteBuffer setEndian(boolean bigEndian) {
        this.bigEndian = bigEndian;
        return this;
    }

    public ByteBuffer rewind() {
        this.position = 0;
        return this;
    }

    public int position() {
        return this.position;
    }

    public ByteBuffer position(int newPosition) {
        this.position = newPosition;
        return this;
    }

    public byte[] toArray() {
        return Arrays.copyOf(buffer, buffer.length);
    }

    // ----- Internal helpers -----

    private ByteBuffer writeBytes(long value, int byteCount) {
        for (int i = 0; i < byteCount; i++) {
            int shift = bigEndian ? (byteCount - 1 - i) * 8 : i * 8;
            buffer[position + i] = (byte) (value >> shift);
        }
        position += byteCount;
        return this;
    }

    private long readBytes(int byteCount) {
        long result = 0;
        for (int i = 0; i < byteCount; i++) {
            int shift = bigEndian ? (byteCount - 1 - i) * 8 : i * 8;
            result |= ((long) (buffer[position + i] & 0xFF)) << shift;
        }
        position += byteCount;
        return result;
    }

    // ----- Put Methods -----

    public ByteBuffer put(byte value) {
        buffer[position++] = value;
        return this;
    }

    public ByteBuffer putShort(short value) {
        return putUShort((char) value);
    }

    public ByteBuffer putUShort(char value) {
        return writeBytes(value, 2);
    }

    public ByteBuffer putInt(int value) {
        return putUInt(value & 0xFFFFFFFFL);
    }

    public ByteBuffer putUInt(long value) {
        return writeBytes(value, 4);
    }

    public ByteBuffer putLong(long value) {
        return writeBytes(value, 8);
    }

    public ByteBuffer putFloat(float value) {
        return putInt(Float.floatToIntBits(value));
    }

    public ByteBuffer putDouble(double value) {
        return putLong(Double.doubleToLongBits(value));
    }

    // ----- Get Methods -----

    public byte get() {
        return buffer[position++];
    }

    public short getShort() {
        return (short) getUShort();
    }

    public char getUShort() {
        return (char) readBytes(2);
    }

    public int getInt() {
        return (int) getUInt();
    }

    public long getUInt() {
        return readBytes(4);
    }

    public long getLong() {
        return readBytes(8);
    }

    public float getFloat() {
        return Float.intBitsToFloat(getInt());
    }

    public double getDouble() {
        return Double.longBitsToDouble(getLong());
    }
}
