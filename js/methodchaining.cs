// Program.cs
using System;
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

public class RasterBuilder
{
    private int _width = 800;
    private int _height = 600;
    private double _dpiX = 96, _dpiY = 96;
    private Color? _bg = null;
    private Action<DrawingContext>? _draw;

    public RasterBuilder WithSize(int width, int height) { _width = width; _height = height; return this; }
    public RasterBuilder WithDpi(double dpiX, double dpiY) { _dpiX = dpiX; _dpiY = dpiY; return this; }
    public RasterBuilder WithBackground(Color color) { _bg = color; return this; }
    public RasterBuilder Draw(Action<DrawingContext> draw) { _draw = draw; return this; }

    /// <summary> PNG 바이트 배열 반환 </summary>
    public byte[] ToBytes()
    {
        if (_draw == null)
            throw new InvalidOperationException("Draw callback must be provided.");

        var dv = new DrawingVisual();
        using (var dc = dv.RenderOpen())
        {
            if (_bg is Color bg)
                dc.DrawRectangle(new SolidColorBrush(bg), null, new Rect(0, 0, _width, _height));

            _draw(dc);
        }

        var rtb = new RenderTargetBitmap(_width, _height, _dpiX, _dpiY, PixelFormats.Pbgra32);
        rtb.Render(dv);

        var encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(rtb));

        using var ms = new MemoryStream();
        encoder.Save(ms);
        return ms.ToArray();
    }

    /// <summary> 파일로 바로 저장 </summary>
    public void Save(string path)
    {
        var bytes = ToBytes();
        Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(path)) ?? ".");
        File.WriteAllBytes(path, bytes);
    }
}

class Program
{
    [STAThread]
    static void Main()
    {
        new RasterBuilder()
            .WithSize(800, 600)
            .WithBackground(Colors.LightGray)
            .Draw(dc => {
                dc.DrawRectangle(Brushes.SkyBlue, null, new Rect(50, 50, 200, 100));
            })
            .Save("out/test.png");
    }
}
