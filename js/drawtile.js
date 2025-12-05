for (let j = 0, jj = zs.length; j < jj; ++j) {  
      const tileZ = zs[j];  
      for (const tileRepresentation of representationsByZ[tileZ]) {  
        const tileCoord = tileRepresentation.tile.tileCoord;  
        const tileCoordKey = getTileCoordKey(tileCoord);  
        if (tileCoordKey in alphaLookup) {  
          continue;  
        }  
  
        this.drawTile_(  
          frameState,  
          tileRepresentation,  
          tileZ,  
          gutter,  
          extent,  
          alphaLookup,  
          tileGrid,  
        );  
      }  
    }  
  
    drawTile_(  
      frameState,  
      tileRepresentation,  
      tileZ,  
      gutter,  
      extent,  
      alphaLookup,  
      tileGrid,  
    ) {  
      if (!tileRepresentation.ready) {  
        return;  
      }  
      const tile = tileRepresentation.tile;  
      const tileCoord = tile.tileCoord;  
      const tileCoordKey = getTileCoordKey(tileCoord);  
      const alpha = tileCoordKey in alphaLookup ? alphaLookup[tileCoordKey] : 1;  
    
      const tileResolution = tileGrid.getResolution(tileZ);  
      const tileSize = toSize(tileGrid.getTileSize(tileZ), this.tempSize_);  
      const tileOrigin = tileGrid.getOrigin(tileZ);  
      const tileExtent = tileGrid.getTileCoordExtent(tileCoord);  
      // tiles with alpha are rendered last to allow blending  
      const depth = alpha < 1 ? -1 : depthForZ(tileZ);  
      if (alpha < 1) {  
        frameState.animate = true;  
      }  
    
      const viewState = frameState.viewState;  
      const centerX = viewState.center[0];  
      const centerY = viewState.center[1];  
    
      const tileWidthWithGutter = tileSize[0] + 2 * gutter;  
      const tileHeightWithGutter = tileSize[1] + 2 * gutter;  
    
      const aspectRatio = tileWidthWithGutter / tileHeightWithGutter;  
    
      const centerI = (centerX - tileOrigin[0]) / (tileSize[0] * tileResolution);  
      const centerJ = (tileOrigin[1] - centerY) / (tileSize[1] * tileResolution);  
    
      const tileScale = viewState.resolution / tileResolution;  
    
      const tileCenterI = tileCoord[1];  
      const tileCenterJ = tileCoord[2];  
    
      resetTransform(this.tileTransform_);  
      scaleTransform(  
        this.tileTransform_,  
        2 / ((frameState.size[0] * tileScale) / tileWidthWithGutter),  
        -2 / ((frameState.size[1] * tileScale) / tileWidthWithGutter),  
      );  
      rotateTransform(this.tileTransform_, viewState.rotation);  
      scaleTransform(this.tileTransform_, 1, 1 / aspectRatio);  
      translateTransform(  
        this.tileTransform_,  
        (tileSize[0] * (tileCenterI - centerI) - gutter) / tileWidthWithGutter,  
        (tileSize[1] * (tileCenterJ - centerJ) - gutter) / tileHeightWithGutter,  
      );  
    
      this.renderTile(  
        /** @type {TileRepresentation} */ (tileRepresentation),  
        this.tileTransform_,  
        frameState,  
        extent,  
        tileResolution,  
        tileSize,  
        tileOrigin,  
        tileExtent,  
        depth,  
        gutter,  
        alpha,  
      );  
    }      
  
    renderTile(  
      tileRepresentation,  
      tileTransform,  
      frameState,  
      renderExtent,  
      tileResolution,  
      tileSize,  
      tileOrigin,  
      tileExtent,  
      depth,  
      gutter,  
      alpha,  
    ) {  
      const gutterExtent = getIntersection(tileExtent, renderExtent, tileExtent);  
      const tileZ = tileRepresentation.tile.getTileCoord()[0];  
      const buffers = tileRepresentation.buffers;  
      if (!buffers) {  
        return;  
      }  
      this.styleRenderer_.render(buffers, frameState, () => {  
        this.applyUniforms_(  
          alpha,  
          gutterExtent,  
          buffers.invertVerticesTransform,  
          tileZ,  
          depth,  
        );  
      });  
    }  
  
    render(buffers, frameState, preRenderCallback) {  
      for (const renderPass of this.renderPasses_) {  
        //kmg  
        if (renderPass.contextFilter) {  
          if(!renderPass.contextFilter(frameState.viewState.resolution)) {  
            continue;  
          }  
        }  
    
        renderPass.fillRenderPass &&  
          this.renderInternal_(  
            buffers.polygonBuffers[0],  
            buffers.polygonBuffers[1],  
            buffers.polygonBuffers[2],  
            renderPass.fillRenderPass,  
            frameState,  
            preRenderCallback,  
          );  
        renderPass.strokeRenderPass &&  
          this.renderInternal_(  
            buffers.lineStringBuffers[0],  
            buffers.lineStringBuffers[1],  
            buffers.lineStringBuffers[2],  
            renderPass.strokeRenderPass,  
            frameState,  
            preRenderCallback,  
          );  
        renderPass.symbolRenderPass &&  
          this.renderInternal_(  
            buffers.pointBuffers[0],  
            buffers.pointBuffers[1],  
            buffers.pointBuffers[2],  
            renderPass.symbolRenderPass,  
            frameState,  
            preRenderCallback,  
          );  
      }  
    }  
    renderInternal_(  
      indicesBuffer,  
      vertexAttributesBuffer,  
      instanceAttributesBuffer,  
      subRenderPass,  
      frameState,  
      preRenderCallback,  
    ) {  
      //kmg  
      //const renderCount = indicesBuffer.getSize();  
      const renderCount = this.helper_.getSize(indicesBuffer);  
      if (renderCount === 0) {  
        return;  
      }  
    
      const usesInstancedRendering = subRenderPass.instancedAttributesDesc.length;  
    
      this.helper_.useProgram(subRenderPass.program, frameState);  
      this.helper_.bindBuffer(vertexAttributesBuffer);  
      this.helper_.bindBuffer(indicesBuffer);  
      this.helper_.enableAttributes(subRenderPass.attributesDesc);  
      this.helper_.bindBuffer(instanceAttributesBuffer);  
      this.helper_.enableAttributesInstanced(  
        subRenderPass.instancedAttributesDesc,  
      );  
    
      preRenderCallback();  
    
      if (usesInstancedRendering) {  
        const instanceAttributesStride =  
          subRenderPass.instancedAttributesDesc.reduce(  
            (prev, curr) => prev + (curr.size || 1),  
            0,  
          );  
        //kmg  
        //const instanceCount =  
        //  instanceAttributesBuffer.getSize() / instanceAttributesStride;  
        const instanceCount = this.helper_.getSize(instanceAttributesBuffer)  / instanceAttributesStride;  
    
        this.helper_.drawElementsInstanced(0, renderCount, instanceCount);  
      } else {  
        this.helper_.drawElements(0, renderCount);  
      }  
    }  
  
기존 openlayers 코드는 타일마다 polygon, linestring, symbol을 렌더링하기때문에  
useprogram을 여러번 호출하는 구조야. 한번에 여러개의 타일을 polygon, linestring, symbol을 배치 처리해서   
useprogram은 3번만 사용하는 구조로 변경하려고해. 그러려면 구조가 많이 변경해야해서  
클로저 같은거로 실행해야 할 함수들을 나중에 배치로 몰아서 처리하고 싶은데
