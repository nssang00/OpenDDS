using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;

MemoryStream emfStream = new MemoryStream();

using (Graphics refGraphics = Graphics.FromHwnd(IntPtr.Zero))
{
    IntPtr hdc = refGraphics.GetHdc();

    // 메모리 기반 EMF 생성
    using (Metafile metafile = new Metafile(emfStream, hdc))
    {
        refGraphics.ReleaseHdc(hdc);

        using (Graphics g = Graphics.FromImage(metafile))
        {
            g.DrawEllipse(Pens.Red, 10, 10, 100, 100);
            g.DrawString("Hello EMF", new Font("Arial", 14), Brushes.Blue, new PointF(20, 60));
        }
    }
}
