async loadMap(styleUrl, layerUrl) {
  const fetchXmlString = async (url) => {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch: ${url} - ${response.statusText}`);
    }
    return await response.text(); 
  };

  try {
    // fetch 요청과 응답 본문 변환을 동시에 수행
    const [styleXmlString, layerXmlString] = await Promise.all([
      fetchXmlString(styleUrl),
      fetchXmlString(layerUrl)
    ]);

    this.parseMap(styleXmlString, layerXmlString);
  } catch (error) {
    console.error('Error loading map:', error);
  }
}

