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



# 값과 해당 값이 포함되어야 할 범위 정의
values = ['25K', '50K', '100K', '250K', '500K', '1M']
ranges = {
    '25K': ['13', '14'],
    '50K': ['12', '13', '14'],
    '100K': ['11', '12'],
    '250K': ['10', '11'],
    '500K': ['9', '10'],
    '1M': ['8', '9']
}

# 결과 저장을 위한 리스트
result_lines = []

with open('data.txt', 'r', encoding='utf-8') as file:
    for line in file:
        line = line.strip()
        parts = line.split('|')
        if len(parts) == 2:
            pbh_code, values_str = parts
            values_in_line = values_str.split(',')
            line_result = [pbh_code]  # 이 부분에 코드 및 o,x를 저장하기 위해 리스트 시작
            
            # 기본값을 x로 설정한다. 값이 발견되면 해당 위치를 o로 변경
            marks = ['x'] * len(values)  # 값들 존재 여부
            range_marks = ['x'] * 7  # 영역 존재 여부
            
            for value in values:
                if value in values_in_line:
                    marks[values.index(value)] = 'o'
                    for r in ranges[value]:  # 해당 값의 영역 표시
                        range_index = 14 - int(r)  # 영역 8~14를 0~6 인덱스로 매핑
                        range_marks[range_index] = 'o'

            line_result.extend(marks + range_marks)  # 결과 리스트에 추가
            
            result_lines.append(' '.join(line_result))  # 공백으로 분리하여 문자열로 변환

# 결과를 새로운 파일에 쓰기
with open('result_data.txt', 'w', encoding='utf-8') as result_file:
    for result_line in result_lines:
        result_file.write(result_line + '\n')

print('결과 파일이 생성되었습니다.')
