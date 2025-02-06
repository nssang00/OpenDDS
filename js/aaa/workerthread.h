#include <afxwin.h>

#define WM_WORKER_TASK (WM_USER + 1)  // 사용자 정의 메시지

// 🟢 Worker Thread 클래스
class CWorkerThread : public CWinThread
{
public:
    CWorkerThreadDlg* m_pDlg;  // CWorkerThreadDlg 포인터

    // 생성자에서 CWorkerThreadDlg 포인터 받기
    CWorkerThread(CWorkerThreadDlg* pDlg)
        : m_pDlg(pDlg)
    {}

    virtual BOOL InitInstance()
    {
        return TRUE;  // 메시지 루프 유지 (PostThreadMessage 사용 가능)
    }

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

    // UI 업데이트 메서드
    void UpdateUI()
    {
        // 예: UI 갱신 (예: 버튼 텍스트 변경)
        SetDlgItemText(IDC_BUTTON1, _T("작업 완료"));
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

// 🟢 MFC 애플리케이션 클래스
class CWorkerThreadApp : public CWinApp
{
public:
    virtual BOOL InitInstance()
    {
        CWorkerThreadDlg dlg;
        m_pMainWnd = &dlg;
        dlg.DoModal();  // 다이얼로그 표시
        return FALSE;
    }
};

// 🟢 애플리케이션 실행
CWorkerThreadApp theApp;

///////
class CMyDialog : public CDialogEx {
public:
    enum { WM_TASK_COMPLETE = WM_USER + 1 }; // 사용자 정의 메시지
    afx_msg LRESULT OnTaskComplete(WPARAM wParam, LPARAM lParam);
    
    void OnTimer(UINT_PTR nIDEvent) override;
    DECLARE_MESSAGE_MAP()
};

BEGIN_MESSAGE_MAP(CMyDialog, CDialogEx)
    ON_MESSAGE(WM_TASK_COMPLETE, &CMyDialog::OnTaskComplete)
    ON_WM_TIMER()
END_MESSAGE_MAP()

void CMyDialog::OnTimer(UINT_PTR nIDEvent) {
    if (nIDEvent == 1) {
        // 백그라운드에서 실행할 비동기 작업
        std::future<int> future = std::async(std::launch::async, []() {
            Sleep(2000); // 2초 동안 블로킹 작업 (예제)
            return 42;   // 결과 반환
        });

        // 백그라운드 작업 완료 후 UI 스레드로 결과 전달
        std::thread([this, future = std::move(future)]() mutable {
            int result = future.get(); // 결과 대기
            PostMessage(WM_TASK_COMPLETE, result, 0); // UI 스레드로 결과 전달
        }).detach();
    }
}

LRESULT CMyDialog::OnTaskComplete(WPARAM wParam, LPARAM lParam) {
    int result = static_cast<int>(wParam);
    MessageBox(CString("Result: ") + std::to_wstring(result).c_str(), L"Async Result", MB_OK);
    return 0;
}
