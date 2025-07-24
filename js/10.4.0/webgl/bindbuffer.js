
import RenderFeature from 'ol/render/Feature.js';
import GeometryType   from 'ol/geom/GeometryType.js';

const DUMMY_ID = '__dummy_rf__';

/* -------------------------------------------------
   더미 RenderFeature 생성
   ------------------------------------------------- */
function makeOffScreenDummy() {
  const OFF = 4000000;               // EPSG:3857 화면 밖 좌표
  const flat = [
    OFF, OFF,        // ↘︎ 1
    OFF + 1, OFF,    // ↘︎ 2  ┐ 1×1 m 사각형
    OFF + 1, OFF+1,  // ↘︎ 3  │
    OFF,     OFF+1,  // ↘︎ 4  ┘
    OFF,     OFF     // ↘︎ 닫힘
  ];
  const ends = [flat.length];        // 단일 ring → ends 배열 1개

  return new RenderFeature(
    GeometryType.POLYGON,            // geometry type
    flat,                            // flatCoordinates
    ends,                            // ends (ring 끝 인덱스)
    null,                            // properties
    DUMMY_ID                         // id
  );
}

/* -------------------------------------------------
   generateBuffersFromFeatures 수정
   ------------------------------------------------- */
async generateBuffersFromFeatures(features, transform) {
  const filteredFeatures = [];
  const featureIdSet     = new Set();

  for (const styleShader of this.styleShaders) {
    const subset = styleShader.featureFilter
        ? features.filter(styleShader.featureFilter)
        : features;

    for (const rf of subset) {
      const fid = rf.getId() ?? rf.ol_uid;
      if (!featureIdSet.has(fid)) {
        featureIdSet.add(fid);
        filteredFeatures.push(rf);
      }
    }
  }

  /* ✨ 폴리곤이 1개뿐일 때 더미 RenderFeature 삽입 */
  if (
    filteredFeatures.length === 1 &&
    !featureIdSet.has(DUMMY_ID)
  ) {
    const dummyRF = makeOffScreenDummy();
    filteredFeatures.push(dummyRF);
    featureIdSet.add(DUMMY_ID);
  }

  /* 이후: filteredFeatures → attribute/vertex 버퍼 생성 ... */
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
