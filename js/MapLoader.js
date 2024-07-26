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

        console.log('Style Data:', this.styleData);
        console.log('Layer Data:', this.layerData);

        this.applyMap();  // Apply the parsed styles and layers to the map
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
    // Apply styles to the map
    for (const style of this.styleData) {
        const olStyle = new ol.style.Style({
            stroke: new ol.style.Stroke({
                color: style.color,
                width: parseInt(style.width, 10)
            })
        });

        // Create a vector layer with the style
        const olLayer = new ol.layer.VectorTile({
            source: new ol.source.VectorTile({
                // Define your vector tile source
            }),
            style: olStyle
        });

        // Add the layer to the map
        map.addLayer(olLayer);
    }

    // Apply layers to the map
    for (const layer of this.layerData) {
        let olSource;
        switch (layer.type) {
            case 'vectortile':
                olSource = new ol.source.VectorTile({
                    // Define your vector tile source
                });
                break;
            case 'webglvectortile':
                olSource = new ol.source.WebGLVectorTile({
                    // Define your WebGL vector tile source
                });
                break;
            // Add more cases for other layer types as needed
            default:
                console.error(`Unsupported layer type: ${layer.type}`);
                return;
        }

        const olLayer = new ol.layer[layer.type.charAt(0).toUpperCase() + layer.type.slice(1)]({
            source: olSource,
            // Add any additional layer properties as needed
        });

        // Add the layer to the map
        map.addLayer(olLayer);
    }
}
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
