import pandas as pd

# 读取 Excel 文件
df = pd.read_excel("114所有植物(2).xlsx")

# 去掉表头第一行（含中文字段名）
df.columns = df.iloc[0].str.strip()
df = df[1:]

# 字段映射
mapping = {
    "植物名称": "name",
    "科": "family",
    "属": "genus",
    "拉丁名": "latin_name",
    "生命周期": "lifecycle",
    "植物分类": "classification",
    "冠幅": "crown_width",
    "日照": "sunlight",
    "需水量": "water_need",
    "自播能力": "self_sowing",
    "抗倒伏情况": "lodging_resistance",
    "色系": "color",
    "用途/特点": "usage",
    "防治方法": "control_methods",
    "常见病害": "common_diseases",
    "修剪节点": "pruning",
    "浇水频率": "watering_frequency",
    "是否需要支架": "needs_support",
    "耐寒分区": "hard_zone",
    "岩石园": "rock",
    "昆虫友好花园": "insect",
    "可食花园": "edible",
    "混合草甸花园": "meadow",
    "雨水花园": "rain_garden",
    "疗愈花园": "healing",
    "芳香花园": "scent_garden",
    "零维护花园": "normal_garden",
}

# 清理列名空格
df.columns = [c.strip() for c in df.columns]

# 选择并重命名列
filtered_df = df[list(mapping.keys())].rename(columns=mapping)

# 生成 SQLite 插入语句
insert_statements = []
for _, row in filtered_df.iterrows():
    cols = ", ".join(row.index)
    vals_list = []
    for v in row.values:
        if pd.isna(v):
            vals_list.append("NULL")
        else:
            v_str = str(v).replace("'", "''")  # 转义单引号
            vals_list.append("'" + v_str + "'")
    vals = ", ".join(vals_list)
    sql = f"INSERT INTO plants ({cols}) VALUES ({vals});"
    insert_statements.append(sql)

# 输出到文件
with open("plants_insert.sql", "w", encoding="utf-8") as f:
    f.write("-- SQLite 植物表数据插入语句\nBEGIN TRANSACTION;\n")
    f.write("\n".join(insert_statements))
    f.write("\nCOMMIT;\n")

print("✅ 已生成 plants_insert.sql 文件，可直接导入 SQLite 数据库。")
