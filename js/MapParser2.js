class MarParser {
    constructor(styleUrl, layerUrl) {
        this.styleUrl = styleUrl; // STYLE.xml 파일의 URL
        this.layerUrl = layerUrl; // LAYER.xml 파일의 URL
    }

    // loadMap 함수: STYLE.xml과 LAYER.xml을 fetch하여 파싱합니다.
    async loadMap(styleUrl, layerUrl) {
        try {
            const styleResponse = await fetch(this.styleUrl);
            const layerResponse = await fetch(this.layerUrl);

            if (!styleResponse.ok || !layerResponse.ok) {
                throw new Error('Failed to fetch XML files');
            }

            const styleText = await styleResponse.text();
            const layerText = await layerResponse.text();

            const styleData = this.parseMapStyle(styleText);
            const layerData = this.parseMapLayer(layerText);

            console.log('Parsed Style Data:', styleData);
            console.log('Parsed Layer Data:', layerData);
        } catch (error) {
            console.error('Error loading map:', error);
        }
    }

    // parseMapStyle 함수: STYLE.xml을 파싱하여 스타일 데이터를 반환합니다.
    parseMapStyle(styleXml) {
        const xmlDoc = new DOMParser().parseFromString(styleXml, 'text/xml');
        const styles = [];

        // 스타일 요소를 찾고 배열에 추가합니다.
        const styleElements = xmlDoc.getElementsByTagName('Style');
        for (let style of styleElements) {
            const name = style.getElementsByTagName('Name')[0].textContent;
            const color = style.getElementsByTagName('Color')[0].textContent;
            styles.push({ name, color });
        }

        return styles;
    }

    // parseMapLayer 함수: LAYER.xml을 파싱하여 레이어 데이터를 반환합니다.
    parseMapLayer(layerXml) {
        const xmlDoc = new DOMParser().parseFromString(layerXml, 'text/xml');
        const layers = [];

        // 레이어 요소를 찾고 배열에 추가합니다.
        const layerElements = xmlDoc.getElementsByTagName('Layer');
        for (let layer of layerElements) {
            const id = layer.getElementsByTagName('ID')[0].textContent;
            const title = layer.getElementsByTagName('Title')[0].textContent;
            layers.push({ id, title });
        }

        return layers;
    }
