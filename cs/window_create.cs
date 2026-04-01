using System.Collections.Generic;
using System.Windows;

namespace WinTest
{
    public partial class MainWindow : Window
    {
        private readonly List<Window> _windows = new List<Window>();

        public MainWindow()
        {
            InitializeComponent();
        }

        private void BtnCreate_Click(object sender, RoutedEventArgs e)
        {
            for (int i = 0; i < 10; i++)
            {
                Window win = new Window();
                win.Width       = 800;
                win.Height      = 600;
                win.Left        = -900;   // 화면 밖
                win.Top         = -700;
                win.Owner       = this;
                win.Show();

                _windows.Add(win);
            }

            TxtCount.Text = "생성된 Window: " + _windows.Count + "개";
        }

        private void BtnClose_Click(object sender, RoutedEventArgs e)
        {
            foreach (Window w in _windows)
                w.Close();

            _windows.Clear();
            TxtCount.Text = "생성된 Window: 0개";
        }
    }
}
