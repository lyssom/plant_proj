import math
import random
import matplotlib.pyplot as plt

def clustered_circle_packing(width, height, radii, padding=0.01, visualize=True):
    """
    在一个方格(width x height)内放置不同半径的圆
    - radii: list[float]，每个圆的半径
    - padding: 圆之间最小间距
    - 相同半径圆尽量聚在一起
    - 大圆在中心，小圆围绕大圆排列
    - 返回: list of dict {x, y, r}
    """
    # Step1: 按半径聚类
    from collections import defaultdict
    clusters = defaultdict(list)
    for r in radii:
        clusters[r].append(r)
    cluster_groups = sorted(clusters.keys(), reverse=True)  # 大->小

    placed = []
    cx, cy = width / 2, height / 2  # 方格中心
    last_layer_rmax = 0

    # Step2: 按层放置
    for idx, r_val in enumerate(cluster_groups):
        current = clusters[r_val]
        n = len(current)
        if n == 0:
            continue

        if idx == 0:
            # 最大圆放中心
            placed.append({'x': cx, 'y': cy, 'r': r_val})
            last_layer_rmax = r_val
        else:
            # 环半径
            ring_r = last_layer_rmax + r_val + padding
            angle_step = 2 * math.pi / n
            for i in range(n):
                angle = i * angle_step + random.uniform(-0.05, 0.05)
                x = cx + math.cos(angle) * ring_r
                y = cy + math.sin(angle) * ring_r

                # 边界约束
                x = max(r_val, min(width - r_val, x))
                y = max(r_val, min(height - r_val, y))

                # 再次检查与已放置圆是否重叠
                overlap = False
                for p in placed:
                    dx = x - p['x']
                    dy = y - p['y']
                    dist = math.sqrt(dx*dx + dy*dy)
                    if dist < r_val + p['r'] + padding:
                        overlap = True
                        break
                if not overlap:
                    placed.append({'x': x, 'y': y, 'r': r_val})

            last_layer_rmax = ring_r + r_val  # 更新下一层半径

    # 可选：可视化
    if visualize:
        fig, ax = plt.subplots(figsize=(6,6))
        ax.set_xlim(0, width)
        ax.set_ylim(0, height)
        ax.set_aspect('equal')
        for c in placed:
            circle = plt.Circle((c['x'], c['y']), c['r'], edgecolor='black', facecolor='orange', alpha=0.6)
            ax.add_patch(circle)
        plt.show()

    return placed

# ==========================
# 测试示例
# ==========================
if __name__ == "__main__":
    radii = [0.18, 0.14, 0.14, 0.10, 0.10, 0.08, 0.08, 0.05, 0.05, 0.05]
    circles = clustered_circle_packing(1.0, 1.0, radii, padding=0.005)
    for c in circles:
        print(f"x={c['x']:.3f}, y={c['y']:.3f}, r={c['r']:.3f}")
