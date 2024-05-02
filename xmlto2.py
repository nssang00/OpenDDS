# 지정된 값들
check_values = ['25K', '50K', '100K', '250K', '500K', '1M']

# 결과를 저장할 리스트
result_lines = []

# 파일 열기 및 처리
with open('data.txt', 'r', encoding='utf-8') as file:
    for line in file:
        parts = line.strip().split('|')  # 줄을 '|' 기준으로 분리
        if len(parts) != 2:
            continue  # '|'를 기준으로 분리했을 때 2부분이 아니면 스킵
        identifier, values_str = parts
        values = values_str.split(',')  # 값들을 ',' 기준으로 분리

        # 각 값이 있는지 체크하여 'o' 또는 'x'로 표시
        status_marks = ['o' if value in values else 'x' for value in check_values]

        result_line = identifier + '|' + ','.join(status_marks)  # 결과 문자열 생성
        result_lines.append(result_line)

# 결과를 새로운 파일에 쓰기
with open('result_data.txt', 'w', encoding='utf-8') as result_file:
    for result_line in result_lines:
        result_file.write(result_line + '\n')
