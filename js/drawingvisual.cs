public static class DcRaster
{
    public static SaveResult SavePng(string path, RasterOpts opts, Action<DrawingContext> draw)

DcRaster.SavePng("file.png", new RasterOpts(800,600,96,96,Colors.White), dc => {
    dc.DrawRectangle(Brushes.LightBlue, null, new Rect(10, 10, 200, 100));
    dc.DrawText(...);
});

/////////////
// Program.cs
using System;
using System.IO;
using System.Threading.Tasks;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

public delegate void DrawCallback(DrawingContext dc);

// 렌더링 옵션
public sealed record RasterOpts(
    int Width,
    int Height,
    double DpiX = 96,
    double DpiY = 96,
    Color? Bg = null
);

// Fluent 방식 렌더러
public class FluentRaster
{
    private readonly DrawingVisual _visual;
    private readonly RasterOpts _opts;
    private byte[]? _png;
    private string? _svg;

    private FluentRaster(DrawingVisual visual, RasterOpts opts)
    {
        _visual = visual;
        _opts = opts;
    }

    public static FluentRaster Draw(DrawCallback draw, RasterOpts opt)
    {
        var dv = new DrawingVisual();
        using (var dc = dv.RenderOpen())
        {
            if (opt.Bg is Color bg)
                dc.DrawRectangle(new SolidColorBrush(bg), null, new Rect(0, 0, opt.Width, opt.Height));
            draw(dc);
        }

        return new FluentRaster(dv, opt);
    }

    public FluentRaster ToPng()
    {
        var bmp = new RenderTargetBitmap(_opts.Width, _opts.Height, _opts.DpiX, _opts.DpiY, PixelFormats.Pbgra32);
        bmp.Render(_visual);

        var enc = new PngBitmapEncoder();
        enc.Frames.Add(BitmapFrame.Create(bmp));
        using var ms = new MemoryStream();
        enc.Save(ms);
        _png = ms.ToArray();
        return this;
    }

    public FluentRaster ToSvg()
    {
        _svg = $"<svg width='{_opts.Width}' height='{_opts.Height}'><!-- not implemented --></svg>";
        return this;
    }

    public async Task Save(string filePath)
    {
        var dir = Path.GetDirectoryName(filePath);
        if (!string.IsNullOrEmpty(dir)) Directory.CreateDirectory(dir);

        if (filePath.EndsWith(".png", StringComparison.OrdinalIgnoreCase))
        {
            if (_png == null) throw new InvalidOperationException("ToPng() must be called first.");
            await File.WriteAllBytesAsync(filePath, _png);
        }
        else if (filePath.EndsWith(".svg", StringComparison.OrdinalIgnoreCase))
        {
            if (_svg == null) throw new InvalidOperationException("ToSvg() must be called first.");
            await File.WriteAllTextAsync(filePath, _svg);
        }
        else
        {
            throw new NotSupportedException("Only .png and .svg supported.");
        }
    }
}

// 실행
class Program
{
    [STAThread]
    static async Task Main()
    {
        await FluentRaster
            .Draw(dc =>
            {
                dc.DrawRectangle(Brushes.LightGray, null, new Rect(0, 0, 800, 450));
                dc.DrawText(ft, new Point(40, 40));
            },new RasterOpts(800, 450, bg: Colors.Transparent))
            .ToPng()
            .Save("output.png");

        Console.WriteLine("✓ Render complete.");
    }
}

////////////////////////////////////////
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Markup;

public void SaveDrawingToXaml(string filePath)
{
    // DrawingGroup 생성
    DrawingGroup drawingGroup = new DrawingGroup();
    using (DrawingContext dc = drawingGroup.Open())
    {
        dc.DrawRectangle(Brushes.Blue, null, new Rect(0, 0, 100, 50));
        dc.DrawEllipse(Brushes.Red, null, new Point(150, 75), 50, 30);
    }

    // DrawingImage로 감싸기
    DrawingImage drawingImage = new DrawingImage(drawingGroup);

    // XAML 직렬화
    using (FileStream fs = new FileStream(filePath, FileMode.Create))
    {
        XamlWriter.Save(drawingImage, fs);
    }
}
