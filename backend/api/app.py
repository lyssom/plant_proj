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

CORS(app,
     supports_credentials=True,
     resources={r"/*": {"origins": "*"}}
)

@app.before_request
def handle_options():
    if request.method == "OPTIONS":
        return ("", 200)

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    return response

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

def match_place(province, city, hard_zone):
    """
    province: 省份（例如：'山东省'）
    city: 城市（例如：'青岛'）
    hard_zone: 可输入 '7区' 或 '7~9区'（字符串）
    zone_dict: 你的大字典（即你上面贴出的那个）
    """

    with open('zone_dic.json', 'r', encoding='utf-8') as f:
        zone_dict = json.load(f)

    # 1. 解析 hard_zone 字符串
    hard_zone = hard_zone.strip()
    zones = []

    if "~" in hard_zone:
        # 范围，如 7~9区
        left, right = hard_zone.replace("区", "").split("~")
        start = int(left)
        end = int(right)
        zones = [f"{i}区" for i in range(start, end + 1)]
    else:
        # 单一，如 7区
        z = hard_zone.replace("区", "")
        zones = [f"{int(z)}区"]

    # 2. 省份不存在
    if province not in zone_dict:
        return False

    prov = zone_dict[province]
    print(zones)

    # 3. 遍历所有可能的区，只要城市在其中一个就返回 True
    for z in zones:
        if z in prov:
            if city in prov[z]:
                return True
            
    print(province, city, hard_zone)

    return False


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
    
    def get_neighbors_south(x, y, radius=1):
        neighbors = []
        for dx in range(-radius, radius + 1):
            for dy in range(0, radius + 1):  # 只取 dy > 0
                neighbors.append((x + dx, y + dy))
        return neighbors

    def get_neighbors_north(x, y, radius=1):
        neighbors = []
        for dx in range(-radius, radius + 1):
            for dy in range(-1, -radius - 1, -1):  # 只取 dy < 0
                neighbors.append((x + dx, y + dy))
        return neighbors


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
    for w in data.get("buildingPositions", []):
        shade_set.update(get_neighbors_north(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))
        half_shade_set.update(get_neighbors_south(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))
        half_shade_set.update(get_neighbors_north(math.ceil(w["x"]), math.ceil(w["y"]), radius=2))
    for w in data.get("wallPositions", []):
        shade_set.update(get_neighbors_north(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))
        half_shade_set.update(get_neighbors_south(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))
    for w in data.get("treePositions", []):
        shade_set.update(get_neighbors_north(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))
        half_shade_set.update(get_neighbors_south(math.ceil(w["x"]), math.ceil(w["y"]), radius=1))
        half_shade_set.update(get_neighbors_north(math.ceil(w["x"]), math.ceil(w["y"]), radius=2))

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
    # print(all_plants)

    selectedPlants = data.get('property', {}).get("selectedPlants")
    if selectedPlants:
        all_plants = [p for p in all_plants if p.name in selectedPlants]

    # viewSeason = data.get('property', {}).get("viewSeason")
    # if viewSeason and viewSeason != 'none':
    #     all_plants = [p for p in all_plants if match_season(viewSeason, p.ornamental_period)]


    province = data.get('property', {}).get("province")
    city = data.get('property', {}).get("city")
    if province and province != 'none' and city and city != 'none':
        # all_plants = [p for p in all_plants if match_place(province, city, p.hard_zone)]
        for p in all_plants:
            cold_zone_res = match_place(province, city, p.hard_zone)
            print(province, city, p.hard_zone)
            print(cold_zone_res)
            if not cold_zone_res:
                all_plants.remove(p)



    style = data.get('property', {}).get("style")
    style_plants = []
    if style and style != 'none':
        if style == "no_style":
            style_plants = [p for p in all_plants if getattr(p, "edible") == "不"]
        else:
            style_plants = [p for p in all_plants if getattr(p, style) != "不"]
    
    if style_plants:
        all_plants = style_plants

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

    # print(plants_by_zone)

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
            # print(plant.name)
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
        # print(center_radius)

        # 记录 center 的 display_radius（直接存入 cm 单位数值）
        plant_info["display_radius"] = center_radius

        # 如果没有邻居格，则按单株放置（带一点随机 jitter，非边界）
        # 决定偏移量，如果在边界则不偏移
        if pos[0] == max_x or pos[1] == max_y or pos[0] == min_x or pos[1] == min_y:
            offset_x = 0
            offset_y = 0
        else:
            offset_x = -round(random.uniform(0, 0.5), 2)
            offset_y = round(random.uniform(0, 0.5), 2)
            # offset_x = 0
            # offset_y = 0


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

    
    print("第一株摆放完成")
    def other_plants(cluster_count=2, max_crown_width=100, min_crown_width=0):
        second_result = []

        for f in final_result:
            x0 = f["position"]["x"]
            y0 = f["position"]["y"]

            # 边缘不生成簇
            if x0 == max_x or y0 == max_y or x0 == min_x or y0 == min_y:
                continue

            # 主株信息
            center_x = f["plant"]["display_x"]
            center_y = f["plant"]["display_y"]
            center_r = f["plant"].get("display_radius", 0)

            # 找所有更小植物
            candidates = [
                p for p in plants_by_zone.get(f["type"])
                if float(p.crown_width) / 2 <= center_r and (float(p.crown_width) >= min_crown_width and float(p.crown_width) <= max_crown_width)
            ]

            if not candidates:
                continue

            # 从大到小
            candidates.sort(key=lambda p: p.crown_width, reverse=True)

            base_angle = random.uniform(0, 2 * math.pi)

            prev_x, prev_y, prev_r = center_x, center_y, center_r

            for p in candidates:
                r = float(p.crown_width) / 2

                # 每种植物放 N 株
                for n in range(cluster_count):

                    # 与上一株间距
                    dist = prev_r / 60 + r / 60

                    # 每株随机一点角度
                    angle = base_angle + random.uniform(-0.6, 0.6) + n * 0.4

                    dx = math.cos(angle) * dist
                    dy = math.sin(angle) * dist

                    new_x = prev_x + dx
                    new_y = prev_y + dy

                    new_item = deepcopy(f)
                    new_item["plant"] = {
                        "id": p.id,
                        "name": p.name,
                        "latin_name": getattr(p, "latin_name", ""),
                        "family": getattr(p, "family", ""),
                        "genus": getattr(p, "genus", ""),
                        "color": getattr(p, "color_hex", "#FFFFFF"),
                        "display_x": round(new_x, 2),
                        "display_y": round(new_y, 2),
                        "display_radius": r,
                    }

                    second_result.append(new_item)

                    # 更新 prev → 下一株以当前新株为中心
                    # prev_x, prev_y, prev_r = new_x, new_y, r

        return second_result


    # second_result = other_plants(min_crown_width=20)
    second_result = other_plants(cluster_count=3, min_crown_width=20)
    if style == "edible":
        second_result += other_plants(cluster_count=10, max_crown_width=30, min_crown_width=0)

    # for f in final_result:
    #     pos = (f["position"]["x"], f["position"]["y"])
    #     if not (pos[0] == max_x or pos[1] == max_y):

    #         # 第二株的半径（同品种）
    #         r2 = f['plant']['display_radius'] 
    #         if r2 >= 25:
    #             continue
    #         second = deepcopy(f)

    #         new_x = second["plant"]["display_x"]
    #         new_y = second["plant"]["display_y"]
    #         second["plant"]["display_x"] = new_x + round(random.uniform(r2/60, r2/50), 2)
    #         second["plant"]["display_y"] = new_y - round(random.uniform(r2/60, r2/50), 2)
    #         second_result.append(second)

    #         if r2 <= 15:
    #             third = deepcopy(f)
    #             third_x = third["plant"]["display_x"]
    #             third_y = third["plant"]["display_y"]
    #             third["plant"]["display_x"] = third_x + round(random.uniform(r2/60, r2/50), 2)
    #             third["plant"]["display_y"] = third_y - round(random.uniform(r2/60, r2/50), 2)
    #             second_result.append(third)

    #         if r2 <= 5:
    #             fourth = deepcopy(f)
    #             fourth_x = fourth["plant"]["display_x"]
    #             fourth_y = fourth["plant"]["display_y"]
    #             fourth["plant"]["display_x"] = fourth_x + round(random.uniform(r2/60, r2/50), 2)
    #             fourth["plant"]["display_y"] = fourth_y - round(random.uniform(r2/60, r2/50), 2)
    #             second_result.append(fourth)


    final_result += second_result

    final_result = cleaned(final_result,touch_limited=True)
    # final_result += other_plants(cluster_count=2, min_crown_width=20)
    fix_plant_zone(final_result)
    final_result = cleaned(final_result)


    for item in final_result:
        # print(item['position']['x'], item['position']['y'], item['plant']['display_x'], item['plant']['display_y'])
        if item.get('plant') and (not (item['position']['x'] - 0.5 <= item['plant']['display_x'] <= item['position']['x'] + 0.5)):
            # print("删除因x不在种植区:", item['plant']['name'])
            if item in final_result:  
                item['plant'] = {}
        if item.get('plant') and (not (item['position']['y'] - 0.5 <= item['plant']['display_y'] <= item['position']['y'] + 0.5)):
            # print("删除因y不在种植区:", item['plant']['name'])
            if item in final_result:  
                item['plant'] = {}


    return final_result

def fix_plant_zone(final_result):
    occupied = []

    for item in final_result:
        # print(item['position']['x'], item['position']['y'], item['plant']['display_x'], item['plant']['display_y'])

        if not item.get("plant"):
            continue

        # 1. 拉回种植区
        moved = pull_back_into_zone(item)

        # 2. 碰撞时自动相切
        resolve_collision_for_one(item, occupied)

        # 最终加入 occupied
        plant = item["plant"]
        occupied.append((
            plant["display_x"],
            plant["display_y"],
            float(plant.get("display_radius", 0)) / 50,
            plant
        ))


def pull_back_into_zone(item):
    px, py = item["position"]["x"], item["position"]["y"]
    x, y = item["plant"]["display_x"], item["plant"]["display_y"]

    # 限定范围
    min_x, max_x = px - 0.5, px + 0.5
    min_y, max_y = py - 0.5, py + 0.5

    changed = False

    # --- X 拉回 ---
    if x < min_x:
        x = min_x
        changed = True
    elif x > max_x:
        x = max_x
        changed = True

    # --- Y 拉回 ---
    if y < min_y:
        y = min_y
        changed = True
    elif y > max_y:
        y = max_y
        changed = True

    item["plant"]["display_x"] = x
    item["plant"]["display_y"] = y

    return changed


def resolve_collision_for_one(item, occupied, max_shift=0.5):
    x = item["plant"]["display_x"]
    y = item["plant"]["display_y"]
    r = float(item["plant"].get("display_radius", 0)) / 50

    for ox, oy, orad, _ in occupied:
        dist = ((x - ox)**2 + (y - oy)**2) ** 0.5
        min_dist = r + orad

        # 发生碰撞
        if dist < min_dist:
            dx = x - ox
            dy = y - oy

            # 🚨 中心完全重叠 → 给它一个微小随机方向
            if dist == 0:
                import random
                angle = random.uniform(0, 6.28318)
                dx = math.cos(angle)
                dy = math.sin(angle)
                dist = 1.0  # 避免除零（方向归一化时用）

            # 拉开到相切位置
            scale = min_dist / dist
            new_x = ox + dx * scale
            new_y = oy + dy * scale

            # 限制最大位移
            shift_x = max(-max_shift, min(max_shift, new_x - x))
            shift_y = max(-max_shift, min(max_shift, new_y - y))

            x += shift_x
            y += shift_y

    item["plant"]["display_x"] = round(x, 3)
    item["plant"]["display_y"] = round(y, 3)



def cleaned(final_result, touch_limited=False):
    cleaned = []
    occupied = []  # (x, y, r, item)
    for item in final_result:
        plant = item["plant"]
        x = plant["display_x"]
        y = plant["display_y"]
        r = float(plant.get("display_radius", 0)) / 50

        # 若碰撞 → 尝试偏移
        if is_conflict(x, y, r, occupied):
            new_xy = try_resolve_with_offset(x, y, r, occupied)
            if new_xy:
                x, y = new_xy
                plant["display_x"] = x
                plant["display_y"] = y
            else:
                print("删除因无法摆放:", plant.get("name"))
                continue

        cleaned.append(item)
        occupied.append((x, y, r, item))


    # 最后一轮全局松弛，确保无碰撞
    if touch_limited:
        resolve_collisions_random_touch_limited(occupied)
    return cleaned

# 判断是否碰撞
def is_conflict(x, y, r, occupied):
    for ox, oy, orad, _ in occupied:
        dist = math.sqrt((x - ox)**2 + (y - oy)**2)
        if dist < (r + orad):
            return True
    return False


# 尝试局部偏移
def try_resolve_with_offset(x, y, r, occupied, max_shift=0.5):
    """
    尝试将 (x, y) 移动到与所有 occupied 中的圆相切的位置。
    若没有碰撞，则原地返回。
    """

    # 1. 原地不冲突 → 直接返回
    if not is_conflict(x, y, r, occupied):
        return x, y

    # 2. 针对每个已占用的点尝试“相切位置”
    for ox, oy, orad, _ in occupied:
        dx = x - ox
        dy = y - oy
        dist = (dx*dx + dy*dy) ** 0.5
        min_dist = r + orad

        # 完全重合 → 给一个随机方向
        if dist == 0:
            angle = random.uniform(0, 6.28318)
            dx = math.cos(angle)
            dy = math.sin(angle)
            dist = 1e-6

        # 计算需要移动到相切处的目标坐标
        scale = min_dist / dist
        target_x = ox + dx * scale
        target_y = oy + dy * scale

        # 限制最大位移
        shift_x = target_x - x
        shift_y = target_y - y

        shift_x = max(-max_shift, min(max_shift, shift_x))
        shift_y = max(-max_shift, min(max_shift, shift_y))

        nx = x + shift_x
        ny = y + shift_y

        # 检查这个“相切点”是否和其他圆碰撞
        if not is_conflict(nx, ny, r, occupied):
            return round(nx,3), round(ny,3)

    # 3. 再尝试随机相切（随机方向的相切点）
    for _ in range(8):
        angle = random.uniform(0, 6.28318)
        ux = math.cos(angle)
        uy = math.sin(angle)

        # 顶多移动到 max_shift
        nx = x + ux * max_shift
        ny = y + uy * max_shift

        if not is_conflict(nx, ny, r, occupied):
            return round(nx,3), round(ny,3)

    # 都失败 → 返回 None
    return None


def resolve_collisions_random_touch_limited(occ, iterations=2, k_attract=0.01, k_repulse=0.5, touch_prob=0.005, max_move=0.5):
    """
    occ: [(x, y, r, item)]
    k_attract: 拉近比例
    k_repulse: 推开比例
    touch_prob: 距离大于r1+r2时，随机拉近的概率（0~1）
    max_move: 单次最大移动距离
    """
    for _ in range(iterations):
        changed = False

        for i in range(len(occ)):
            for j in range(i + 1, len(occ)):
                x1, y1, r1, item1 = occ[i]
                x2, y2, r2, item2 = occ[j]

                dx = x2 - x1
                dy = y2 - y1
                dist = math.hypot(dx, dy)
                min_dist = r1 + r2

                if dist == 0:
                    dx, dy = 1, 0
                    dist = 1
                ux = dx / dist
                uy = dy / dist

                move1x = move1y = move2x = move2y = 0

                # 重叠 → 推开
                if dist < min_dist:
                    overlap = (min_dist - dist) * k_repulse
                    move1x = -ux * overlap
                    move1y = -uy * overlap
                    move2x = ux * overlap
                    move2y = uy * overlap
                    changed = True

                # 距离 > min_dist → 随机拉近
                elif dist > min_dist and random.random() < touch_prob:
                    gap = (dist - min_dist) * k_attract
                    move1x = ux * gap
                    move1y = uy * gap
                    move2x = -ux * gap
                    move2y = -uy * gap
                    changed = True

                else:
                    continue  # 不动

                # 限制移动距离
                move1x = max(-max_move, min(max_move, move1x))
                move1y = max(-max_move, min(max_move, move1y))
                move2x = max(-max_move, min(max_move, move2x))
                move2y = max(-max_move, min(max_move, move2y))
                # print(move1x, move1y, move2x, move2y)

                # 更新位置
                nx1 = x1 + move1x
                ny1 = y1 + move1y
                nx2 = x2 + move2x
                ny2 = y2 + move2y

                occ[i] = (nx1, ny1, r1, item1)
                occ[j] = (nx2, ny2, r2, item2)

                item1["plant"]["display_x"] = nx1
                item1["plant"]["display_y"] = ny1
                item2["plant"]["display_x"] = nx2
                item2["plant"]["display_y"] = ny2

        if not changed:
            break





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