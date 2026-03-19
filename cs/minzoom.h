  fprintf(fp, "  \"bounds\": [ %.2f, %.2f, %.2f, %.2f ],\n",
    bounds.getMinX(),
    bounds.getMinY(),
    bounds.getMaxX(),
    bounds.getMaxY());

  // ↓↓↓ 추가된 부분 ↓↓↓
  int minZoom = -1, maxZoom = -1;
  for (int i = 0; i < (int)levels.size(); i++) {
    const LevelInfo &level = levels[i];
    if (level.finalX >= level.startX) {
      if (minZoom < 0) minZoom = i;
      maxZoom = i;
    }
  }
  if (minZoom >= 0) {
    fprintf(fp, "  \"minzoom\": %i,\n", minZoom);
    fprintf(fp, "  \"maxzoom\": %i,\n", maxZoom);
  }
  // ↑↑↑ 추가된 부분 ↑↑↑
