import { useState } from 'react';

type Print = { title: string; slug: string; points: string; kk: boolean };

function renderPrint({ title, points, kk }: Print) {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 1000;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');

  const sea = ctx.createLinearGradient(0, 0, 1120, 1080);
  sea.addColorStop(0, '#173c50');
  sea.addColorStop(.42, '#0c2537');
  sea.addColorStop(1, '#03121e');
  ctx.fillStyle = sea;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Long, open caustics let the actual geometry of the winning ray stay legible.
  for (let i = 0; i < 21; i++) {
    const y = 540 + i * 8;
    ctx.beginPath();
    ctx.moveTo(-60,y);
    ctx.bezierCurveTo(280,y-160-i*7,360,1180-i*3,690,850-i*4);
    ctx.bezierCurveTo(940,570+i*4,1000,1080-i*13,1290,815-i*9);
    ctx.strokeStyle = i % 7 === 0 ? '#88c2c858' : '#80baca13';
    ctx.lineWidth = 1 + Math.cos(i) * .6;
    ctx.stroke();
  }

  ctx.fillStyle = '#b8d4d9';
  ctx.font = '500 28px Inter, sans-serif';
  ctx.fillText(kk ? 'Жарық ізі' : 'Отпечаток света',72,86);
  ctx.font = '550 82px Inter, sans-serif';
  ctx.fillStyle = '#f0f6f2';
  ctx.fillText(title, 68, 183, 1060);

  const vertices = points.split(' ').map(pair => pair.split(',').map(Number));
  ctx.save();
  // Map the game's 600×400 viewBox with one uniform scale.
  ctx.translate(111,213);
  ctx.scale(1.63,1.63);
  const ray = new Path2D();
  for (const [index,[x,y]] of vertices.entries()) {
    if (index === 0) ray.moveTo(x,y);
    else ray.lineTo(x,y);
  }
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = '#ffbd72';
  ctx.shadowBlur = 17;
  ctx.strokeStyle = '#edb573';
  ctx.lineWidth = 2.8;
  ctx.stroke(ray);
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#fff2cf';
  ctx.lineWidth = 1;
  ctx.stroke(ray);
  vertices.forEach(([x,y],i)=>{
    ctx.beginPath();
    ctx.arc(x,y,i === vertices.length-1 ? 9 : 4.5,0,2*Math.PI);
    ctx.fillStyle = '#efca82';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x,y,i === vertices.length-1 ? 16 : 8,0,2*Math.PI);
    ctx.strokeStyle = '#f4d09d88';
    ctx.lineWidth = .65;
    ctx.stroke();
  });
  ctx.restore();

  ctx.fillStyle = '#c6dce0';
  ctx.font = '450 23px Inter, sans-serif';
  ctx.fillText(kk ? 'Призмалар арқылы өткен сәулеңіз' : 'Ваш путь луча через призмы',72,931);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f2f2e9';
  ctx.fillText('yeahayat.dev',1128,931);
  return canvas;
}

export default function LightPrint(props: Print) {
  const [failed, setFailed] = useState(false);
  function save() {
    setFailed(false);
    try {
      renderPrint(props).toBlob(blob => {
        if (!blob) { setFailed(true); return; }
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'yeahayat-' + props.slug + '-light.png';
        document.body.append(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      },'image/png');
    } catch { setFailed(true); }
  }
  return <>
    <button type="button" onClick={save}>{props.kk ? 'Жарық ізін сақтау' : 'Сохранить отпечаток'} ↓ PNG</button>
    {failed && <span role="status">{props.kk ? 'Сақтау мүмкін болмады. Қайталап көріңіз.' : 'Не удалось сохранить. Попробуйте ещё раз.'}</span>}
  </>;
}
