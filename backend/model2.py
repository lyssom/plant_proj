from openalea.plantgl.all import *
from openalea.lpy import Lsystem
from math import ceil, sqrt, floor

# 初始化L系统
ls = Lsystem('simple_growth.lpy')
tree = ls.axiom
rows = cols = ceil(sqrt(ls.derivationLength))
size = rows
cell = 1
start = -size/2 + cell/2

# 创建场景（用于保存到.obj文件）
scene = Scene()

# 设置材质：这里我们选择绿色
material = Material(Color3(0.0, 1.0, 0.0))  # 绿色

# 添加初始树模型，并为其设置材质
tree_object = ls.sceneInterpretation(ls.axiom)
for obj in tree_object:
    obj.material = material
scene += tree_object

# 保存每一层树模型
for i in range(1, ls.derivationLength):
    row = floor(i / rows)
    col = (i - row * cols)
    x = row + start
    y = col + start
    tree = ls.derive(tree, i, 1)
    tree_object = ls.sceneInterpretation(tree)
    for obj in tree_object:
        obj.material = material  # 为每一层树模型设置颜色
    scene += tree_object

# 保存场景为.obj文件
scene.save('tree_scene.obj')
