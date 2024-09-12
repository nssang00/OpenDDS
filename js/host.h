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
