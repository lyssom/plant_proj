from openalea.plantgl.all import *

def create_flower(petal_count=5, petal_length=1.0, petal_width=0.4,
                  stem_height=2.0, stem_radius=0.05,
                  leaf_count=6, leaf_length=0.6, leaf_width=0.2):

    # 茎干
    stem = Cylinder(radius=stem_radius, height=stem_height, bottom=True)
    stem_material = Material(Color3(0.0, 0.8, 0.0))  # 绿色
    stem_geom = Shape(stem, stem_material)

    # 叶片
    leaves = []
    for i in range(leaf_count):
        leaf = TriangleSet([
            Vector3(0, 0, 0),
            Vector3(leaf_length, 0, leaf_width/2),
            Vector3(leaf_length, 0, -leaf_width/2)
        ])
        # 旋转和偏移
        angle = i * (360.0 / leaf_count)
        leaf_trans = Transform(leaf, (0, stem_height/2, 0), Vector3(0,1,0), angle)
        leaf_shape = Shape(leaf_trans, Material(Color3(0,1,0)))  # 绿色
        leaves.append(leaf_shape)

    # 花瓣
    petals = []
    for i in range(petal_count):
        petal = BezierPatch([
            Vector3(0,0,0),
            Vector3(petal_length/2,0,petal_width),
            Vector3(petal_length,0,0),
            Vector3(petal_length/2,0,-petal_width)
        ])
        angle = i * (360.0 / petal_count)
        petal_trans = Transform(petal, (0, stem_height, 0), Vector3(0,1,0), angle)
        petal_shape = Shape(petal_trans, Material(Color3(1,0,0)))  # 红色
        petals.append(petal_shape)

    # 合并所有部件
    flower_scene = Scene([stem_geom] + leaves + petals)

    return flower_scene

# 生成模型
flower_model = create_flower()
# 导出 OBJ 文件
PGLScene.save(flower_model, "rose.obj", "obj")
