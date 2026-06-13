import { useEffect, useRef, useCallback } from 'react';

const DROPS = 60;
const BUBBLES = 20;

export default function VideoBackground() {
  const canvasRef = useRef(null);
  const dropsRef = useRef([]);
  const bubblesRef = useRef([]);
  const rafRef = useRef(null);

  const animate = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    dropsRef.current = dropsRef.current.map((d) => {
      d.y += d.speed;
      d.x += Math.sin(d.y * 0.02) * 0.3;

      if (d.y > h + 5) {
        return {
          x: Math.random() * w,
          y: -5,
          speed: Math.random() * 2 + 1.5,
          len: Math.random() * 12 + 6,
          o: Math.random() * 0.25 + 0.1,
        };
      }

      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - 0.5, d.y - d.len);
      ctx.strokeStyle = `rgba(255, 255, 255, ${d.o})`;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      return d;
    });

    bubblesRef.current = bubblesRef.current.map((b) => {
      b.y -= b.vy;
      b.x += Math.sin(b.y * 0.03) * 0.2;

      if (b.y < -20) {
        return {
          x: Math.random() * w,
          y: h + 20,
          r: Math.random() * 8 + 3,
          vy: Math.random() * 0.3 + 0.15,
          o: Math.random() * 0.2 + 0.1,
        };
      }

      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${b.o})`;
      ctx.fill();
      ctx.strokeStyle = `rgba(255, 255, 255, ${b.o * 0.3})`;
      ctx.lineWidth = 0.5;
      ctx.stroke();

      return b;
    });

    rafRef.current = requestAnimationFrame(animate);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
      const w = canvas.width;
      const h = canvas.height;

      dropsRef.current = Array.from({ length: DROPS }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        speed: Math.random() * 2 + 1.5,
        len: Math.random() * 12 + 6,
        o: Math.random() * 0.25 + 0.1,
      }));

      bubblesRef.current = Array.from({ length: BUBBLES }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: Math.random() * 8 + 3,
        vy: Math.random() * 0.3 + 0.15,
        o: Math.random() * 0.2 + 0.1,
      }));
    };

    resize();
    window.addEventListener('resize', resize);
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [animate]);

  return (
    <div className="absolute inset-0 overflow-hidden bg-slate-900">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      >
        <source src="https://assets.mixkit.co/videos/47586/47586-720.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/30" />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />
    </div>
  );
}
