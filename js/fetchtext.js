async loadMap(styleUrl, layerUrl) {
  try {
    // fetch 요청과 응답 본문 변환을 동시에 수행
    const [styleResponse, layerResponse] = await Promise.all([
      fetch(styleUrl).then(async response => {
        if (!response.ok) throw new Error(`Failed to fetch: ${response.url} - ${response.statusText}`);
        return response.text();
      }),
      fetch(layerUrl).then(async response => {
        if (!response.ok) throw new Error(`Failed to fetch: ${response.url} - ${response.statusText}`);
        return response.text();
      })
    ]);

    this.parseMap(styleResponse, layerResponse);
  } catch (error) {
    console.error('Error loading map:', error);
  }
}


async loadMap(styleUrl, layerUrl) {
  try {
    const fetchText = async (url) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.url} - ${response.statusText}`);
      }
      return response.text();
    };

    // fetch 요청과 응답 본문 변환을 동시에 수행
    const [styleResponse, layerResponse] = await Promise.all([
      fetchText(styleUrl),
      fetchText(layerUrl)
    ]);

    this.parseMap(styleResponse, layerResponse);
  } catch (error) {
    console.error('Error loading map:', error);
  }
}
