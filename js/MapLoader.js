class MapLoader {
    constructor() {
        this.styleData = null;
        this.layerData = null;
    }

    async loadMap(styleUrl, layerUrl) {
        try {
            const [styleResponse, layerResponse] = await Promise.all([
                fetch(styleUrl),
                fetch(layerUrl)
            ]);

            if (!styleResponse.ok || !layerResponse.ok) {
                throw new Error('Failed to fetch one or both files');
            }

            const styleText = await styleResponse.text();
            const layerText = await layerResponse.text();

            this.parseMap(styleText, layerText);

            console.log('Style Data:', this.styleData);
            console.log('Layer Data:', this.layerData);

            this.applyStylesAndLayers();  // Apply the parsed styles and layers to the map
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

    applyStylesAndLayers() {
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
