  <body bgcolor="black">
    <div id="app"></div>
    <img id="myImage">
<script>
function drawVerticalLine(width, leftLength, rightLength, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = Math.max(leftLength, rightLength) * 2;

  ctx.lineWidth = width;
  ctx.strokeStyle = color;

  ctx.beginPath();
  ctx.moveTo(width / 2, leftLength);
  ctx.lineTo(width / 2, canvas.height - rightLength);
  ctx.stroke();

  return canvas.toDataURL('image/png');
}

function drawVerticalCircle(width, leftLength, rightLength, color) {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = width;
  canvas.height = Math.max(leftLength, rightLength) * 2 + width;

  ctx.translate(width / 2, Math.max(leftLength, rightLength));

  ctx.arc(0, -leftLength, width / 2, 0, 2 * Math.PI);
  ctx.arc(0, rightLength, width / 2, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();

  return canvas.toDataURL('image/png');
}





myImage.src=drawVerticalCircle(6, 10, 8, 'rgba(255, 51, 51, 1)');
//myImage.src=drawVerticalLine(1, 10, 8, 'rgba(255, 51, 51, 1)');

myImage.src=drawVerticalCircle(6, 10, 8, 'rgba(255, 51, 51, 1)');
//myImage.src=drawVerticalLine(1, 10, 8, 'rgba(255, 51, 51, 1)');

    </script>
  </body>
</html>
