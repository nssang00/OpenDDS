const result2 = parseLiteralStyle({
  'fill-color': ['get', 'fillColor'],
  'stroke-color': ['get', 'strokeColor'],
  'stroke-width': ['get', 'strokeWidth'],
});

const withTint_SHADERS2 = {
  builder: result2.builder,
  attributes: {
    fillColor: {
      size: 2,
      callback: (feature) => {
        const style = this.getStyle()(feature, 1)[0];
        const color = asArray(style?.getFill()?.getColor() || '#eee');
        return packColor(color);
      },
    },
    strokeColor: {
      size: 2,
      callback: (feature) => {
        const style = this.getStyle()(feature, 1)[0];
        const color = asArray(style?.getStroke()?.getColor() || '#eee');
        return packColor(color);
      },
    },
    strokeWidth: {
      size: 1,
      callback: (feature) => {
        const style = this.getStyle()(feature, 1)[0];
        return style?.getStroke()?.getWidth() || 0;
      },
    },
  },
}
const style = [withTint_SHADERS2];
