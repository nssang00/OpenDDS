using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using System.Diagnostics;
using System.Windows;

namespace MessengerHeavyTest
{
    public partial class MainWindow : Window
    {
        public MainWindow()
        {
            InitializeComponent();
        }
    }

    // 메시지 타입 (간단)
    public class HeavyWorkMessage
    {
        public int Index { get; }

        public HeavyWorkMessage(int index)
        {
            Index = index;
        }
    }

    // ViewModel
    public partial class MainViewModel : ObservableObject, IRecipient<HeavyWorkMessage>
    {
        [ObservableProperty]
        private string status = "대기 중";

        public MainViewModel()
        {
            // 메시지 수신 등록
            WeakReferenceMessenger.Default.Register(this);
        }

        // 버튼 커맨드
        [RelayCommand]
        private void StartHeavyTest()
        {
            Status = "메시지 전송 시작";

            for (int i = 0; i < 50; i++)   // 50회
            {
                WeakReferenceMessenger.Default.Send(new HeavyWorkMessage(i));
            }

            Status = "메시지 전송 완료 (Receive에서 작업 중일 수 있음)";
        }

        // 메시지 수신
        public void Receive(HeavyWorkMessage message)
        {
            // UI 스레드에서 실행됨 → UI 버벅임 확인 가능
            Status = $"메시지 {message.Index} 처리 중...";

            // CPU 바쁜 작업 100ms
            var sw = Stopwatch.StartNew();
            while (sw.ElapsedMilliseconds < 100)
            {
                // 아무것도 안 함, CPU 점유
            }

            Status = $"메시지 {message.Index} 처리 완료";
        }
    }
}
