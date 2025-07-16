const seenUids = new Set();
const filteredFeatures = [];

for (const styleShader of this.styleShaders) {
  const filtered = styleShader.featureFilter
    ? features.filter(styleShader.featureFilter)
    : features;

  for (const feature of filtered) {
    const uid = feature.ol_uid;
    if (!seenUids.has(uid)) {
      seenUids.add(uid);
      filteredFeatures.push(feature);
    }
  }
}


