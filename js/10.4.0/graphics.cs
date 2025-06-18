using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

class Program
{
    static void Main()
    {
        using (var emfStream = new MemoryStream())
        {
            using (Graphics refGraphics = Graphics.FromHwnd(IntPtr.Zero))
            {
                IntPtr hdc = refGraphics.GetHdc();
                using (var metafile = new Metafile(emfStream, hdc))
                {
                    refGraphics.ReleaseHdc(hdc);

                    using (Graphics g = Graphics.FromImage(metafile))
                    {
                        g.Clear(Color.White);
                        g.DrawEllipse(Pens.Blue, 10, 10, 100, 80);
                        g.DrawString("Stream EMF", new Font("Arial", 12), Brushes.Black, 20, 50);
                    }
                }
            }

            // 저장
            emfStream.Position = 0;
            File.WriteAllBytes("saved.emf", emfStream.ToArray());
        }
    }
}
