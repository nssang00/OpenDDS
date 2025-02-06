
#define WM_WORKER_TASK (WM_USER + 1)  // 사용자 정의 메시지

class CWorkerThread : public CWinThread
{
public:
    virtual BOOL InitInstance()
    {
        return TRUE;  // 메시지 루프 유지 (PostThreadMessage 사용 가능)
    }

    afx_msg void OnDoWork(WPARAM wParam, LPARAM lParam)
    {
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
            m_pWorkerThread = (CWorkerThread*)AfxBeginThread(RUNTIME_CLASS(CWorkerThread));
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
};
