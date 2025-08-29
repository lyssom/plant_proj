from flask import Flask, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash

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

    data = [
        {
            "keyPrefix": "crocus",
            "resource": "/models/crocus/",
            "name": "12974_crocus_flower_v1_l3",
            "upAxis": "-x",
            "target": 0.05,
            "season": 0
        },
        {
            "keyPrefix": "plant2",
            "resource": "/models/plant2/",
            "name": "plants2",
            "upAxis": "y",
            "target": 0.005,
            "season": 1
        }
        ]


    return jsonify({"success": True, "message": "获取模型配置成功", "data": data})

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)