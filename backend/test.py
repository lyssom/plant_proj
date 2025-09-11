
from openai import OpenAI

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


query_deepseek()