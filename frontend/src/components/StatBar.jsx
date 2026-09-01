import { useEffect, useRef, useState } from 'react';

/**
 * StatBar — Top-level metrics strip.
 * Five stat pills with animated counters. Updates live via props.
 */
export default function StatBar({ processed, total, recovered, flagged, status }) {
  const stats = [
    { label: 'Total transactions', value: total, color: '#E8EAF0' },
    { label: 'Processed', value: processed, color: '#E8EAF0' },
    { label: 'Recovered', value: recovered, color: '#2DD4A0' },
    {
      label: 'Recovery rate',
      value: processed > 0 ? ((recovered / processed) * 100).toFixed(1) : '0.0',
      suffix: '%',
      color: '#2DD4A0',
    },
    { label: 'Flagged', value: flagged, color: flagged > 0 ? '#FF4D6A' : '#E8EAF0' },
  ];

  return (
    <div className="flex items-center gap-[2px] w-full h-[80px] bg-bg-surface border-b border-border px-24">
      {stats.map((stat, i) => (
        <div key={i} className="flex-1 flex flex-col justify-center items-center">
          <span
            className="text-text-secondary text-[12px] tracking-label font-normal mb-[4px]"
          >
            {stat.label}
          </span>
          <AnimatedNumber
            value={stat.value}
            suffix={stat.suffix}
            color={stat.color}
          />
        </div>
      ))}
      <div className="flex flex-col justify-center items-center pl-16">
        <span className="text-text-secondary text-[12px] tracking-label font-normal mb-[4px]">
          Status
        </span>
        <StatusIndicator status={status} />
      </div>
    </div>
  );
}

function AnimatedNumber({ value, suffix = '', color }) {
  const [display, setDisplay] = useState(0);
  const targetRef = useRef(0);
  const animRef = useRef(null);

  useEffect(() => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) {
      setDisplay(value);
      return;
    }

    const start = targetRef.current;
    targetRef.current = numValue;
    const duration = 400;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (numValue - start) * eased;
      setDisplay(
        suffix === '%'
          ? current.toFixed(1)
          : Math.round(current)
      );
      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate);
      }
    };

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(animate);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [value, suffix]);

  return (
    <span
      className="text-[24px] font-semibold tracking-display tabular-nums"
      style={{ color }}
    >
      {display}{suffix}
    </span>
  );
}

function StatusIndicator({ status }) {
  const config = {
    idle: { color: '#3D4266', label: 'Idle' },
    running: { color: '#4F7EFF', label: 'Running' },
    complete: { color: '#2DD4A0', label: 'Complete' },
    halted: { color: '#FF4D6A', label: 'Halted' },
    error: { color: '#FF4D6A', label: 'Error' },
  };
  const { color, label } = config[status] || config.idle;

  return (
    <div className="flex items-center gap-[6px]">
      <span
        className="w-[8px] h-[8px] rounded-full"
        style={{
          backgroundColor: color,
          boxShadow: status === 'running' ? `0 0 8px ${color}60` : 'none',
        }}
      />
      <span className="text-[14px] font-medium" style={{ color }}>
        {label}
      </span>
    </div>
  );
}
