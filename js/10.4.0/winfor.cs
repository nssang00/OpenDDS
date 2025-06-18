public partial class MainForm : Form
{
    private Panel hostPanel;
    private Map2D map2d;

    public MainForm()
    {
        InitializeComponent();

        hostPanel = new Panel();
        hostPanel.Dock = DockStyle.Fill;
        this.Controls.Add(hostPanel);

        // 이 시점에서 hostPanel.Handle은 유효한 HWND
        map2d = new Map2D(hostPanel.Handle);
    }
}
