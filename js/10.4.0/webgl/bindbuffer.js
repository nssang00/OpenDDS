import Feature from 'ol/Feature';
import {Polygon} from 'ol/geom';

const DUMMY_ID = '__dummy_polygon__';

/* -------------------------------------------
   1) 오프-스크린 더미 폴리곤 생성 함수
   ------------------------------------------- */
function makeOffScreenDummy() {
  // EPSG:3857 좌표. 4,000,000 m 는 일반 뷰포트 밖.
  const OFF = 4000000;
  const ring = [[
    [OFF, OFF],
    [OFF + 1, OFF],
    [OFF + 1, OFF + 1],
    [OFF,     OFF + 1],
    [OFF,     OFF]
  ]];

  const dummy = new Feature({
    geometry: new Polygon(ring),
  });
  dummy.setId(DUMMY_ID);          // 중복 삽입 방지
  return dummy;
}

async generateBuffersFromFeatures(features, transform) {
  const filteredFeatures = [];
  const featureIdSet = new Set();

  for (const styleShader of this.styleShaders) {
    const filtered = styleShader.featureFilter
      ? features.filter(styleShader.featureFilter)
      : features;

    for (const feature of filtered) {
      const fid = feature.getId() || feature.ol_uid;
      if (!featureIdSet.has(fid)) {
        featureIdSet.add(fid);
        filteredFeatures.push(feature);
      }
    }
  }
  if (
    filteredFeatures.length === 1 &&          // 실제 폴리곤 1개
    !featureIdSet.has(DUMMY_ID)               // 아직 더미 없음
  ) {
    const dummy = makeOffScreenDummy();
    filteredFeatures.push(dummy);
    featureIdSet.add(DUMMY_ID);
  }

  /* 3) 이후 generateBuffersFromFeatures 에서
        filteredFeatures 배열을 사용해
        GPU 버퍼(positions, indices 등) 생성 → 정상 렌더링 */
}

////////
    const featureIdSet = new Set();
    for (const styleShader of this.styleShaders) {
      const filtered = styleShader.featureFilter
        ? features.filter(styleShader.featureFilter)
        : features;

      for (const feature of filtered) {
        let featureId = feature.getId() || feature.ol_uid || feature.properties_.id;
        if (!featureIdSet.has(featureId) || featureId === undefined) {
          featureId != null && featureIdSet.add(featureId);
          filteredFeatures.push(feature);
        }
      }
    }

bindBuffer(buffer) {
    const gl = this.gl_;
    //kmg
    if(buffer instanceof WebGLBuffer) {
      if(this.webGlBufferCache_.has(buffer)) {
        const bufferCache = this.webGlBufferCache_.get(buffer);
        gl.bindBuffer(bufferCache.target, buffer);
      }
      return;
    }

    const bufferKey = getUid(buffer);
    let bufferCache = this.bufferCache_[bufferKey];
    if (!bufferCache) {
      const webGlBuffer = gl.createBuffer();
      bufferCache = {
        buffer: buffer,
        webGlBuffer: webGlBuffer,
      };
      this.bufferCache_[bufferKey] = bufferCache;
    }
    gl.bindBuffer(buffer.getType(), bufferCache.webGlBuffer);
  }

  /**
   * Update the data contained in the buffer array; this is required for the
   * new data to be rendered
   * @param {import("./Buffer").default} buffer Buffer.
   */
  
  flushBufferData(buffer, target, usage) {
    const gl = this.gl_;
    //kmg
    if(buffer instanceof Uint32Array || buffer instanceof Float32Array)
    {
      const webGlBuffer = gl.createBuffer();

      gl.bindBuffer(target, webGlBuffer);
      gl.bufferData(target, buffer, usage);

      const bufferCache = { target: target, size: buffer?.length ?? 0};
      this.webGlBufferCache_.set(webGlBuffer, bufferCache);    

      return webGlBuffer;
    } 

    this.bindBuffer(buffer);
    gl.bufferData(buffer.getType(), buffer.getArray(), buffer.getUsage());
  }
  

  /**
   * @param {import("./Buffer.js").default} buf Buffer.
   */
  deleteBuffer(buf) {
    //kmg
    if(buf instanceof WebGLBuffer) {
      delete this.webGlBufferCache_.delete(buf);
      return;
    }

    const bufferKey = getUid(buf);
    // Note: gl.deleteBuffer is not called here since we let WebGL garbage collect it automatically
    delete this.bufferCache_[bufferKey];
  }

  //kmg
  getSize(buffer) {
    return this.webGlBufferCache_.get(buffer)?.size ?? 0;
  }
