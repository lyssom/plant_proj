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

app = Flask(__name__, static_folder="../../frontend/dist", template_folder="../../frontend/dist")
CORS(app)

# SQLite 配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users11.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

app.config["JWT_SECRET_KEY"] = "123456"  # 随机生成个安全的 key
jwt = JWTManager(app)



@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    print(66666666)
    if path != "" and os.path.exists(app.static_folder + "/" + path):
        print(app.static_folder + "/" + path)
        return send_from_directory(app.static_folder, path)
    else:
        print(app.static_folder + "/index.html")
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
    garden_type = db.Column(db.String, nullable=True)          # 花园类型
    sunlight = db.Column(db.String, nullable=True)             # 日照
    water_need = db.Column(db.String, nullable=True)           # 需水量
    cold_resistance = db.Column(db.String, nullable=True)      # 耐寒能力
    self_sowing = db.Column(db.String, nullable=True)          # 自播能力
    lodging_resistance = db.Column(db.String, nullable=True)   # 抗倒伏情况
    crown_width_cm = db.Column(db.String, nullable=True)       # 冠幅（cm）
    height_spring = db.Column(db.String, nullable=True)        # 植株高度-春
    height_summer = db.Column(db.String, nullable=True)        # 植株高度-夏
    height_autumn = db.Column(db.String, nullable=True)        # 植株高度-秋
    height_winter = db.Column(db.String, nullable=True)        # 植株高度-冬
    ornamental_period = db.Column(db.String, nullable=True)    # 观赏期
    flower_color = db.Column(db.String, nullable=True)         # 花朵颜色
    flower_height_cm = db.Column(db.String, nullable=True)     # 花朵高度（cm）
    usage = db.Column(db.Text, nullable=True)                  # 用途/特点
    control_methods = db.Column(db.Text, nullable=True)        # 防治方法
    common_diseases = db.Column(db.Text, nullable=True)        # 常见病害
    pruning = db.Column(db.String, nullable=True)              # 修剪节点
    watering_frequency = db.Column(db.String, nullable=True)   # 浇水频率
    needs_support = db.Column(db.String, nullable=True)        # 是否需要支架
    color = db.Column(db.String, nullable=True)                # 颜色
    model_config = db.Column(db.Text, nullable=True)
    


# 创建数据库表
def create_tables():
    """创建数据库表"""
    with app.app_context():
        db.create_all()
        print("数据库表创建完成")

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
        print(e)
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

    print(lat)
    print(min_temp)
    print(cold_resistance)
    print(plant_limit)
    # 只要植物耐寒温度 <= 当地最低温度，就算适合
    return plant_limit <= min_temp


def partition(data):
    import random

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

    # 阴影格子
    shade_set = set()
    half_shade_set = set()
    for b in data["buildingPositions"]:
        shade_set.add((math.ceil(b["x"]), math.ceil(b["y"])))  # 完全遮挡
        half_shade_set.update(get_neighbors(math.ceil(b["x"]), math.ceil(b["y"]), radius=1))
    for w in data["wallPositions"]:
        shade_set.add((math.ceil(w["x"]), math.ceil(w["y"])))
        half_shade_set.update(get_neighbors(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))

    print (shade_set)
    print (half_shade_set)

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
    all_plants = Plants.query.all()

    print(data)
    selectedPlants = data.get('property', {}).get("selectedPlants")

    if selectedPlants:
        all_plants = [p for p in all_plants if p.name in selectedPlants]


    viewSeason = data.get('property', {}).get("viewSeason")
    if viewSeason and viewSeason != 'none':
        all_plants = [p for p in all_plants if match_season(viewSeason, p.ornamental_period)]

    style = data.get('property', {}).get("style")
    print(style)
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
        print(style)
        
        all_plants = [p for p in all_plants if style in p.garden_type.split("、")]
        # for p in all_plants:
        #     print(p.garden_type.split("、"))
        #     print(style in p.garden_type.split("、"))

    lat = data.get('property', {}).get("lat")
    if lat:
        all_plants = [p for p in all_plants if match_lat(lat, p.cold_resistance)]



    
    print(all_plants)
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
    for f in flower_zones:
        zone_type = f["type"]
        candidates = plants_by_zone.get(zone_type, [])
        if candidates:
            plant = random.choice(candidates)
            f["plant"] = {
                "id": plant.id,
                "name": plant.name,
                "latin_name": plant.latin_name,
                "family": plant.family,
                "genus": plant.genus,
                "color": "#6BAF92"
            }
            f['models'] = [
        {
            "season": 0,
            "keyPrefix": "mint1",
            "models": [
                {                
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.1, 0, 0],
                },
            ],
        },
        {
            "season": 1,
            "keyPrefix": "mint1",
            "models": [
                                {
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.1, 0, 0],
                },                {
                    "resource": "/models/tree/",
                    "name": "tree",
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
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.1, 0, 0],
                },{              
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.2, 0, 0],
                },{                
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.3, 0, 0],
                }
            ],
        },
        {
            "season": 3,
            "keyPrefix": "mint4",
            "models": [
                {
                                
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.1, 0, 0],
                },{              
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.2, 0, 0],
                },{                
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.3, 0, 0],
                }, {                
                    "resource": "/models/tree/",
                    "name": "tree",
                    "upAxis": "y",
                    "target": 1,
                    "offset": [-0.4, 0, 0],
                }
            ],
        },
    ]
        else:
            f["plant"] ={
                "id": "",
                "name":"无",
                "latin_name": "",
                "family": "",
                "genus": "",
                "color": "#FFFFFF"
            }
            f["models"] = []
        final_result.append(f)


    return final_result




@app.route("/plants_data", methods=["POST"])
def plants_data():
    data = request.json
    print(data)

    data = partition(data)

    # print(data)

    return jsonify({"success": True, "message": "获取模型配置成功", "data": data})


@app.route("/get_model_config", methods=["POST"])
def get_model_config():
    # data = request.json
    # if not data:
    #     return jsonify({"success": False, "message": "请求参数必须为 JSON"}), 400


    plants = Plants.query.all()
    for plant in plants:
        print(plant.name)

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
    print(plantlist)

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



def query_deepseek(name):
    client = OpenAI(api_key="sk-48811da9f30a46c8a40fa6bbc95318c9", base_url="https://api.deepseek.com")

    print(name)

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": f'你是一个植物专家，给出{name}的信息'},
        ],
        stream=False
    )

    if response.status_code == 200:
        result = response.json()
        print(result['choices'][0]['message']['content'])
    else:
        print("请求失败，错误码：", response.status_code)



# 获取单个植物
@app.get("/api/get_plant_detail")
def get_plant_detail():
    name = request.args.get("name")
    query_deepseek(name)
    result = f"这是一个植物，{name}"
    return ok(result)



if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)