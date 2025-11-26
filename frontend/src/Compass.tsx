// Compass.tsx
import React from 'react';

interface CompassProps {
  rotation: number; // 0~360度
  size?: number;
}

export const Compass: React.FC<CompassProps> = ({ rotation, size = 100 }) => {
  const center = 50;
  const radius = 45;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        position: 'absolute',
        top: 20,
        right: 20,
        zIndex: 1000,
        pointerEvents: 'none', // 不影响鼠标事件
      }}
    >
      {/* 外环 */}
      <circle
        cx={center}
        cy={center}
        r={radius}
        stroke="rgba(0,0,0,0.6)"
        strokeWidth="2"
        fill="rgba(255,255,255,0.2)"
      />

      {/* 分刻度 */}
      {[...Array(36)].map((_, i) => {
        const angle = (i * 10 * Math.PI) / 180;
        const inner = i % 3 === 0 ? radius - 6 : radius - 3; // 大刻度每30°
        const x1 = center + inner * Math.sin(angle);
        const y1 = center - inner * Math.cos(angle);
        const x2 = center + radius * Math.sin(angle);
        const y2 = center - radius * Math.cos(angle);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(0,0,0,0.5)" strokeWidth={i % 3 === 0 ? 2 : 1} />;
      })}

      {/* 箭头指针 */}
      <polygon
        points={`${center},${center - radius + 5} 
                 ${center - 4},${center + 5} 
                 ${center + 4},${center + 5}`}
        fill="red"
        transform={`rotate(${rotation} ${center} ${center})`}
        style={{ filter: 'drop-shadow(0 0 2px rgba(0,0,0,0.5))' }}
      />

      {/* 中心圆 */}
      <circle cx={center} cy={center} r={4} fill="rgba(0,0,0,0.7)" />

      {/* 四个方向字母 */}
      {['N', 'E', 'S', 'W'].map((dir, i) => {
        const angle = (i * 90 * Math.PI) / 180;
        const x = center + (radius - 12) * Math.sin(angle);
        const y = center - (radius - 12) * Math.cos(angle) + 4; // 调整文字垂直偏移
        return (
          <text
            key={dir}
            x={x}
            y={y}
            textAnchor="middle"
            fontSize="10"
            fontWeight="bold"
            fill="black"
          >
            {dir}
          </text>
        );
      })}
    </svg>
  );
};
