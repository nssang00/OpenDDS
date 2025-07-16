const seenUids = new Set();

const filtered = features.filter((feature) => {
  if (styleShader.featureFilter && !styleShader.featureFilter(feature)) {
    return false;
  }
  const uid = feature.ol_uid;
  if (seenUids.has(uid)) {
    return false;
  }
  seenUids.add(uid);
  return true;
});
