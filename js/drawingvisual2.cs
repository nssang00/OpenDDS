using System;
using System.IO;
using System.Windows;
using System.Windows.Media;
using System.Windows.Media.Imaging;

public class DrawingToPngConverter
{
    private RenderTargetBitmap _renderTarget;
    private DrawingVisual _visual;
    private DrawingContext _context;

    // 메서드 체이닝을 위한 초기화
    public DrawingToPngConverter(int width, int height)
    {
        _visual = new DrawingVisual();
        _renderTarget = new RenderTargetBitmap(width, height, 96, 96, PixelFormats.Pbgra32);
        _context = _visual.RenderOpen();
    }

    // 그리기 작업을 위한 체이닝 메서드
    public DrawingToPngConverter Draw(Action<DrawingContext> drawAction)
    {
        drawAction?.Invoke(_context);
        return this;
    }

    // PNG로 변환하여 바이트 스트림 반환
    public DrawingToPngConverter ToPngBytes(out byte[] pngBytes)
    {
        _context.Close(); // DrawingContext 닫기
        _renderTarget.Render(_visual); // 렌더링

        PngBitmapEncoder encoder = new PngBitmapEncoder();
        encoder.Frames.Add(BitmapFrame.Create(_renderTarget));

        using (MemoryStream stream = new MemoryStream())
        {
            encoder.Save(stream);
            pngBytes = stream.ToArray();
        }

        return this; // 체이닝 지속
    }

    // 파일로 저장
    public void SaveToFile(string filePath)
    {
        byte[] pngBytes;
        ToPngBytes(out pngBytes);
        File.WriteAllBytes(filePath, pngBytes);
    }
}

class Program
{
    static void Main()
    {
        // 500x500 크기의 캔버스 생성
        var converter = new DrawingToPngConverter(500, 500)
            // 그리기 작업: 빨간색 사각형 그리기
            .Draw(dc => 
            {
                dc.DrawRectangle(Brushes.Red, null, new Rect(50, 50, 400, 400));
            })
            // PNG 바이트 스트림으로 변환
            .ToPngBytes(out byte[] pngBytes)
            // 파일로 저장
            .SaveToFile("output.png");

        Console.WriteLine("PNG 파일이 저장되었습니다.");
    }
}
