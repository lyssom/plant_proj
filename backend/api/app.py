from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
import os, json
from collections import defaultdict

app = Flask(__name__)
CORS(app)

# SQLite 配置
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users11.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# ORM 模型
class Users(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

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
        return jsonify({"success": True, "message": "登录成功"})
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

    if not username or not password:
        return jsonify({"success": False, "message": "用户名和密码不能为空"}), 400

    # 检查用户名是否存在
    if Users.query.filter_by(username=username).first():
        return jsonify({"success": False, "message": "用户名已存在"}), 400

    # 创建用户
    user = Users(username=username)
    user.set_password(password)
    
    try:
        db.session.add(user)
        db.session.commit()
        return jsonify({"success": True, "message": "注册成功"})
    except Exception as e:
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


@app.route("/get_model_config", methods=["POST"])
def get_model_config():
    # data = request.json
    # if not data:
    #     return jsonify({"success": False, "message": "请求参数必须为 JSON"}), 400

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
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)