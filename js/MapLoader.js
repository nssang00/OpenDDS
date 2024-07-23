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

    applyMap() {
        // Assuming you have an OpenLayers map object available
        const map = ...; // Your OpenLayers map instance

        // Apply styles to the map (example code, replace with your logic)
        this.styleData.forEach(style => {
            const olStyle = new ol.style.Style({
                stroke: new ol.style.Stroke({
                    color: style.color,
                    width: parseInt(style.width, 10)
                })
            });
            // Add style to your map or layer
        });

        // Apply layers to the map (example code, replace with your logic)
        this.layerData.forEach(layer => {
            const olLayer = new ol.layer.Vector({
                source: new ol.source.Vector({
                    // Define your vector source
                }),
                style: ... // Define or retrieve the corresponding style
            });
            map.addLayer(olLayer);
        });
    }
}

// Example usage:
const styleUrl = 'path/to/STYLE.xml';
const layerUrl = 'path/to/LAYER.xml';

const mapLoader = new MapLoader();
mapLoader.loadMap(styleUrl, layerUrl);
