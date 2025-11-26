from openai import OpenAI

def query_deepseek(name):
    client = OpenAI(
        api_key="sk-814681e6211245c6866479ad2634da84",
        base_url="https://api.deepseek.com/v1"  # 确认 DeepSeek 官方路径
    )

    response = client.chat.completions.create(
        model="deepseek-chat",
        messages=[
            {"role": "system", "content": "You are a helpful assistant"},
            {"role": "user", "content": f"你是一个植物专家，给出{name}的信息"},
        ]
    )

    print(response.choices[0].message.content)


query_deepseek("大白菜")
