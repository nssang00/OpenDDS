using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CommunityToolkit.Mvvm.Messaging;
using System;
using System.Diagnostics;
using System.Threading;

namespace MessengerFreezeTest
{
    // 보낼 메시지 타입
    public class HeavyWorkMessage
    {
        public int WorkId { get; }

        public HeavyWorkMessage(int workId)
        {
            WorkId = workId;
        }
    }

    // ViewModel: 메시지 받는 쪽
    public partial class MainViewModel : ObservableObject, IRecipient<HeavyWorkMessage>
    {
        private static int _counter = 0;

        [ObservableProperty]
        private string status = "대기 중";

        public MainViewModel()
        {
            // 이 ViewModel을 HeavyWorkMessage 수신자로 등록
            WeakReferenceMessenger.Default.Register<HeavyWorkMessage>(this);
        }

        // 버튼에서 호출할 커맨드
        [RelayCommand]
        private void SendHeavyWork()
        {
            var id = Interlocked.Increment(ref _counter);
            Status = $"[{DateTime.Now:HH:mm:ss}] Send({id}) 호출됨";

            // ⚠ 여기서 UI 스레드에서 Send 실행
            WeakReferenceMessenger.Default.Send(new HeavyWorkMessage(id));
        }

        // ⚠ 이 함수가 Send가 호출된 "그 스레드"에서 실행됨 (지금은 UI 스레드)
        public void Receive(HeavyWorkMessage message)
        {
            // 여기서 heavy work 수행 → UI 스레드를 막음
            var sw = Stopwatch.StartNew();
            Status = $"[{DateTime.Now:HH:mm:ss}] Receive({message.WorkId}) 시작 - UI 멈춤 테스트";

            // *** Heavy Work: 3초간 바쁜 루프 (CPU 연산) ***
            // Thread.Sleep(3000)으로 바꿔도 되고,
            // 아래처럼 CPU를 바쁘게 만들어도 됨.
            var dummy = 0;
            long targetTicks = TimeSpan.FromSeconds(3).Ticks;
            long startTicks = DateTime.Now.Ticks;

            while (DateTime.Now.Ticks - startTicks < targetTicks)
            {
                dummy++;
                dummy ^= 12345;
            }

            sw.Stop();
            Status = $"[{DateTime.Now:HH:mm:ss}] Receive({message.WorkId}) 완료 - 경과 {sw.ElapsedMilliseconds} ms";
        }
    }
}

/*
public void Receive(HeavyWorkMessage message)
{
    Status = $"[{DateTime.Now:HH:mm:ss}] Receive({message.WorkId}) 시작 - 백그라운드 처리";

    Task.Run(() =>
    {
        var sw = Stopwatch.StartNew();

        // heavy work (백그라운드에서 수행)
        var dummy = 0;
        long targetTicks = TimeSpan.FromSeconds(3).Ticks;
        long startTicks = DateTime.Now.Ticks;

        while (DateTime.Now.Ticks - startTicks < targetTicks)
        {
            dummy++;
            dummy ^= 12345;
        }

        sw.Stop();

        // UI 업데이트만 UI 스레드에서
        App.Current.Dispatcher.BeginInvoke(new Action(() =>
        {
            Status = $"[{DateTime.Now:HH:mm:ss}] Receive({message.WorkId}) 완료 - 경과 {sw.ElapsedMilliseconds} ms (UI는 안 멈췄어야 함)";
        }));
    });
}
*/
