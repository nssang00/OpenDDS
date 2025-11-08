v_distancePx = a_distanceLow / u_resolution - (lineOffsetPx * a_angleTangentSum);
float distanceHighPx = a_distanceHigh / u_resolution;

v_distancePx += distanceHighPx;

${
this.strokePatternLengthExpression_ !== null
? `v_distancePx = mod(v_distancePx, ${this.strokePatternLengthExpression_});`
: ''
}
///////
- v_distancePx = a_distanceLow / u_resolution - (lineOffsetPx * a_angleTangentSum);
- float distanceHighPx = a_distanceHigh / u_resolution;
- ${
-   this.strokePatternLengthExpression_ !== null
-     ? `v_distancePx = mod(v_distancePx, ${this.strokePatternLengthExpression_});
- distanceHighPx = mod(distanceHighPx, ${this.strokePatternLengthExpression_});
- `
-     : ''
- }v_distancePx += distanceHighPx;
+ float distancePx = (a_distanceLow + a_distanceHigh) / u_resolution;
+ distancePx -= (lineOffsetPx * a_angleTangentSum);
+ ${
+   this.strokePatternLengthExpression_ !== null
+     ? `distancePx = mod(distancePx, ${this.strokePatternLengthExpression_});`
+     : ''
+ }
+ v_distancePx = distancePx;
