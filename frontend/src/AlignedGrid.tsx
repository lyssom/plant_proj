import * as THREE from 'three'
import { useMemo } from 'react'
import { Line } from '@react-three/drei'

interface AlignedGridProps {
  rows: number
  cols: number
  cellSize: number
  color?: string
  lineWidth?: number
  position?: [number, number, number]
}

/**
 * ✅ 完全对齐 ClickablePlane 的网格组件
 * - 从 (0,0) 左上角开始绘制
 * - 精确对齐 CELL_SIZE
 * - 行列奇偶都正确
 * - 可与 groupOffset 一起偏移
 */
export function AlignedGrid({
  rows,
  cols,
  cellSize,
  color = '#a9a9a9',
  lineWidth = 1,
  position = [0, 0, 0],
}: AlignedGridProps) {
  const { verticalLines, horizontalLines } = useMemo(() => {
    const v: JSX.Element[] = []
    const h: JSX.Element[] = []

    const width = cols * cellSize
    const height = rows * cellSize

    // 垂直线（Z方向）
    for (let i = 0; i <= cols; i++) {
      const x = i * cellSize
      v.push(
        <Line
          key={`v-${i}`}
          points={[
            [x, 0, 0],
            [x, 0, height],
          ]}
          color={color}
          lineWidth={lineWidth}
        />
      )
    }

    // 水平线（X方向）
    for (let j = 0; j <= rows; j++) {
      const z = j * cellSize
      h.push(
        <Line
          key={`h-${j}`}
          points={[
            [0, 0, z],
            [width, 0, z],
          ]}
          color={color}
          lineWidth={lineWidth}
        />
      )
    }

    return { verticalLines: v, horizontalLines: h }
  }, [rows, cols, cellSize, color, lineWidth])

  return <group position={position}>{verticalLines}{horizontalLines}</group>
}
