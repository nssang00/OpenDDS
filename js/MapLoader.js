class MapLoader {
    constructor() {
        this.styleData = null;
        this.layerData = null;
    }

    async loadMap(styleUrl, layerUrl) {
        try {
            const urls = [styleUrl, layerUrl];
            const responses = await Promise.all(urls.map(url => fetch(url)));

            if (!responses[0].ok || !responses[1].ok) {
                throw new Error('Failed to fetch one or both files');
            }

            // styleText와 layerText를 Promise.all을 사용하여 병렬로 처리
            const [styleText, layerText] = await Promise.all(responses.map(response => response.text()));

            this.parseMap(styleText, layerText);

        } catch (error) {
            console.error('Error loading map:', error);
        }
    }

    parseMap(styleText, layerText) {
        this.styleData = this.parseMapStyle(styleText);
        this.layerData = this.parseMapLayer(layerText);
    }

    parseMapStyle(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const styleElements = xmlDoc.getElementsByTagName('style');
        const styles = [];

        for (let i = 0; i < styleElements.length; i++) {
            const styleElement = styleElements[i];
            const id = styleElement.getAttribute('id');
            const color = styleElement.getElementsByTagName('color')[0].textContent;
            const width = styleElement.getElementsByTagName('width')[0].textContent;

            styles.push({ id, color, width });
        }

        return styles;
    }

    parseMapLayer(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'application/xml');
        const layerElements = xmlDoc.getElementsByTagName('layer');
        const layers = [];

        for (let i = 0; i < layerElements.length; i++) {
            const layerElement = layerElements[i];
            const id = layerElement.getAttribute('id');
            const name = layerElement.getElementsByTagName('name')[0].textContent;
            const type = layerElement.getElementsByTagName('type')[0].textContent;

            layers.push({ id, name, type });
        }

        return layers;
    }
        
    applyMap(map) {
        // 스타일 데이터 처리
        const styles = {};
        for (const style of this.styleData) {
            styles[style.id] = this.createStyle(style);
        }
    
        // 레이어 데이터 처리
        for (const layer of this.layerData) {
            const { source, styles } = processLayers(layer);
            const vectorLayers = createStyledLayers(source, styles);
            for (const layer of vectorLayers) {
                map.addLayer(layer);
            }

        }
        
    }

    processLayers(layer) {
        // 레이어 정보에 따라 source와 styles를 생성하는 로직
        const source = {
            // 예시: layer의 id를 사용하여 source를 생성
            type: 'vector', // 또는 필요한 타입
            url: `https://example.com/data/${layer.id}`, // 실제 데이터 URL
        };

        const styles = {
            // 예시: 레이어의 스타일 정보를 기반으로 styles를 생성
            [layer.styleId]: {
                // 스타일 속성
                color: layer.color || '#000000', // 기본 색상
                weight: layer.weight || 1, // 기본 두께
                // 추가 스타일 속성...
            }
        };

        return { source, styles }; 
    }    
    
}

function createStyledLayers(vtSourceUrl, stylesArray) {
  const vectorTileSource = new VectorTileSource({
    format: new MVT(),
    url: vtSourceUrl
  });

  return stylesArray.map((style) => {
    if (typeof style === 'function') {
      // If the style is a function, create a Canvas-based VectorTileLayer
      return new VectorTileLayer({
        source: vectorTileSource,
        style: style, 
      });
    } else {//useWebGL
      // If the style is not a function, create a WebGL-based VectorTileLayer
      return new (class extends VectorTileLayer {
        createRenderer() {
          return new WebGLVectorTileLayerRenderer(this, {
            style: style // flat styles
          });
        }
      })({
        source: vectorTileSource,
      });
    }
  });
}

const styleUrl = "path/to/STYLE.xml";
const layerUrl = "path/to/LAYER.xml";

const mapLoader = new MapLoader();

(async () => {
  try {
    // Load the map
    await mapLoader.loadMap(styleUrl, layerUrl);

    // Assuming you have an OpenLayers map object available
    const map = new ol.Map({
      // Your map configuration
    });

    // Apply the loaded map to the OpenLayers map
    mapLoader.applyMap(map);
  } catch (error) {
    console.error("Error loading and applying map:", error);
  }
})();
