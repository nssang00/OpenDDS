function drawVerticalLine(width, length, color) {
  // canvas 요소 생성
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  // canvas 크기 설정
  canvas.width = width;
  canvas.height = length;

  // 선 스타일 설정
  ctx.lineWidth = width;
  ctx.strokeStyle = color;

  // 선 그리기
  ctx.beginPath();
  ctx.moveTo(width / 2, 0);
  ctx.lineTo(width / 2, length);
  ctx.stroke();

  // canvas를 PNG 형태로 반환
  return canvas.toDataURL('image/png');
}
