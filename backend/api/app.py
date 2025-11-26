from copy import deepcopy
from flask import Flask, request, jsonify, send_from_directory, send_file
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os, json, random
from collections import defaultdict
from flask_jwt_extended import  JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
import base64, io
from fpdf import FPDF
import math
import re
from openai import OpenAI
from sqlalchemy import and_
from sqlalchemy.dialects import sqlite

app = Flask(__name__, static_folder="../../frontend/dist", template_folder="../../frontend/dist")
CORS(app)

# SQLite 配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///plants.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

app.config["JWT_SECRET_KEY"] = "123456"  # 随机生成个安全的 key
jwt = JWTManager(app)



@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    if path != "" and os.path.exists(app.static_folder + "/" + path):
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, "index.html")




# —— 工具函数 ——
def ok(data=None, **extra):
    payload = {"code": 0, "msg": "ok", "data": data}
    payload.update(extra)
    return jsonify(payload)

def err(msg="error", code=1, status=400):
    return jsonify({"code": code, "msg": msg}), status

# ORM 模型
class Users(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    telephone  = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
class Reserve(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    reserve_type = db.Column(db.String(128), nullable=False)
    detail = db.Column(db.Text, nullable=False)
    reserve_time = db.Column(db.String(128), nullable=False)
    status = db.Column(db.String(128), nullable=False)



class Plants(db.Model):

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String, nullable=True)                 # 植物名称
    family = db.Column(db.String, nullable=True)               # 科
    genus = db.Column(db.String, nullable=True)                # 属
    latin_name = db.Column(db.String, nullable=True)           # 拉丁名
    lifecycle = db.Column(db.String, nullable=True)            # 生命周期
    classification = db.Column(db.String, nullable=True)       # 植物分类
    crown_width = db.Column(db.String, nullable=True)          # 冠幅
    sunlight = db.Column(db.String, nullable=True)             # 日照
    water_need = db.Column(db.String, nullable=True)           # 需水量
    self_sowing = db.Column(db.String, nullable=True)          # 自播能力
    lodging_resistance = db.Column(db.String, nullable=True)   # 抗倒伏情况
    color = db.Column(db.String, nullable=True)                # 色系
    usage = db.Column(db.Text, nullable=True)                  # 用途/特点
    control_methods = db.Column(db.Text, nullable=True)        # 防治方法
    common_diseases = db.Column(db.Text, nullable=True)        # 常见病害
    pruning = db.Column(db.String, nullable=True)              # 修剪节点
    watering_frequency = db.Column(db.String, nullable=True)   # 浇水频率
    needs_support = db.Column(db.String, nullable=True)        # 是否需要支架
    hard_zone = db.Column(db.String, nullable=True)            # 耐寒分区
    rock = db.Column(db.String, nullable=True)                 # 岩石园
    insect = db.Column(db.String, nullable=True)               # 昆虫友好花园
    edible = db.Column(db.String, nullable=True)               # 可食花园
    meadow = db.Column(db.String, nullable=True)               # 混合草甸花园
    rain_garden = db.Column(db.String, nullable=True)          # 雨水花园
    healing = db.Column(db.String, nullable=True)              # 疗愈花园
    scent_garden = db.Column(db.String, nullable=True)         # 芳香花园
    normal_garden = db.Column(db.String, nullable=True)        # 零维护花园
    model_path = db.Column(db.Text, nullable=True)
    show_type = db.Column(db.String, nullable=True)
    color_hex = db.Column(db.String, nullable=True)
    


# 创建数据库表
def create_tables():
    """创建数据库表"""
    with app.app_context():
        db.create_all()
        # print("数据库表创建完成")

# 初始化数据库
create_tables()

@app.route("/login", methods=["POST"])
def login():
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "请求参数必须为 JSON"}), 400

    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"success": False, "message": "用户名和密码不能为空"}), 400

    # 从数据库查询用户
    user = Users.query.filter_by(username=username).first()
    
    if user and user.check_password(password):
        access_token = create_access_token(
            identity=username,
            expires_delta=timedelta(hours=2)   # token 2小时过期
        )
        return jsonify({
            "success": True,
            "message": "登录成功",
            "token": access_token,
            "username": username
        }), 200
    else:
        return jsonify({"success": False, "message": "用户名或密码错误"}), 401

# 注册接口
@app.route("/register", methods=["POST"])
def register():
    data = request.json
    if not data:
        return jsonify({"success": False, "message": "请求参数必须为 JSON"}), 400

    username = data.get("username")
    password = data.get("password")
    telephone = data.get("phone", "")

    if not username or not password:
        return jsonify({"success": False, "message": "用户名和密码不能为空"}), 400

    # 检查用户名是否存在
    if Users.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "用户名已存在"}), 400

    # 创建用户
    user = Users(username=username, telephone=telephone)
    user.set_password(password)
    
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({"success": True, "message": "注册成功"})
    except Exception as e:
        # print(e)
        db.session.rollback()
        return jsonify({"success": False, "message": f"注册失败: {str(e)}"}), 500

# 获取所有用户接口（用于测试）
@app.route("/users", methods=["GET"])
def get_users():
    users = Users.query.all()
    users_list = [{"id": user.id, "username": user.username} for user in users]
    return jsonify({"success": True, "users": users_list})

# 健康检查接口
@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({"success": True, "message": "服务正常运行"})


# def partition(data):

#     color_map = {
#         "阴干": "#6BAF92",
#         "阴湿": "#A88ED0",
#         "阳干": "#F3A6B0",
#         "阳湿": "#E58B4A"
#     }

#     def get_neighbors(x, y, radius=1):
#         """返回 (x,y) 周围 radius 格子的所有坐标"""
#         coords = []
#         for dx in range(-radius, radius+1):
#             for dy in range(-radius, radius+1):
#                 if dx == 0 and dy == 0:
#                     continue
#                 coords.append((x+dx, y+dy))
#         return coords

#     # 阴区格子集合
#     shade_set = set()
#     for b in data["buildingPositions"]:
#         shade_set.update(get_neighbors(b["x"], b["y"], radius=1))
#     for w in data["wallPositions"]:
#         shade_set.update(get_neighbors(w["x"], w["y"], radius=2))

#     # 湿地区格子集合
#     wet_set = set()
#     for water in data["waterPositions"]:
#         wet_set.update(get_neighbors(water["x"], water["y"], radius=1))

#     # 结果数组

#     plants = Plants.query.all()
#     for plant in plants:
#         print(plant.name)
#     flower_zones = []

#     for f in data["flowerPositions"]:
#         pos = (f["x"], f["y"])
#         is_shade = pos in shade_set
#         is_wet = pos in wet_set

#         if is_shade and is_wet:
#             t = "阴湿"
#         elif is_shade and not is_wet:
#             t = "阴干"
#         elif not is_shade and is_wet:
#             t = "阳湿"
#         else:
#             t = "阳干"

#         flower_zones.append({
#             "position": {"x": f["x"], "y": f["y"]},
#             "type": t,
#             "color": color_map[t]
#         })


#     # print(json.dumps(flower_zones, ensure_ascii=False, indent=2))

#     all_plants = Plants.query.all()


#     zone_query_map = {
#         "全阴干": {"sunlight": ["低"], "water_need": ["低"]},
#         "全阴湿": {"sunlight": ["低"], "water_need": ["高"]},
#         "半日照干": {"sunlight": ["低"], "water_need": ["低"]},
#         "半日照湿": {"sunlight": ["低"], "water_need": ["高"]},
#         "全日照干": {"sunlight": ["高"], "water_need": ["低"]},
#         "全日照湿": {"sunlight": ["低"], "water_need": ["高"]},
#     }
#     # 内存分组
#     plants_by_zone = {z: [] for z in zone_query_map}

#     for plant in all_plants:
#         for zone_type, q in zone_query_map.items():
#             if (plant.sunlight in q["sunlight"]) and (plant.water_need in q["water_need"]):
#                 plants_by_zone[zone_type].append(plant)


#     print(plants_by_zone)


#     final_result = []
#     for f in flower_zones:
#         zone_type = f["type"]
#         candidates = plants_by_zone.get(zone_type, [])
#         # print(candidates)
#         if candidates:
#             plant = random.choice(candidates)
#             f["plant"] = {
#                 "id": plant.id,
#                 "name": plant.name,
#                 "latin_name": plant.latin_name,
#                 "family": plant.family,
#                 "genus": plant.genus,
#                 "color": "#6BAF92"
#             }
#             f['models'] = [
#         {
#             "season": 0,
#             "keyPrefix": "mint1",
#             "models": [
#                 {
#                     "resource": "/models/mint/",
#                     "name": "mint_1",
#                     "upAxis": "y",
#                     "target": 1,
#                     "offset": [-0.1, 0, 0],
#                 },
#                 {
#                     "resource": "/models/mint/",
#                     "name": "mint_2",
#                     "upAxis": "y",
#                     "target": 1,
#                     "offset": [0.2, 0, 0],
#                 },
#             ],
#         },
#         {
#             "season": 1,
#             "keyPrefix": "mint1",
#             "models": [
#                 {
#                     "resource": "/models/mint/",
#                     "name": "mint_2",
#                     "upAxis": "y",
#                     "target": 1,
#                     "offset": [-0.2, 0, 0],
#                 },
#             ],
#         },
#         {
#             "season": 2,
#             "keyPrefix": "mint3",
#             "models": [
#                 {
#                     "resource": "/models/mint/",
#                     "name": "mint_3",
#                     "upAxis": "y",
#                     "target": 1,
#                     "offset": [-0.3, 0, 0],
#                 },
#                 {
#                     "resource": "/models/mint/",
#                     "name": "mint_1",
#                     "upAxis": "y",
#                     "target": 1,
#                     "offset": [0.4, 0, 0],
#                 },
#             ],
#         },
#         {
#             "season": 3,
#             "keyPrefix": "mint4",
#             "models": [
#                 {
#                     "resource": "/models/mint/",
#                     "name": "mint_4",
#                     "upAxis": "y",
#                     "target": 1,
#                     "offset": [-0.5, 0, 0],
#                 },
#             ],
#         },
#     ]
#         else:
#             f["plant"] ={
#                 "id": "",
#                 "name":"",
#                 "latin_name": "",
#                 "family": "",
#                 "genus": "",
#                 "color": ""
#             }
#         final_result.append(f)


#     # return json.dumps(result, ensure_ascii=False, indent=2)
#     return final_result


def match_season(view_season: str, db_value: str) -> bool:

    season_map = {
        "spring": range(3, 6+1),   # 3-6月
        "summer": range(6, 9+1),   # 6-9月
        "autumn": range(9, 11+1),  # 9-11月
        "winter": [12, 1, 2],      # 12月,1月,2月
    }

    def parse_view_season(text: str):
        text = text.strip()

        # 全年
        if "全年" in text:
            return list(range(1, 13))
        # 秋冬
        if "秋冬" in text:
            return [9, 10, 11, 12]
        # 食用/药用类不算观赏期
        if "食用" in text:
            return []

        # 匹配 "5-9月" 这种
        m = re.match(r"(\d+)-(\d+)月", text)
        if m:
            start, end = int(m.group(1)), int(m.group(2))
            if start <= end:
                return list(range(start, end+1))
            else:  # 跨年，比如 11-2月
                return list(range(start, 13)) + list(range(1, end+1))

        # 单月 "6月"
        m = re.match(r"(\d+)月", text)
        if m:
            return [int(m.group(1))]

        return []
    
    season_months = season_map.get(view_season, [])
    plant_months = parse_view_season(db_value)

    return bool(set(season_months) & set(plant_months))


def match_lat(lat, cold_resistance):


    def parse_cold_tolerance(text: str) -> int:
        """
        提取耐寒字段里的最低温度（摄氏度）
        比如 '耐寒（可耐 -20℃低温）' -> -20
        '不耐寒（10℃以下生长受影响）' -> 5
        """
        text = text.strip()

        # 匹配 -20℃ 这类
        m = re.search(r"(-?\d+)℃", text)
        if m:
            return int(m.group(1))

        # 特殊处理
        if "不耐寒" in text:
            # 默认 5℃ 作为临界
            return 5
        if "较耐寒" in text:
            return -5

        return 99  # 无法识别时，给个大温度，表示要求不严格

    def get_min_temp_by_location(lat):
        if lat >= 50:   # 比如东北/内蒙古寒区
            return -35
        elif lat >= 40: # 北京、山东、陕西
            return -20
        elif lat >= 30: # 长江流域
            return -10
        elif lat >= 20: # 两广/云南
            return 0
        else:           # 海南等
            return 5

    min_temp = get_min_temp_by_location(float(lat))
    plant_limit = parse_cold_tolerance(cold_resistance)

    # print(lat)
    # print(min_temp)
    # print(cold_resistance)
    # print(plant_limit)
    # 只要植物耐寒温度 <= 当地最低温度，就算适合
    return plant_limit <= min_temp


def partition(data):
    import random

    # print(data)

    # 颜色映射（可以再扩展6类颜色）
    color_map = {
        "全阴干": "#6BAF92",
        "全阴湿": "#A88ED0",
        "半日照干": "#F3A6B0",
        "半日照湿": "#E58B4A",
        "全日照干": "#FFD166",
        "全日照湿": "#118AB2",
    }

    def get_neighbors(x, y, radius=1):
        coords = []
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                if dx == 0 and dy == 0:
                    continue
                coords.append((x + dx, y + dy))
        return coords
    
    
    def get_model_config(model_path):
        model_path = '../../frontend/public/models/' + model_path + '/metadata.json'
        with open(model_path, "r") as f:
            model_config = json.load(f)
            return model_config

    # 阴影格子
    shade_set = set()
    half_shade_set = set()
    for b in data["buildingPositions"]:
        shade_set.add((math.ceil(b["x"]), math.ceil(b["y"])))  # 完全遮挡
        half_shade_set.update(get_neighbors(math.ceil(b["x"]), math.ceil(b["y"]), radius=1))
    for w in data["wallPositions"]:
        shade_set.add((math.ceil(w["x"]), math.ceil(w["y"])))
        half_shade_set.update(get_neighbors(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))

    # print (shade_set)
    # print (half_shade_set)

    # 湿地区格子
    wet_set = set()
    for water in data["waterPositions"]:
        wet_set.update(get_neighbors(water["x"], water["y"], radius=1))

    # 区域分类
    flower_zones = []
    for f in data["flowerPositions"]:
        pos = (f["x"], f["y"])
        is_wet = pos in wet_set

        # 判定光照类型
        if pos in shade_set:
            light = "全阴"
        elif pos in half_shade_set:
            light = "半日照"
        else:
            light = "全日照"

        # 湿度类型
        wet_str = "湿" if is_wet else "干"

        zone_type = f"{light}{wet_str}"

        flower_zones.append({
            "position": {"x": f["x"], "y": f["y"]},
            "type": zone_type,
            "color": color_map.get(zone_type, "#FFFFFF")
        })

    # 植物分组

    query = Plants.query.filter(
        (Plants.show_type.is_(None)) | (Plants.show_type == ''),
        Plants.model_path.isnot(None),
        Plants.model_path != '',
        ~Plants.name.in_([
            # '葱', 
            # "羽衣甘蓝", 
            # "羽扇豆（鲁冰花）",
            # "小花葱", 
            # "醉鱼草",
            # "毛地黄",
            # "大花飞燕草",
            ])
    )

    print(
        query.statement.compile(
            dialect=sqlite.dialect(),
            compile_kwargs={"literal_binds": True}
        )
    )

    all_plants = query.all()
    print(all_plants)

    # print(data)
    selectedPlants = data.get('property', {}).get("selectedPlants")

    if selectedPlants:
        all_plants = [p for p in all_plants if p.name in selectedPlants]


    viewSeason = data.get('property', {}).get("viewSeason")
    if viewSeason and viewSeason != 'none':
        all_plants = [p for p in all_plants if match_season(viewSeason, p.ornamental_period)]

    style = data.get('property', {}).get("style")
    # print(style)
    if style and style != 'none':
        style_dic = {
            "meadow": "混合草甸",
            "insectFriendly": "昆虫友好花园",
            "rainGarden": "雨水花园",
            "children": "儿童花园",
            "healing": "疗愈花园",
            "rock": "岩石花园",
            "edible": "可食花园",
        }

        style = style_dic.get(style)
        # print(style)
        
        all_plants = [p for p in all_plants if style in p.garden_type.split("、")]
        # for p in all_plants:
        #     print(p.garden_type.split("、"))
        #     print(style in p.garden_type.split("、"))

    # lat = data.get('property', {}).get("lat")
    # if lat:
    #     all_plants = [p for p in all_plants if match_lat(lat, p.cold_resistance)]
        



    
    # print(all_plants)
    zone_query_map = {
        "全阴干": {"sunlight": ["低"], "water_need": ["低"]},
        "全阴湿": {"sunlight": ["低"], "water_need": ["高"]},
        "半日照干": {"sunlight": ["中"], "water_need": ["低", "中", "中、低"]},
        "半日照湿": {"sunlight": ["中"], "water_need": ["高", "中", "高、中"]},
        "全日照干": {"sunlight": ["高"], "water_need": ["低"]},
        "全日照湿": {"sunlight": ["高"], "water_need": ["高"]},
    }

    plants_by_zone = {z: [] for z in zone_query_map}
    for plant in all_plants:
        for zone_type, q in zone_query_map.items():
            if (set(plant.sunlight.split("、")) & set(q["sunlight"])) and (plant.water_need in q["water_need"]):
                plants_by_zone[zone_type].append(plant)
    
    print(plants_by_zone)

    # 最终结果
    final_result = []
    pos_to_zone = {(f["position"]["x"], f["position"]["y"]): f for f in flower_zones}
    assigned = set()

    # 获取边界坐标
    if flower_zones:
        max_x = max(f["position"]["x"] for f in flower_zones)
        max_y = max(f["position"]["y"] for f in flower_zones)
        min_x = min(f["position"]["x"] for f in flower_zones)
        min_y = min(f["position"]["y"] for f in flower_zones)

    for f in flower_zones:
        pos = (f["position"]["x"], f["position"]["y"])
        if pos in assigned:
            continue

        zone_type = f["type"]
        candidates = plants_by_zone.get(zone_type, [])
        candidates = all_plants
        # print(candidates)

        if candidates:
            plant = random.choice(candidates)
            print(plant.name)
            plant_info = {
                "id": plant.id,
                "name": plant.name,
                "latin_name": plant.latin_name,
                "family": plant.family,
                "genus": plant.genus,
                "color": plant.color_hex,
                # "modles": plant.model_config
            }
        else:
            plant_info = {
                "id": "",
                "name": "无",
                "latin_name": "",
                "family": "",
                "genus": "",
                "color": "#FFFFFF"
            }

        cluster_mode = random.choice([1, 2])
        if cluster_mode == 2:
            cluster_positions = [
                    pos,
                    (pos[0] + 1, pos[1]),
                    (pos[0], pos[1] + 1),
                    (pos[0] + 1, pos[1] + 1),
                ]
            
            for p in cluster_positions:
                # print(66666666)
                # print(p)
                # print(pos_to_zone)
                # print(6666666677)
                if p not in pos_to_zone:
                    cluster_mode = 1
                    break

                # if p in pos_to_zone:

        # 决定偏移量，如果在边界则不偏移
        if pos[0] == max_x or pos[1] == max_y or pos[0] == min_x or pos[1] == min_y:
            offset_x = 0
            offset_y = 0
        else:
            offset_x = -round(random.uniform(0.1, 0.5), 2)
            offset_y = -round(random.uniform(0.1, 0.5), 2)

        if cluster_mode == 1:
            plant_info["display_x"] = pos[0] + offset_x
            plant_info["display_y"] = pos[1] + offset_y
            plant_info["display_radius"] = 25
            f["plant"] = plant_info
            plant_info["mod"] = 1
            f["models"] = get_model_config(plant.model_path)
            final_result.append(f)
            assigned.add(pos)

        else:
            for cpos in cluster_positions:
                if cpos in pos_to_zone and cpos not in assigned:
                    ox, oy = -round(random.uniform(0.1, 0.3), 2), -round(random.uniform(0.1, 0.3), 2)

                    cf = pos_to_zone[cpos]
                    # 边界不偏移
                    if cpos[0] == max_x:
                        ox = -0.5
                    if cpos[1] == max_y:
                        oy = -0.5
                    if cpos[0] == min_x:
                        ox = 0.5
                    if cpos[1] == min_y:
                        oy = 0.5

                    plant_info["display_x"] = cpos[0] + ox
                    plant_info["display_y"] = cpos[1] + oy
                    plant_info["display_radius"] = 50
                    cf["plant"] = plant_info
                    plant_info["mod"] = 2
                    # cf["models"] = plant_info.get('models', []) if plant_info.get('models', []) else base_models2

                    cf["models"] = get_model_config(plant.model_path)
                    final_result.append(cf)
                    assigned.add(cpos)



    vegetables = Plants.query.filter_by(show_type='蔬菜爬藤架').all()
    # print(vegetables)
    for vege in data["vegetablePositions"]:
        vege_res = {}
        vegetable = random.choice(vegetables)

        vege_res["type"] = "可食"
        vege_res["position"] = {}
        vege_res["position"]["x"], vege_res["position"]["y"] = vege["x"], vege["y"]
        vege_res['color'] = color_map.get(zone_type, "#FFFFFF")

        vege_res["models"] = get_model_config(vegetable.model_path)
        
        plant_info = {
            "id": vegetable.id,
            "name": vegetable.name,
            "latin_name": vegetable.latin_name,
            "family": vegetable.family,
            "genus": vegetable.genus,
            "color": vegetable.color_hex,
            'display_x': vege["x"],
            'display_y': vege["y"],
        }
        vege_res["plant"] = plant_info
        # vege_res["models"] = plant_info.get('models', []) if plant_info.get('models', []) else base_models
        # print(f)
        final_result.append(deepcopy(vege_res))

    ornamentals = Plants.query.filter_by(show_type='观赏植物藤架').all()
    # print(ornamentals)
    # print(data["ornamentalPositions"])
    for oran in data["ornamentalPositions"]:
        oran_res = {}
        ornamental = random.choice(ornamentals)

        oran_res["type"] = "可食"
        oran_res["position"] = {}
        oran_res["position"]["x"], oran_res["position"]["y"] = oran["x"], oran["y"]
        oran_res['color'] = color_map.get(zone_type, "#FFFFFF")

        model_path = '../../frontend/public/models/' + ornamental.model_path + '/metadata.json'
        # print(model_path)

        with open(model_path, "r") as f:
            model_config = json.load(f)
            oran_res["models"] = model_config
        
        plant_info = {
            "id": ornamental.id,
            "name": ornamental.name,
            "latin_name": ornamental .latin_name,
            "family": ornamental.family,
            "genus": ornamental.genus,
            "color": ornamental.color_hex,
            'display_x': oran["x"],
            'display_y': oran["y"],
        }
        oran_res["plant"] = plant_info
        # vege_res["models"] = plant_info.get('models', []) if plant_info.get('models', []) else base_models
        # print(f)
        final_result.append(deepcopy(oran_res))

    # print(final_result)

    return final_result


def partition666(data):
    import random
    import json
    import math
    from copy import deepcopy

    # 颜色映射（可以再扩展6类颜色）
    color_map = {
        "全阴干": "#6BAF92",
        "全阴湿": "#A88ED0",
        "半日照干": "#F3A6B0",
        "半日照湿": "#E58B4A",
        "全日照干": "#FFD166",
        "全日照湿": "#118AB2",
    }

    def get_neighbors(x, y, radius=1):
        coords = []
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                if dx == 0 and dy == 0:
                    continue
                coords.append((x + dx, y + dy))
        return coords

    def get_model_config(model_path):
        path = '../../frontend/public/models/' + model_path + '/metadata.json'
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            # 容错：返回空 dict，调用方检查
            return {}

    # -------------------------
    # 阴影格子
    # -------------------------
    shade_set = set()
    half_shade_set = set()
    for b in data.get("buildingPositions", []):
        shade_set.add((math.ceil(b["x"]), math.ceil(b["y"])))  # 完全遮挡
        half_shade_set.update(get_neighbors(math.ceil(b["x"]), math.ceil(b["y"]), radius=1))
    for w in data.get("wallPositions", []):
        shade_set.add((math.ceil(w["x"]), math.ceil(w["y"])))
        half_shade_set.update(get_neighbors(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))

    # 湿地区格子
    wet_set = set()
    for water in data.get("waterPositions", []):
        wet_set.update(get_neighbors(math.ceil(water["x"]), math.ceil(water["y"]), radius=1))

    # 区域分类
    flower_zones = []
    for f in data.get("flowerPositions", []):
        pos = (f["x"], f["y"])
        is_wet = pos in wet_set

        # 判定光照类型
        if pos in shade_set:
            light = "全阴"
        elif pos in half_shade_set:
            light = "半日照"
        else:
            light = "全日照"

        # 湿度类型
        wet_str = "湿" if is_wet else "干"

        zone_type = f"{light}{wet_str}"

        flower_zones.append({
            "position": {"x": f["x"], "y": f["y"]},
            "type": zone_type,
            "color": color_map.get(zone_type, "#FFFFFF")
        })

    # -------------------------
    # 植物分组（DB 查询部分保留原逻辑）
    # -------------------------
    query = Plants.query.filter(
        (Plants.show_type.is_(None)) | (Plants.show_type == ''),
        Plants.model_path.isnot(None),
        Plants.model_path != '',
        ~Plants.name.in_([
            # '葱', 
            # "羽衣甘蓝", 
            # "羽扇豆（鲁冰花）",
            # "小花葱", 
            # "醉鱼草",
            # "毛地黄",
            # "大花飞燕草",
        ])
    )

    # debug SQL 打印（保持）
    try:
        print(
            query.statement.compile(
                dialect=sqlite.dialect(),
                compile_kwargs={"literal_binds": True}
            )
        )
    except Exception:
        pass

    all_plants = query.all()
    print(all_plants)

    selectedPlants = data.get('property', {}).get("selectedPlants")
    if selectedPlants:
        all_plants = [p for p in all_plants if p.name in selectedPlants]

    viewSeason = data.get('property', {}).get("viewSeason")
    if viewSeason and viewSeason != 'none':
        all_plants = [p for p in all_plants if match_season(viewSeason, p.ornamental_period)]

    style = data.get('property', {}).get("style")
    if style and style != 'none':
        style_dic = {
            "meadow": "混合草甸",
            "insectFriendly": "昆虫友好花园",
            "rainGarden": "雨水花园",
            "children": "儿童花园",
            "healing": "疗愈花园",
            "rock": "岩石花园",
            "edible": "可食花园",
        }
        style = style_dic.get(style)
        all_plants = [p for p in all_plants if style in (p.garden_type or "").split("、")]

    # zone -> 可选植物（按光照 & 需水）
    zone_query_map = {
        "全阴干": {"sunlight": ["低"], "water_need": ["低"]},
        "全阴湿": {"sunlight": ["低"], "water_need": ["高"]},
        "半日照干": {"sunlight": ["中"], "water_need": ["低", "中", "中、低"]},
        "半日照湿": {"sunlight": ["中"], "water_need": ["高", "中", "高、中"]},
        "全日照干": {"sunlight": ["高"], "water_need": ["低"]},
        "全日照湿": {"sunlight": ["高"], "water_need": ["高"]},
    }

    plants_by_zone = {z: [] for z in zone_query_map}
    for plant in all_plants:
        for zone_type, q in zone_query_map.items():
            if (set((plant.sunlight or "").split("、")) & set(q["sunlight"])) and (plant.water_need in q["water_need"]):
                plants_by_zone[zone_type].append(plant)

    print(plants_by_zone)

    # -------------------------
    # 最终结果与聚类摆放（基于 display_radius）
    # -------------------------
    final_result = []
    pos_to_zone = {(f["position"]["x"], f["position"]["y"]): f for f in flower_zones}
    assigned = set()

    # 获取边界坐标（用于偏移策略）
    if flower_zones:
        max_x = max(f["position"]["x"] for f in flower_zones)
        max_y = max(f["position"]["y"] for f in flower_zones)
        min_x = min(f["position"]["x"] for f in flower_zones)
        min_y = min(f["position"]["y"] for f in flower_zones)
    else:
        max_x = max_y = min_x = min_y = 0

    # 参数：用于把 display_radius 的单位（假设为厘米）映射到格子单位的比例和额外间隙
    SCALE_FACTOR = 10  # display_radius(cm) / SCALE_FACTOR -> 网格单位
    MARGIN = 0.05         # 网格单位上的额外间隙，保证不碰撞

    for f in flower_zones:
        pos = (f["position"]["x"], f["position"]["y"])
        if pos in assigned:
            continue

        zone_type = f["type"]
        candidates = plants_by_zone.get(zone_type, [])  # 优先按分区选
        if not candidates:
            # 回退：如果该区没有候选植物，使用所有植物作为候选
            candidates = all_plants

        # 随机挑选一个中心植物
        if candidates:
            plant = random.choice(candidates)
            print(plant.name)
            plant_info = {
                "id": plant.id,
                "name": plant.name,
                "latin_name": plant.latin_name,
                "family": plant.family,
                "genus": plant.genus,
                "color": plant.color_hex,
            }
        else:
            # 没有任何植物可选
            plant = None
            plant_info = {
                "id": "",
                "name": "无",
                "latin_name": "",
                "family": "",
                "genus": "",
                "color": "#FFFFFF"
            }

        # 读取中心植物的 display_radius（容错）
        center_radius = float(plant.crown_width)/2
        print(center_radius)

        # 记录 center 的 display_radius（直接存入 cm 单位数值）
        plant_info["display_radius"] = center_radius

        # 计算本格可作为 cluster 的邻居格（只考虑 8 邻域）
        neighbor_positions = []
        for dx in [-1, 0, 1]:
            for dy in [-1, 0, 1]:
                if dx == 0 and dy == 0:
                    continue
                cpos = (pos[0] + dx, pos[1] + dy)
                if cpos in pos_to_zone:
                    neighbor_positions.append(cpos)

        # 如果没有邻居格，则按单株放置（带一点随机 jitter，非边界）
        if not neighbor_positions:
            # 决定偏移量，如果在边界则不偏移
            if pos[0] == max_x or pos[1] == max_y or pos[0] == min_x or pos[1] == min_y:
                offset_x = 0
                offset_y = 0
            else:
                offset_x = -round(random.uniform(0.1, 0.5), 2)
                offset_y = -round(random.uniform(0.1, 0.5), 2)

            single = deepcopy(f)
            single["plant"] = deepcopy(plant_info)
            single["plant"]["display_x"] = pos[0] + offset_x
            single["plant"]["display_y"] = pos[1] + offset_y
            # models
            if plant and getattr(plant, "model_path", None):
                single["models"] = get_model_config(plant.model_path)
            else:
                single["models"] = {}
            final_result.append(single)
            assigned.add(pos)
            continue

        # 有邻居格：把当前选为中心
        center_entry = deepcopy(f)
        center_entry["plant"] = deepcopy(plant_info)
        center_entry["plant"]["display_x"] = pos[0]  # 中心放在格中心（可根据需要加 jitter）
        center_entry["plant"]["display_y"] = pos[1]
        if plant and getattr(plant, "model_path", None):
            center_entry["models"] = get_model_config(plant.model_path)
        else:
            center_entry["models"] = {}
        final_result.append(center_entry)
        assigned.add(pos)

        # 为周围格选择“比中心半径小”的植物列表（优先使用 candidates）
        small_plants = [p for p in candidates if (float(p.crown_width)/2 or 25 < center_radius)]
        print(small_plants)
        # 如果没有符合小半径的植物，退回到所有植物中找（且允许等于）
        # if not small_plants:
        #     small_plants = [p for p in all_plants if (float(getattr(p, "display_radius", 25) or 25) <= center_radius)]
        # 最终仍为空则用中心植物重复填充（保证有东西可选）
        if not small_plants:
            small_plants = [plant] if plant else []

        # 环绕布局：按邻居格数量均匀分配角度
        num_slots = len(neighbor_positions)
        angle_step = 360.0 / max(1, num_slots)

        # -----------------------------
        #  不重叠摆放（替换原有环绕布局）
        # -----------------------------

        # 已放置的圆（先加入中心）
        placed_circles = [
            (
                center_entry["plant"]["display_x"],
                center_entry["plant"]["display_y"],
                center_radius / SCALE_FACTOR
            )
        ]

        # 防碰撞：判断圆不相交
        def no_collision(x, y, r, placed):
            for (px, py, pr) in placed:
                if (x - px) ** 2 + (y - py) ** 2 < (r + pr) ** 2:
                    return False
            return True

        # 环绕角度均分
        num_slots = len(neighbor_positions)
        angle_step = 360.0 / max(1, num_slots)
        angle0 = random.uniform(0, 360)

        for i, cpos in enumerate(neighbor_positions):
            if cpos in assigned:
                continue

            sub = random.choice(small_plants)

            try:
                sub_radius = float(getattr(sub, "display_radius", 20) or 20)
            except Exception:
                sub_radius = 20.0

            # 网格单位距离
            base_dist = (center_radius + sub_radius) / SCALE_FACTOR + MARGIN

            best_x = best_y = None

            # 尝试微调角度，寻找不重叠的空位（-12~12，共 25 个角度）
            print(2222)
            for delta in range(-12, 13):
                rad = math.radians(angle0 + i * angle_step + delta * 0.5)
                tx = cpos[0] + math.cos(rad) * base_dist
                ty = cpos[1] + math.sin(rad) * base_dist

                if no_collision(tx, ty, sub_radius / SCALE_FACTOR, placed_circles):
                    best_x, best_y = tx, ty
                    break

            # 若仍然没有空位 → 稍微增大距离兜底
            if best_x is None:
                rad = math.radians(angle0 + i * angle_step)
                tx = cpos[0] + math.cos(rad) * (base_dist + 0.2)
                ty = cpos[1] + math.sin(rad) * (base_dist + 0.2)
                best_x, best_y = tx, ty

            # 输出写入
            cf = deepcopy(pos_to_zone[cpos])
            cf_plant_info = {
                "id": sub.id if sub else "",
                "name": sub.name if sub else "无",
                "latin_name": getattr(sub, "latin_name", "") if sub else "",
                "family": getattr(sub, "family", "") if sub else "",
                "genus": getattr(sub, "genus", "") if sub else "",
                "color": getattr(sub, "color_hex", "#FFFFFF") if sub else "#FFFFFF",
                "display_radius": sub_radius,
                "display_x": best_x,
                "display_y": best_y,
            }
            cf["plant"] = cf_plant_info

            if sub and getattr(sub, "model_path", None):
                cf["models"] = get_model_config(sub.model_path)
            else:
                cf["models"] = {}

            final_result.append(cf)
            assigned.add(cpos)

            # 加入已放置圆列表
            placed_circles.append((best_x, best_y, sub_radius / SCALE_FACTOR))

    # -------------------------
    # 蔬菜 / 观赏藤架（保持原有输出结构，但修复颜色与模型读取）
    # -------------------------
    vegetables = Plants.query.filter_by(show_type='蔬菜爬藤架').all()
    for vege in data.get("vegetablePositions", []):
        vege_res = {}
        vegetable = random.choice(vegetables) if vegetables else None

        vege_res["type"] = "可食"
        vege_res["position"] = {"x": vege["x"], "y": vege["y"]}

        # 使用所在格的颜色（如果存在），否则白色
        zone_of_pos = pos_to_zone.get((vege["x"], vege["y"]))
        vege_res['color'] = zone_of_pos["color"] if zone_of_pos else "#FFFFFF"

        vege_res["models"] = get_model_config(vegetable.model_path) if vegetable and getattr(vegetable, "model_path", None) else {}

        plant_info = {
            "id": vegetable.id if vegetable else "",
            "name": vegetable.name if vegetable else "无",
            "latin_name": getattr(vegetable, "latin_name", "") if vegetable else "",
            "family": getattr(vegetable, "family", "") if vegetable else "",
            "genus": getattr(vegetable, "genus", "") if vegetable else "",
            "color": getattr(vegetable, "color_hex", "#FFFFFF") if vegetable else "#FFFFFF",
            'display_x': vege["x"],
            'display_y': vege["y"],
        }
        vege_res["plant"] = plant_info
        final_result.append(deepcopy(vege_res))

    ornamentals = Plants.query.filter_by(show_type='观赏植物藤架').all()
    for oran in data.get("ornamentalPositions", []):
        oran_res = {}
        ornamental = random.choice(ornamentals) if ornamentals else None

        oran_res["type"] = "观赏藤架"
        oran_res["position"] = {"x": oran["x"], "y": oran["y"]}

        zone_of_pos = pos_to_zone.get((oran["x"], oran["y"]))
        oran_res['color'] = zone_of_pos["color"] if zone_of_pos else "#FFFFFF"

        if ornamental and getattr(ornamental, "model_path", None):
            oran_res["models"] = get_model_config(ornamental.model_path)
        else:
            oran_res["models"] = {}

        plant_info = {
            "id": ornamental.id if ornamental else "",
            "name": ornamental.name if ornamental else "无",
            "latin_name": getattr(ornamental, "latin_name", "") if ornamental else "",
            "family": getattr(ornamental, "family", "") if ornamental else "",
            "genus": getattr(ornamental, "genus", "") if ornamental else "",
            "color": getattr(ornamental, "color_hex", "#FFFFFF") if ornamental else "#FFFFFF",
            'display_x': oran["x"],
            'display_y': oran["y"],
        }
        oran_res["plant"] = plant_info
        final_result.append(deepcopy(oran_res))

    return final_result


def partition6667(data):
    import random
    import json
    import math
    from copy import deepcopy

    # 颜色映射（可以再扩展6类颜色）
    color_map = {
        "全阴干": "#6BAF92",
        "全阴湿": "#A88ED0",
        "半日照干": "#F3A6B0",
        "半日照湿": "#E58B4A",
        "全日照干": "#FFD166",
        "全日照湿": "#118AB2",
    }

    def get_neighbors(x, y, radius=1):
        coords = []
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                if dx == 0 and dy == 0:
                    continue
                coords.append((x + dx, y + dy))
        return coords

    def get_model_config(model_path):
        path = '../../frontend/public/models/' + model_path + '/metadata.json'
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            # 容错：返回空 dict，调用方检查
            return {}

    # -------------------------
    # 阴影格子
    # -------------------------
    shade_set = set()
    half_shade_set = set()
    for b in data.get("buildingPositions", []):
        shade_set.add((math.ceil(b["x"]), math.ceil(b["y"])))  # 完全遮挡
        half_shade_set.update(get_neighbors(math.ceil(b["x"]), math.ceil(b["y"]), radius=1))
    for w in data.get("wallPositions", []):
        shade_set.add((math.ceil(w["x"]), math.ceil(w["y"])))
        half_shade_set.update(get_neighbors(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))

    # 湿地区格子
    wet_set = set()
    for water in data.get("waterPositions", []):
        wet_set.update(get_neighbors(math.ceil(water["x"]), math.ceil(water["y"]), radius=1))

    # 区域分类
    flower_zones = []
    for f in data.get("flowerPositions", []):
        pos = (f["x"], f["y"])
        is_wet = pos in wet_set

        # 判定光照类型
        if pos in shade_set:
            light = "全阴"
        elif pos in half_shade_set:
            light = "半日照"
        else:
            light = "全日照"

        # 湿度类型
        wet_str = "湿" if is_wet else "干"

        zone_type = f"{light}{wet_str}"

        flower_zones.append({
            "position": {"x": f["x"], "y": f["y"]},
            "type": zone_type,
            "color": color_map.get(zone_type, "#FFFFFF")
        })

    # -------------------------
    # 植物分组（DB 查询部分保留原逻辑）
    # -------------------------
    query = Plants.query.filter(
        (Plants.show_type.is_(None)) | (Plants.show_type == ''),
        Plants.model_path.isnot(None),
        Plants.model_path != '',
        ~Plants.name.in_([
            # '葱', 
            # "羽衣甘蓝", 
            # "羽扇豆（鲁冰花）",
            # "小花葱", 
            # "醉鱼草",
            # "毛地黄",
            # "大花飞燕草",
        ])
    )

    # debug SQL 打印（保持）
    try:
        print(
            query.statement.compile(
                dialect=sqlite.dialect(),
                compile_kwargs={"literal_binds": True}
            )
        )
    except Exception:
        pass

    all_plants = query.all()
    print(all_plants)

    selectedPlants = data.get('property', {}).get("selectedPlants")
    if selectedPlants:
        all_plants = [p for p in all_plants if p.name in selectedPlants]

    viewSeason = data.get('property', {}).get("viewSeason")
    if viewSeason and viewSeason != 'none':
        all_plants = [p for p in all_plants if match_season(viewSeason, p.ornamental_period)]

    style = data.get('property', {}).get("style")
    if style and style != 'none':
        style_dic = {
            "meadow": "混合草甸",
            "insectFriendly": "昆虫友好花园",
            "rainGarden": "雨水花园",
            "children": "儿童花园",
            "healing": "疗愈花园",
            "rock": "岩石花园",
            "edible": "可食花园",
        }
        style = style_dic.get(style)
        all_plants = [p for p in all_plants if style in (p.garden_type or "").split("、")]

    # zone -> 可选植物（按光照 & 需水）
    zone_query_map = {
        "全阴干": {"sunlight": ["低"], "water_need": ["低"]},
        "全阴湿": {"sunlight": ["低"], "water_need": ["高"]},
        "半日照干": {"sunlight": ["中"], "water_need": ["低", "中", "中、低"]},
        "半日照湿": {"sunlight": ["中"], "water_need": ["高", "中", "高、中"]},
        "全日照干": {"sunlight": ["高"], "water_need": ["低"]},
        "全日照湿": {"sunlight": ["高"], "water_need": ["高"]},
    }

    plants_by_zone = {z: [] for z in zone_query_map}
    for plant in all_plants:
        for zone_type, q in zone_query_map.items():
            if (set((plant.sunlight or "").split("、")) & set(q["sunlight"])) and (plant.water_need in q["water_need"]):
                plants_by_zone[zone_type].append(plant)

    print(plants_by_zone)

    # -------------------------
    # 最终结果与聚类摆放（基于 display_radius）
    # -------------------------
    final_result = []
    pos_to_zone = {(f["position"]["x"], f["position"]["y"]): f for f in flower_zones}
    assigned = set()

    # 获取边界坐标（用于偏移策略）
    if flower_zones:
        max_x = max(f["position"]["x"] for f in flower_zones)
        max_y = max(f["position"]["y"] for f in flower_zones)
        min_x = min(f["position"]["x"] for f in flower_zones)
        min_y = min(f["position"]["y"] for f in flower_zones)
    else:
        max_x = max_y = min_x = min_y = 0

    # 参数：用于把 display_radius 的单位（假设为厘米）映射到格子单位的比例和额外间隙
    SCALE_FACTOR = 10  # display_radius(cm) / SCALE_FACTOR -> 网格单位
    MARGIN = 0.05         # 网格单位上的额外间隙，保证不碰撞

    for f in flower_zones:
        pos = (f["position"]["x"], f["position"]["y"])
        if pos in assigned:
            continue

        zone_type = f["type"]
        candidates = plants_by_zone.get(zone_type, [])  # 优先按分区选
        if not candidates:
            # 回退：如果该区没有候选植物，使用所有植物作为候选
            candidates = all_plants

        # 随机挑选一个中心植物
        if candidates:
            plant = random.choice(candidates)
            print(plant.name)
            plant_info = {
                "id": plant.id,
                "name": plant.name,
                "latin_name": plant.latin_name,
                "family": plant.family,
                "genus": plant.genus,
                "color": plant.color_hex,
            }
        else:
            # 没有任何植物可选
            plant = None
            plant_info = {
                "id": "",
                "name": "无",
                "latin_name": "",
                "family": "",
                "genus": "",
                "color": "#FFFFFF"
            }

        # 读取中心植物的 display_radius（容错）
        center_radius = float(plant.crown_width)/2
        print(center_radius)

        # 记录 center 的 display_radius（直接存入 cm 单位数值）
        plant_info["display_radius"] = center_radius

        # 如果没有邻居格，则按单株放置（带一点随机 jitter，非边界）
        # 决定偏移量，如果在边界则不偏移
        if pos[0] == max_x or pos[1] == max_y or pos[0] == min_x or pos[1] == min_y:
            offset_x = 0
            offset_y = 0
        else:
            offset_x = -round(random.uniform(0.1, 0.5), 2)
            offset_y = -round(random.uniform(0.1, 0.5), 2)

        single = deepcopy(f)
        single["plant"] = deepcopy(plant_info)
        single["plant"]["display_x"] = pos[0] + offset_x
        single["plant"]["display_y"] = pos[1] + offset_y
        # models
        if plant and getattr(plant, "model_path", None):
            single["models"] = get_model_config(plant.model_path)
        else:
            single["models"] = {}
        final_result.append(single)
        assigned.add(pos)
        continue

    # -------------------------
    # 蔬菜 / 观赏藤架（保持原有输出结构，但修复颜色与模型读取）
    # -------------------------
    vegetables = Plants.query.filter_by(show_type='蔬菜爬藤架').all()
    for vege in data.get("vegetablePositions", []):
        vege_res = {}
        vegetable = random.choice(vegetables) if vegetables else None

        vege_res["type"] = "可食"
        vege_res["position"] = {"x": vege["x"], "y": vege["y"]}

        # 使用所在格的颜色（如果存在），否则白色
        zone_of_pos = pos_to_zone.get((vege["x"], vege["y"]))
        vege_res['color'] = zone_of_pos["color"] if zone_of_pos else "#FFFFFF"

        vege_res["models"] = get_model_config(vegetable.model_path) if vegetable and getattr(vegetable, "model_path", None) else {}

        plant_info = {
            "id": vegetable.id if vegetable else "",
            "name": vegetable.name if vegetable else "无",
            "latin_name": getattr(vegetable, "latin_name", "") if vegetable else "",
            "family": getattr(vegetable, "family", "") if vegetable else "",
            "genus": getattr(vegetable, "genus", "") if vegetable else "",
            "color": getattr(vegetable, "color_hex", "#FFFFFF") if vegetable else "#FFFFFF",
            'display_x': vege["x"],
            'display_y': vege["y"],
        }
        vege_res["plant"] = plant_info
        final_result.append(deepcopy(vege_res))

    ornamentals = Plants.query.filter_by(show_type='观赏植物藤架').all()
    for oran in data.get("ornamentalPositions", []):
        oran_res = {}
        ornamental = random.choice(ornamentals) if ornamentals else None

        oran_res["type"] = "观赏藤架"
        oran_res["position"] = {"x": oran["x"], "y": oran["y"]}

        zone_of_pos = pos_to_zone.get((oran["x"], oran["y"]))
        oran_res['color'] = zone_of_pos["color"] if zone_of_pos else "#FFFFFF"

        if ornamental and getattr(ornamental, "model_path", None):
            oran_res["models"] = get_model_config(ornamental.model_path)
        else:
            oran_res["models"] = {}

        plant_info = {
            "id": ornamental.id if ornamental else "",
            "name": ornamental.name if ornamental else "无",
            "latin_name": getattr(ornamental, "latin_name", "") if ornamental else "",
            "family": getattr(ornamental, "family", "") if ornamental else "",
            "genus": getattr(ornamental, "genus", "") if ornamental else "",
            "color": getattr(ornamental, "color_hex", "#FFFFFF") if ornamental else "#FFFFFF",
            'display_x': oran["x"],
            'display_y': oran["y"],
        }
        oran_res["plant"] = plant_info
        final_result.append(deepcopy(oran_res))


    cleaned = []
    occupied = []  # 已占用的圆形区域中心点与半径

    def is_conflict(x, y, r, occupied):
        for ox, oy, orad, _ in occupied:
            dist = math.sqrt((x - ox)**2 + (y - oy)**2)
            if dist < (r + orad):
                return True
        return False

    # 尝试偏移进行避让（最多尝试 10 次）
    def try_resolve_with_offset(x, y, r, occupied):
        OFFSETS = [
            (0.2, 0), (-0.2, 0), (0, 0.2), (0, -0.2),
            (0.15, 0.15), (-0.15, -0.15),
            (0.15, -0.15), (-0.15, 0.15),
        ]
        # 可以再加入完全随机的微偏移
        for ox, oy in OFFSETS:
            nx, ny = x + ox, y + oy
            if not is_conflict(nx, ny, r, occupied):
                return nx, ny
        return None  # 全部偏移失败

    for item in final_result:
        plant = item["plant"]
        x = plant["display_x"]
        y = plant["display_y"]
        r = float(plant.get("display_radius", 0)) / 50

        if is_conflict(x, y, r, occupied):
            # 冲突了，尝试偏移解决
            new_xy = try_resolve_with_offset(x, y, r, occupied)
            if new_xy:
                new_x, new_y = new_xy
                plant["display_x"] = new_x
                plant["display_y"] = new_y
                cleaned.append(item)
                occupied.append((new_x, new_y, r, item))
            else:
                # 偏移依然冲突 → 删除
                print("删除因碰撞:", plant.get("name"))
            continue

        # 无冲突，直接加入
        cleaned.append(item)
        occupied.append((x, y, r, item))

    MAX_GAP_FILL = 30

    gap_added = 0

    # # 两两组合检测空隙
    # for i in range(len(occupied)):
    #     for j in range(i + 1, len(occupied)):
    #         if gap_added >= MAX_GAP_FILL:
    #             break

    #         x1, y1, r1, plant_i = occupied[i]
    #         x2, y2, r2, plant_j = occupied[j]
    #         plant = deepcopy(plant_i)

    #         # 距离太近，没有实际空隙，跳过
    #         dist = math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2)
    #         if dist < r1 + r2 + 0.8:  # 距离太小，不认为有空隙
    #             continue

    #         # 找中点
    #         mid_x = (x1 + x2) / 2
    #         mid_y = (y1 + y2) / 2

    #         # 随机挑选一个植物用于补洞
    #         # newplant = deepcopy(random.choice(candidates))
    #         new_r = float(plant['plant'].get("display_radius", 0)) / 50

    #         print(mid_x, mid_y, new_r)

    #         # 中点是否可放？
    #         if is_conflict(mid_x, mid_y, new_r, occupied):
    #             print(6666666)
    #             continue
    #             # 尝试偏移让它能放进去
    #             new_xy = try_resolve_with_offset(mid_x, mid_y, new_r, occupied)
    #             if not new_xy:
    #                 continue  # 解决不了就放弃

    #             mid_x, mid_y = new_xy  # 替换中点为偏移后的点

    #         # # 成功：补一个新植物进去
    #         plant['plant']["display_x"] = mid_x
    #         plant['plant']["display_y"] = mid_y

    #         cleaned.append(plant)
    #         print("补空:", plant, mid_x, mid_y, new_r)
    #         occupied.append((mid_x, mid_y, new_r, plant))

    #         gap_added += 1

    final_result = cleaned

    return final_result



def partition1(data):
    import random, json, math
    from copy import deepcopy
    from sqlalchemy.dialects import sqlite

    # 颜色映射
    color_map = {
        "全阴干": "#6BAF92",
        "全阴湿": "#A88ED0",
        "半日照干": "#F3A6B0",
        "半日照湿": "#E58B4A",
        "全日照干": "#FFD166",
        "全日照湿": "#118AB2",
    }

    def get_neighbors(x, y, radius=1):
        coords = []
        for dx in range(-radius, radius + 1):
            for dy in range(-radius, radius + 1):
                if dx == 0 and dy == 0:
                    continue
                coords.append((x + dx, y + dy))
        return coords

    def get_model_config(model_path):
        model_path = f'../../frontend/public/models/{model_path}/metadata.json'
        with open(model_path, "r") as f:
            return json.load(f)

    # 阴影与湿地计算
    shade_set, half_shade_set = set(), set()
    for b in data["buildingPositions"]:
        bx, by = math.ceil(b["x"]), math.ceil(b["y"])
        shade_set.add((bx, by))
        half_shade_set.update(get_neighbors(bx, by, radius=1))
    for w in data["wallPositions"]:
        wx, wy = math.ceil(w["x"]), math.ceil(w["y"])
        shade_set.add((wx, wy))
        half_shade_set.update(get_neighbors(wx, wy, radius=1))

    wet_set = set()
    for water in data["waterPositions"]:
        wet_set.update(get_neighbors(water["x"], water["y"], radius=1))

    # 区域分类
    flower_zones = []
    for f in data["flowerPositions"]:
        pos = (f["x"], f["y"])
        is_wet = pos in wet_set
        if pos in shade_set:
            light = "全阴"
        elif pos in half_shade_set:
            light = "半日照"
        else:
            light = "全日照"
        wet_str = "湿" if is_wet else "干"
        zone_type = f"{light}{wet_str}"
        flower_zones.append({
            "position": {"x": f["x"], "y": f["y"]},
            "type": zone_type,
            "color": color_map.get(zone_type, "#FFFFFF")
        })

    # 植物筛选
    query = Plants.query.filter(
        (Plants.show_type.is_(None)) | (Plants.show_type == ''),
        Plants.model_path.isnot(None),
        Plants.model_path != '',
        ~Plants.name.in_(['葱', "羽衣甘蓝", "羽扇豆（鲁冰花）", "小花葱", "醉鱼草", "毛地黄", "大花飞燕草", "大花葱"])
    )
    print(query.statement.compile(dialect=sqlite.dialect(), compile_kwargs={"literal_binds": True}))
    all_plants = query.all()

    # 属性筛选
    selectedPlants = data.get('property', {}).get("selectedPlants")
    if selectedPlants:
        all_plants = [p for p in all_plants if p.name in selectedPlants]

    viewSeason = data.get('property', {}).get("viewSeason")
    if viewSeason and viewSeason != 'none':
        all_plants = [p for p in all_plants if match_season(viewSeason, p.ornamental_period)]

    style = data.get('property', {}).get("style")
    if style and style != 'none':
        style_dic = {
            "meadow": "混合草甸", "insectFriendly": "昆虫友好花园",
            "rainGarden": "雨水花园", "children": "儿童花园",
            "healing": "疗愈花园", "rock": "岩石花园",
            "edible": "可食花园",
        }
        style = style_dic.get(style)
        all_plants = [p for p in all_plants if style in p.garden_type.split("、")]

    # 光照-湿度匹配
    zone_query_map = {
        "全阴干": {"sunlight": ["低"], "water_need": ["低"]},
        "全阴湿": {"sunlight": ["低"], "water_need": ["高"]},
        "半日照干": {"sunlight": ["中"], "water_need": ["低", "中", "中、低"]},
        "半日照湿": {"sunlight": ["中"], "water_need": ["高", "中", "高、中"]},
        "全日照干": {"sunlight": ["高"], "water_need": ["低"]},
        "全日照湿": {"sunlight": ["高"], "water_need": ["高"]},
    }

    plants_by_zone = {z: [] for z in zone_query_map}
    for plant in all_plants:
        for zone_type, q in zone_query_map.items():
            if (set(plant.sunlight.split("、")) & set(q["sunlight"])) and (plant.water_need in q["water_need"]):
                plants_by_zone[zone_type].append(plant)

    final_result = []

    # ======================
    # 🌱 主体：多植物生成逻辑
    # ======================

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
            print(r)
            if r.crown_width:
                clusters[int(r.crown_width)].append(r)
        cluster_groups = sorted(clusters.keys(), reverse=True)  # 大->小

        print(f"cluster_groups: {cluster_groups}")

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

        return placed
    
    # radii = candidates
    print(all_plants)
    
    circles = clustered_circle_packing(10*50, 10*50, all_plants, padding=0.005)

    print(circles)

    
    for f in flower_zones:
        zone_type = f["type"]
        candidates = plants_by_zone.get(zone_type, [])
        if not candidates:
            continue

        f["plants"] = []  # 每个格子多个植物
        num_plants = random.randint(1, 3)  # 每格 1~3 株
        plant = random.choice(candidates)

        for offset_x, offset_y in circles:
            radius = int(plant.crown_width) / 2
            plant_info = {
                "id": plant.id,
                "name": plant.name,
                "latin_name": plant.latin_name,
                "family": plant.family,
                "genus": plant.genus,
                "color": plant.color_hex or "#888",
                "display_x": offset_x,
                "display_y": offset_y,
                "display_radius": radius,
            }
            f["plants"].append(plant_info)

        # 每格共用模型配置（取第一株的模型）
        f["models"] = get_model_config(plant.model_path)
        final_result.append(f)


    # ======================
    # 🍅 蔬菜藤架
    # ======================
    vegetables = Plants.query.filter_by(show_type='蔬菜爬藤架').all()
    for vege in data["vegetablePositions"]:
        vegetable = random.choice(vegetables)
        vege_res = {
            "type": "可食",
            "position": {"x": vege["x"], "y": vege["y"]},
            "color": "#88CC88",
            "plants": [{
                "id": vegetable.id,
                "name": vegetable.name,
                "latin_name": vegetable.latin_name,
                "family": vegetable.family,
                "genus": vegetable.genus,
                "color": vegetable.color_hex or "#888",
                "display_x": vege["x"],
                "display_y": vege["y"],
                "display_radius": 28
            }],
            "models": get_model_config(vegetable.model_path)
        }
        final_result.append(vege_res)

    # ======================
    # 🌸 观赏植物藤架
    # ======================
    ornamentals = Plants.query.filter_by(show_type='观赏植物藤架').all()
    for oran in data["ornamentalPositions"]:
        ornamental = random.choice(ornamentals)
        oran_res = {
            "type": "观赏",
            "position": {"x": oran["x"], "y": oran["y"]},
            "color": "#CC88CC",
            "plants": [{
                "id": ornamental.id,
                "name": ornamental.name,
                "latin_name": ornamental.latin_name,
                "family": ornamental.family,
                "genus": ornamental.genus,
                "color": ornamental.color_hex or "#888",
                "display_x": oran["x"],
                "display_y": oran["y"],
                "display_radius": 28
            }],
            "models": get_model_config(ornamental.model_path)
        }
        final_result.append(oran_res)

    return final_result




@app.route("/plants_data", methods=["POST"])
def plants_data():
    data = request.json

    data = partition6667(data)
#     data = [
#   {
#     "cell": { "x": 0, "y": 0 },
#     "plants": [
#       {
#         "id": 1,
#         "name": "松果菊",
#         "color": "#ffb347",
#         "radius": 8,
#         "offset_x": 0.3,
#         "offset_y": 0.6
#       },
#       {
#         "id": 2,
#         "name": "蓝羊毛",
#         "color": "#99ccff",
#         "radius": 5,
#         "offset_x": 0.7,
#         "offset_y": 0.4
#       }
#     ]
#   },
#   {
#     "cell": { "x": 1, "y": 2 },
#     "plants": [
#       {
#         "id": 3,
#         "name": "狼尾草",
#         "color": "#a0e57c",
#         "radius": 10,
#         "offset_x": 0.5,
#         "offset_y": 0.5
#       }
#     ]
#   }
# ]



    return jsonify({"success": True, "message": "获取模型配置成功", "data": data})


@app.route("/get_model_config", methods=["POST"])
def get_model_config():
    # data = request.json
    # if not data:
    #     return jsonify({"success": False, "message": "请求参数必须为 JSON"}), 400


    plants = Plants.query.all()
    # for plant in plants:
        # print(plant.name)

    model_config = [
        {
            "season": 0,
            "keyPrefix": "mint1",
            "models": [
                {
                    "resource": "/models/mint/",
                    "name": "mint_1",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.1, 0, 0],
                },
                {
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.1, 0, 0],
                },
                {
                    "resource": "/models/mint/",
                    "name": "mint_2",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [0.2, 0, 0],
                },
            ],
        },
        {
            "season": 1,
            "keyPrefix": "mint1",
            "models": [
                {
                    "resource": "/models/mint/",
                    "name": "mint_2",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.2, 0, 0],
                },
            ],
        },
        {
            "season": 2,
            "keyPrefix": "mint3",
            "models": [
                {
                    "resource": "/models/mint/",
                    "name": "mint_3",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.3, 0, 0],
                },
                {
                    "resource": "/models/mint/",
                    "name": "mint_1",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [0.4, 0, 0],
                },
            ],
        },
        {
            "season": 3,
            "keyPrefix": "mint4",
            "models": [
                {
                    "resource": "/models/mint/",
                    "name": "mint_4",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.5, 0, 0],
                },
            ],
        },
    ]

    return jsonify({"success": True, "message": "获取模型配置成功", "data": model_config})



@app.route("/location_msg")
def get_data():
    # 假设文件路径在当前目录下的 data.json
    file_path = os.path.join(os.path.dirname(__file__), "cn.json")

    # 打开并读取 json 文件
    with open(file_path, "r", encoding="utf-8") as f:
        cities = json.load(f)  # 解析成 Python 字典/列表
    # 构建省市树
    tree = defaultdict(list)
    for city in cities:
        province = city["admin_name_zh"]
        tree[province].append({
            "city": city["city_zh"],
            "lat": city["lat"],
            "lng": city["lng"],
            "population": city["population"],
            "population_proper": city["population_proper"]
        })

    # 转成标准结构
    province_tree = []
    for province, city_list in tree.items():
        province_tree.append({
            "province": province,
            "cities": city_list
        })

    # return jsonify(province_tree)
    return jsonify({"success": True, "message": "获取模型配置成功", "data": province_tree})


@app.get("/api/users")
# @jwt_required()
def list_users():
    users = Users.query.all()
    return ok([{"id": u.id, "username": u.username, "telephone": u.telephone} for u in users])


# 删除用户
@app.post("/api/delete_user")
# @jwt_required()
def delete_user():
    data = request.json
    uid = data.get("id")
    user = Users.query.get(uid)
    if not user:
        return err("用户不存在", status=404)

    db.session.delete(user)
    db.session.commit()
    return ok({"deleted": uid})




# —— CRUD 接口 —— 

@app.post("/api/create_reserve")
@jwt_required()
def create_reserve():
    current_user = get_jwt_identity()
    data = request.get_json() or {}

    reserve = Reserve(
        username=current_user,
        reserve_type=data.get("reserve_type", ""),
        detail=data.get("detail", ""),
        reserve_time=data.get("reserve_time", ""),
        status=data.get("status", "")
    )
    db.session.add(reserve)
    db.session.commit()
    return ok({"id": reserve.id})

@app.get("/api/reserves")
def list_reserve():
    plants = Reserve.query.all()
    result = [
        {col.name: getattr(p, col.name) for col in Reserve.__table__.columns}
        for p in plants
    ]
    return ok(result)

# 更新植物
@app.post("/api/update_reserves")
def update_reserve():
    data = request.json
    pid = data.get("id")
    reserve = Reserve.query.get(pid)

    if not reserve:
        return err("不存在", status=404)
    data = request.get_json() or {}
    for k, v in data.items():
        if hasattr(reserve, k):
            setattr(reserve, k, v)
    db.session.commit()
    result = {col.name: getattr(reserve, col.name) for col in Plants.__table__.columns}
    return ok(result)

# 删除植物
@app.post("/api/delete_reserve")
def delete_reserve():
    reserve = Reserve.query.get(request.json.get("id"))
    if not reserve:
        return err("不存在", status=404)
    db.session.delete(reserve)
    db.session.commit()
    return ok({"deleted": request.json.get("id")})



# 创建植物
@app.post("/api/create_plant")
def create_plant():
    data = request.get_json() or {}
    plant = Plants(**data)
    db.session.add(plant)
    db.session.commit()
    return ok({"id": plant.id})

# 获取所有植物（可分页）
@app.get("/api/plants")
def list_plants():
    plants = Plants.query.all()
    result = [
        {col.name: getattr(p, col.name) for col in Plants.__table__.columns}
        for p in plants
    ]
    return ok(result)

# 获取单个植物
@app.get("/api/plants/<int:pid>")
def get_plant(pid):
    plant = Plants.query.get(pid)
    if not plant:
        return err("植物不存在", status=404)
    result = {col.name: getattr(plant, col.name) for col in Plants.__table__.columns}
    return ok(result)

# 更新植物
@app.post("/api/update_plant")
def update_plant():
    data = request.json
    pid = data.get("id")
    plant = Plants.query.get(pid)

    if not plant:
        return err("植物不存在", status=404)
    data = request.get_json() or {}
    for k, v in data.items():
        if hasattr(plant, k):
            setattr(plant, k, v)
    db.session.commit()
    result = {col.name: getattr(plant, col.name) for col in Plants.__table__.columns}
    return ok(result)

# 删除植物
@app.post("/api/delete_plant")
def delete_plant():
    plant = Plants.query.get(request.json.get("id"))
    if not plant:
        return err("植物不存在", status=404)
    db.session.delete(plant)
    db.session.commit()
    return ok({"deleted": request.json.get("id")})


@app.route("/api/save_image", methods=["POST"])
def save_image():
    body = request.get_json()
    filename = body["filename"]
    data = body["data"]
    img_bytes = base64.b64decode(data)
    
    # 确保目录存在
    os.makedirs("./saved_image", exist_ok=True)
    
    # 写入文件
    with open(f"./saved_image/{filename}", "wb") as f:
        f.write(img_bytes)
    
    return {"status": "ok"}


@app.route("/api/save_pdf", methods=["POST"])
def save_pdf():
    """
    接收 JSON: { "images": [ { "filename": "spring.png", "data": "base64..." }, ... ] }
    返回生成的 PDF
    """
    body = request.get_json()
    images = body.get("images", [])
    plantlist = body.get("plantlist", [])
    # print(plantlist)

    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    # pdf.set_font("Arial", "B", 14)
    path = './SimHei.ttf'
    pdf.add_font("NotoSans", "", path, uni=True)
    
    pdf.set_font("NotoSans", size=14)
    pdf.add_page()
    pdf.multi_cell(0, 10, "种植清单", align="C")
    pdf.ln(5)

    # 表头
    pdf.set_font("NotoSans", size=12)
    pdf.cell(100, 10, "植物名称", border=1, align="C")
    pdf.cell(40, 10, "数量", border=1, align="C")
    pdf.ln()

    # 渲染列表
    for item in plantlist:
        pdf.cell(100, 10, item["name"], border=1, align="C")
        pdf.cell(40, 10, str(item["count"]), border=1, align="C")
        pdf.ln()

    pdf.add_page()
    pdf.set_font("NotoSans", size=14)
    pdf.multi_cell(0, 10, "养护清单", align="C")
    pdf.ln(5)

    pdf.set_fill_color(200, 220, 255)  # 淡蓝色背景
    pdf.cell(40, 10, "植物名称", border=1, align="C", fill=True)
    pdf.cell(50, 10, "常见病害", border=1, align="C", fill=True)
    pdf.cell(50, 10, "修剪建议", border=1, align="C", fill=True)
    pdf.cell(50, 10, "防治方法", border=1, align="C", fill=True)
    pdf.ln()

    # 表格内容
    pdf.set_font("NotoSans", size=10)

    for item in plantlist:
        plant = Plants.query.filter_by(name=item["name"]).first()
        if not plant:
            continue

        # 名称（带数量）
        pdf.cell(40, 10, f"{plant.name} × {item['count']}", border=1, align="L")

        # 常见病害
        pdf.cell(50, 10, plant.common_diseases or "-", border=1, align="L")

        # 修剪建议
        pdf.cell(50, 10, plant.pruning or "-", border=1, align="L")

        # 防治方法
        pdf.cell(50, 10, plant.control_methods or "-", border=1, align="L")

        pdf.ln()

    season_dic = {
        '0': '春', '1': '夏', '2': '秋', '3': '冬'
    }

    for img in images:
        filename = img["filename"]
        data = img["data"]
        img_bytes = base64.b64decode(data)
        season = season_dic.get(filename.split(".")[0])
        title = f"{season}季实景效果"
        if season is None:
            title = "花园平面效果"

        # 使用 BytesIO 临时存储图片
        img_io = io.BytesIO(img_bytes)

        pdf.add_page()

        pdf.multi_cell(0, 10, title, align="C")
        pdf.ln(5)  # 空一行
        pdf.image(img_io, x=10, y=50, w=180)  # 调整位置和宽度

    # 将 PDF 写入 BytesIO
    pdf_io = io.BytesIO()
    pdf.output(pdf_io)
    pdf_io.seek(0)

    return send_file(
        pdf_io,
        as_attachment=True,
        download_name="seasons.pdf",
        mimetype="application/pdf"
    )


plant_cache = {}

def query_deepseek(name: str):
    if name in plant_cache:
        # print(f"缓存命中: {name}")
        return plant_cache[name]

    client = OpenAI(
        api_key="sk-814681e6211245c6866479ad2634da84", 
        base_url="https://api.deepseek.com"
    )

    # print(f"请求 DeepSeek: {name}")

    try:
        response = client.chat.completions.create(
            model="deepseek-chat",
            messages=[
                {"role": "system", "content": "你是一个植物专家"},
                {"role": "user", "content": f"给出{name}的详细信息，包括基本特征、生长习性、常见病害、修剪建议、防治方法。"},
            ],
            stream=False
        )
        answer = response.choices[0].message.content.strip()
    except Exception as e:
        # print(f"DeepSeek API 调用失败: {e}")
        answer = "植物信息获取失败，请稍后再试。"

    # 写入缓存
    plant_cache[name] = answer
    return answer




# 获取单个植物
@app.get("/api/get_plant_detail")
def get_plant_detail():
    name = request.args.get("name")
    answer = query_deepseek(name)
    result = f"这是一个植物，{name}"
    return ok(answer)



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)