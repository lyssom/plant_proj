from openalea.plantgl.all import *
scene = Scene([Cylinder(0.1, 1), Cone(0.2, 0.4)])
scene.save("tree.obj")   # 保存成 OBJ 文件
