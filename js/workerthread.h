void CMyDialog::OnTimer(UINT_PTR nIDEvent)
{
    CefPostTask(TID_UI, [this]() {  // this 포인터 캡처
        ProcessResult();
    });

    std::async(std::launch::async, [this]() {
        std::this_thread::sleep_for(std::chrono::seconds(2)); // 2초 대기
        m_Result = 42; // 결과 설정

        // UI 업데이트는 반드시 메인 스레드에서 수행해야 함
        if (this->GetSafeHwnd()) {
            this->PostMessage(WM_USER + 1); // 사용자 정의 메시지 전송
        }
    });
/////
    std::future<int> future = std::async(std::launch::async, []() {
        Sleep(2000); // 2초 동안 블로킹 작업 (예제)
        return 42;   // 결과 반환
    });

    // 백그라운드 작업 완료 후 UI 스레드로 결과 전달
    std::thread([this, future = std::move(future)]() mutable {
        int result = future.get(); // 결과 대기
        PostMessage(WM_TASK_COMPLETE, result, 0); // UI 스레드로 결과 전달
    }).detach();
    //////
    
    CDialogEx::OnTimer(nIDEvent);
}
///////////
#define WM_WORKER_TASK (WM_USER + 1)  // 사용자 정의 메시지

// Worker Thread 클래스
class CWorkerThread : public CWinThread
{
public:
    CWorkerThreadDlg* m_pDlg;  // CWorkerThreadDlg 포인터

    // 생성자에서 CWorkerThreadDlg 포인터 받기
    CWorkerThread(CWorkerThreadDlg* pDlg)
        : m_pDlg(pDlg)
    {}

    afx_msg void OnDoWork(WPARAM wParam, LPARAM lParam)
    {
        // m_pDlg를 사용하여 메인 UI에서 처리할 작업 수행
        if (m_pDlg)
        {
            // 예: 작업 완료 후 UI 갱신
            m_pDlg->UpdateUI();
        }
        
        TRACE("Worker Thread: 작업 수행 중...\n");
        Sleep(1000);  // 시간이 오래 걸리는 작업 (예: 파일 다운로드, 네트워크 요청)
    }

    DECLARE_MESSAGE_MAP()
};

BEGIN_MESSAGE_MAP(CWorkerThread, CWinThread)
    ON_THREAD_MESSAGE(WM_WORKER_TASK, OnDoWork)  // 메시지 핸들러 등록
END_MESSAGE_MAP()

// 🟢 메인 다이얼로그 클래스 (CDialog)
class CWorkerThreadDlg : public CDialogEx
{
protected:
    CWorkerThread* m_pWorkerThread = nullptr;  // Worker Thread 포인터

public:
    CWorkerThreadDlg() : CDialogEx(IDD_DIALOG1) {}

    void StartWorkerThread()
    {
        if (!m_pWorkerThread)
        {
            m_pWorkerThread = (CWorkerThread*)AfxBeginThread(
                RUNTIME_CLASS(CWorkerThread), 
                0, 
                0, 
                THREAD_PRIORITY_NORMAL, 
                0, 
                nullptr, 
                this);  // CWorkerThreadDlg의 포인터를 전달
        }
    }

    afx_msg void OnTimer(UINT_PTR nIDEvent)
    {
        if (m_pWorkerThread)
        {
            m_pWorkerThread->PostThreadMessage(WM_WORKER_TASK, 0, 0);
        }
    }

    virtual BOOL OnInitDialog() override
    {
        CDialogEx::OnInitDialog();
        SetTimer(1, 2000, nullptr);  // 2초마다 타이머 이벤트 발생
        StartWorkerThread();         // Worker Thread 시작
        return TRUE;
    }

    DECLARE_MESSAGE_MAP()
};

BEGIN_MESSAGE_MAP(CWorkerThreadDlg, CDialogEx)
    ON_WM_TIMER()
END_MESSAGE_MAP()
