const optionalAttributesDesc = [
  {
    name: Attributes.MEASURE_START,
    size: 2,
    type: AttributeType.Float,
  },
  {
    name: Attributes.MEASURE_END,
    size: 2,
    type: AttributeType.Float,
  },
];

// optionalAttributesDesc의 name들을 Set으로 변환
const optionalNames = new Set(optionalAttributesDesc.map(attr => attr.name));

// optionalNames에 포함되지 않은 항목만 필터링
instancedAttributesDesc = instancedAttributesDesc.filter(
  attr => !optionalNames.has(attr.name)
);
