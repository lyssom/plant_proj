# import sqlite3

# # 连接到SQLite数据库（如果不存在会自动创建）
# conn = sqlite3.connect('users.db')
# cursor = conn.cursor()

# # 创建用户表
# create_table_sql = '''
# CREATE TABLE IF NOT EXISTS users (
#     id INTEGER PRIMARY KEY AUTOINCREMENT,
#     username TEXT UNIQUE NOT NULL,
#     password_hash TEXT NOT NULL,
#     telephone TEXT
# )
# '''

# cursor.execute(create_table_sql)
# conn.commit()

# print("表创建成功！")

# # 关闭连接
# conn.close()

import sqlite3

def show_tables(db_name='users11.db'):
    """显示数据库中的所有表"""
    try:
        with sqlite3.connect(db_name) as conn:
            cursor = conn.cursor()
            
            # 查询所有表（SQLite系统表sqlite_master）
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            if tables:
                print("数据库中的表:")
                for i, table in enumerate(tables, 1):
                    print(f"{i}. {table[0]}")
            else:
                print("数据库中没有表")
                
    except sqlite3.Error as e:
        print(f"数据库错误: {e}")

# 使用示例
# show_tables()



def show_tables(db_name='users11.db'):
    """显示数据库中的所有表"""
    try:
        with sqlite3.connect(db_name) as conn:
            cursor = conn.cursor()
            
            # 查询所有表（SQLite系统表sqlite_master）
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
            tables = cursor.fetchall()
            
            if tables:
                print("数据库中的表:")
                for i, table in enumerate(tables, 1):
                    print(f"{i}. {table[0]}")
            else:
                print("数据库中没有表")
                
    except sqlite3.Error as e:
        print(f"数据库错误: {e}")

# 使用示例
show_tables()