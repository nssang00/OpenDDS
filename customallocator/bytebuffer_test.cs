using System;
using System.Security.Cryptography;
using System.Text;

class Program
{
    static void Main(string[] args)
    {
        int length = 20;
        int _position = 0;
        byte[] _buffer = new byte[length];

        char[] src = "우리12abc헐".ToCharArray();

        byte[] bytes = Encoding.UTF8.GetBytes(src, 0, src.Length);
        Buffer.BlockCopy(bytes, 0, _buffer, _position, bytes.Length);

        
        char[] charArray = new char[length];
        System.Text.Encoding.UTF8.GetChars(_buffer, _position, length, charArray, 0);
    
        Console.WriteLine("char[] 에서 String 으로 변환 == {0}", new String(charArray)); // char[] to String 변환후 출력
    }

}
