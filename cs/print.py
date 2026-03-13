import os

folder = "logs"           # 현재 디렉토리 기준 상대경로
keyword = "Exception"

for root, _, files in os.walk(folder):
    for filename in files:
        filepath = os.path.join(root, filename)
        try:
            with open(filepath, encoding="utf-8") as f:
                for i, line in enumerate(f, 1):
                    if keyword in line:
                        print(f"{filepath}:{i:4d}  {line.rstrip()}")
        except Exception as e:
            print(f"읽기 실패: {filepath}  ({e})")
