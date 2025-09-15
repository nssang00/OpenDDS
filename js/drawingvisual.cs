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
