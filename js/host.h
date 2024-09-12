const char *GetHostAddress(int n)
{
	if (HasAssignedHostInterface() == true)
		return GetHostInterface();

	static char hostAddr[10][40] = {{0,},};

	if(!strcmp(hostAddr[n],""))
	{
		std::string strAddress;
		NetworkInterfaceList netIfList;
		int ifNum = GetHostAddresses(netIfList);
		if (0 < ifNum || n < ifNum) {
			NetworkInterface *netif = netIfList.getNetworkInterface(n);
			strAddress = netif->getAddress();
		}
		else
			strAddress = "";

		strcpy(hostAddr[n], strAddress.c_str()); 
	}
	return hostAddr[n];
}

const char *GetHostAddress(int n)
{
	if (HasAssignedHostInterface() == true)
		return GetHostInterface();

	static NetworkInterfaceList netIfList; // static으로 선언
	std::string strAddress;

	// 네트워크 인터페이스 목록이 비어 있으면 목록을 초기화
	if (netIfList.getCount() == 0) {
		GetHostAddresses(netIfList);
	}

	// n번째 인터페이스가 유효한지 확인 후 주소 반환
	if (n < netIfList.getCount()) {
		NetworkInterface *netif = netIfList.getNetworkInterface(n);
		strAddress = netif->getAddress();
	} else {
		strAddress = "";
	}

	// 함수 내에서 주소를 담을 임시 변수를 선언
	static char addrBuffer[40];
	strcpy(addrBuffer, strAddress.c_str());

	return addrBuffer;
}
