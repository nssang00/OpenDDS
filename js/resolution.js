const dpi = 90.7;
const inchPerMeter = 39.37;
const metersPerDegree = 111319.9;

// EPSG:3857 계산
const scaleToResolution3857 = (scale) => scale / (dpi * inchPerMeter);

// EPSG:4326 계산 (적도 기준)
const scaleToResolution4326 = (scale) => scale / (dpi * inchPerMeter * metersPerDegree);

// 주어진 스케일들
const scales = [25000, 50000, 100000, 250000, 500000, 1000000];

console.log("EPSG:3857 (meters/pixel):");
scales.forEach((scale) => {
  console.log(`Scale ${scale}: ${scaleToResolution3857(scale)} meters/pixel`);
});

console.log("\nEPSG:4326 (degrees/pixel):");
scales.forEach((scale) => {
  console.log(`Scale ${scale}: ${scaleToResolution4326(scale)} degrees/pixel`);
});




25K, 13-14
50K, 12-13
100K, 11-12

250K, 10-11
500K, 9-10
1M,     8-9

//openlayers
14 9.554628535647032 22737
13 19.109257071294063 45474
12 38.21851414258813 90947
11 76.43702828517625 181895
10 152.8740565703525 363789
9 305.748113140705 727579
8 611.49622628141 1455157

//arcgis
8 1155581.108577 611.49622628141
9 577790.554289 305.748113140705
10 288895.277144 152.8740565703525
11 144447.638572 76.43702828517625
12 72223.819286 38.21851414258813
13 36111.909643 19.109257071294063
14 18055.954822 9.554628535647032
[
  611.49622628141, //8
  305.748113140705,//9
  152.8740565703525,//10
  76.43702828517625,//11
  38.21851414258813,//12
  19.109257071294063,//13
  9.554628535647032//14
]

25,000: 13.2579
50,000: 26.5158
100,000: 53.0316
250,000: 132.579
500,000: 265.158
1,000,000: 530.316


  filter: [
    'all',
    ['<', ['resolution'], 10],
    ['==', ['get', 'layer'], 'landcover'],
['in', ['get', 'attr'], ['literal', ['abc', 'def', 'ghi']]],
['!', ['in', ['get', 'attr'], [0, 20, 50]]]
['<=', ['get', 'number'], 41],
  ],


  static getResolutionForScale (scale) {
    let dpi = 25.4 / 0.28;
    //let mpu = METERS_PER_UNIT[units];
    let inchesPerMeter = 39.37;

    return parseFloat(scale) / (inchesPerMeter * dpi);
  }

