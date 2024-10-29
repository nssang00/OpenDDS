class Cond
{
public:
	Cond(bool bManualReset = false);
	~Cond();

	//signal을 주기전까지 대기하는 함수
	bool wait();

	//일정시간 만큼 대기하는 함수
	bool timedwait(unsigned int timeout);

	bool signal(bool bFlush = true);

	//수동리셋모드인경우 다시 잠금모드로 변경
	bool waitsignal();//reset()
#ifndef WIN32
	static bool timed_wait(sem_t* sem, const int timeout);
#endif
private:
	bool wait(unsigned int timeout);

#if defined(WIN32)
	HANDLE condID;
	HANDLE tmCondID;
#else
	sem_t condID;
	sem_t tmCondID;
#endif
private:
	bool bManualReset;
};

Cond::Cond(bool bManualReset)
{
#if defined(WIN32)
	condID = CreateEvent(NULL, FALSE, FALSE, NULL);
	tmCondID = CreateEvent(NULL, FALSE, FALSE, NULL);
#else
	sem_init (&condID, 0, 0);  
	sem_init (&tmCondID, 0, 0);  
#endif
	this->bManualReset = bManualReset;
}

Cond::~Cond()
{
#if defined(WIN32)
	CloseHandle(condID);
	CloseHandle(tmCondID);
#else
	sem_destroy(&condID);
	sem_destroy(&tmCondID);
#endif
}

bool Cond::wait()
{
	bool ret = true;

#if defined(WIN32)
	ret = wait(INFINITE);
#else
	ret = wait(-1);
#endif

	return ret;
}

bool Cond::wait(unsigned int timeout)
{
#if defined(WIN32)
	//2011.07.06
	DWORD retval = WaitForSingleObject(condID, timeout);
	if( retval == WAIT_TIMEOUT )
		return false;
#else
	if((signed)timeout == -1)
		while(sem_wait(&condID) && errno == EINTR);
	else
	{
		bool ret = timed_wait(&condID, timeout);
		if(ret == false)
			return false;
	}

#endif

	if(bManualReset)
		signal(false);

	return true;
}

bool Cond::timedwait(unsigned int timeout)
{
#if defined(WIN32)
	DWORD retval = WaitForSingleObject(tmCondID, timeout);
	if( retval == WAIT_TIMEOUT )
		return false;
#else
		bool ret = timed_wait(&tmCondID, timeout);
		if(ret == false)
			return false;
#endif

	return true;
}

bool Cond::signal(bool bFlush)
{
#if defined(WIN32)
	SetEvent(condID);
	if(bFlush)
		SetEvent(tmCondID);
#else
	sem_trywait(&condID);
	sem_post(&condID);
	if(bFlush)
	{
		sem_trywait(&tmCondID);
		sem_post(&tmCondID);
	}
#endif
	return true;
}

bool Cond::waitsignal()
{
#if defined(WIN32)
	ResetEvent(condID);
#else
	sem_trywait(&condID);
#endif
	return true;
}

#ifndef WIN32
bool Cond::timed_wait(sem_t* sem, const int timeout)
{
	bool ret = false;

	struct timeval now_time;
	struct timeval abs_time;
	struct timespec rqtp = { 0, 1000000 };	// 1ms

	//timeout에 해당하는 절대 시간값을 계산함
	CalcWakeUpTime(&abs_time, 0, timeout);	

	do
	{
		if(sem_trywait(sem) == 0)
			return true;
		nanosleep(&rqtp, 0);//sched_yield();
		get_uptime(&now_time);
	}while(DiffMillisTime(&now_time, &abs_time) > 0);
	return ret;
}
#endif
