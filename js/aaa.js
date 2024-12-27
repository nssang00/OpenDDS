styleparser.js
  const evaluators = {};
  if (style.filter) {
    const parsedFilter = expressionToGlsl(
      fragContext,
      style.filter,
      BooleanType,
    );
    builder.setFragmentDiscardExpression(`!${parsedFilter}`);

    //kmg
    const { featureFilters, contextFilters } = splitFilters(style.filter);
    const parsingContext = newParsingContext();
    evaluators.featurefilter =
      featureFilters.length > 0 ? buildCpuExpression(featureFilters, BooleanType, parsingContext)
        : (parsingContext) => true;  
    evaluators.contextfilter =
      contextFilters.length > 0 ? buildCpuExpression(contextFilters, BooleanType, parsingContext)
        : (parsingContext) => true;          
  }

  return {
    builder: builder,
    attributes: attributes.reduce(
      (prev, curr) => ({
        ...prev,
        [curr.name]: {callback: curr.callback, size: curr.size},
      }),
      {},
    ),
    uniforms: uniforms,
    evaluators: evaluators,//kmg
  };

///////

VectorStyleRedner.js

    let shaders = /** @type {StyleShaders} */ (styleOrShaders);
    const isShaders = 'builder' in styleOrShaders;
    if (!isShaders) {
      const parseResult = parseLiteralStyle(
        /** @type {import('../../style/webgl.js').WebGLStyle} */ (
          styleOrShaders
        ),
      );
      shaders = {
        builder: parseResult.builder,
        attributes: parseResult.attributes,
        uniforms: parseResult.uniforms,
        evaluators: parseResult.evaluators,//kmg
      };
    }
    //kmg
    this.evaluators_ = shaders.evaluators;
