class MarParser {
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
}

// Example usage:
const styleUrl = 'path/to/STYLE.xml';
const layerUrl = 'path/to/LAYER.xml';

const marParser = new MarParser();
marParser.loadMap(styleUrl, layerUrl);
