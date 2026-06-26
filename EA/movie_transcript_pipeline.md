# 영화 음성 처리 파이프라인 기술 스택 정리

## 1. 프로젝트 1차 목표

영화 또는 긴 영상 파일을 입력받아, 화자 정보가 포함된 구조화된 Transcript JSON을 생성한다.

즉, 1차 목표는 완성형 서비스가 아니라 다음 기능을 수행하는 핵심 처리 엔진을 만드는 것이다.

```text
Movie / Video
    ↓
Audio Extraction
    ↓
Speech Detection
    ↓
Speaker Diarization
    ↓
Speech Recognition
    ↓
Transcript JSON
```

---

## 2. 1차 MVP 범위

### 포함하는 기능

- 영상 파일에서 오디오 추출
- 음성이 있는 구간 검출
- 화자 분리
- 음성 인식
- 화자 + 타임스탬프 + 텍스트를 포함한 JSON 생성

### 제외하는 기능

아래 기능은 2차 이후로 미룬다.

- 번역
- TTS / 더빙
- 음성 복제
- 화자 이름 추론
- 감정 분석
- 장면 분석
- LLM 기반 요약
- WhisperX / Forced Alignment
- ComfyUI 워크플로우화

---

## 3. 확정 기술 스택

| 영역 | 기술 | 역할 |
|---|---|---|
| 영상/오디오 처리 | FFmpeg | 영상에서 오디오 추출, 포맷 변환 |
| 음성 구간 검출 | Silero VAD | 사람이 말하는 구간 탐지 |
| 화자 분리 | pyannote.audio | 누가 말했는지 구분 |
| 음성 인식 | faster-whisper | 음성을 텍스트로 변환 |
| 파이프라인 구현 | Python | 각 단계 실행, 결과 병합, JSON 저장 |

---

## 4. 전체 파이프라인

```text
movie.mp4 / movie.mkv
        ↓
FFmpeg
        ↓
movie.wav
        ↓
Silero VAD
        ↓
speech_segments.json
        ↓
pyannote.audio
        ↓
speaker_segments.json
        ↓
faster-whisper
        ↓
transcription_segments.json
        ↓
merge_transcript.py
        ↓
transcript.json
```

---

## 5. 각 단계별 출력 예시

### 5.1 FFmpeg

입력:

```text
movie.mp4
```

출력:

```text
movie.wav
```

권장 오디오 포맷:

```text
16kHz / mono / wav
```

예시 명령어:

```bash
ffmpeg -i movie.mp4 -ar 16000 -ac 1 movie.wav
```

---

### 5.2 Silero VAD

역할:

사람이 말하는 구간만 찾는다.

출력 예시:

```json
[
  {
    "start": 2.31,
    "end": 8.72
  },
  {
    "start": 10.53,
    "end": 14.91
  }
]
```

---

### 5.3 pyannote.audio

역할:

각 음성 구간에서 누가 말했는지 구분한다.

출력 예시:

```json
[
  {
    "speaker": "SPEAKER_00",
    "start": 2.31,
    "end": 8.72
  },
  {
    "speaker": "SPEAKER_01",
    "start": 10.53,
    "end": 14.91
  }
]
```

주의:

- `SPEAKER_00`, `SPEAKER_01`은 실제 인물 이름이 아니다.
- 주인공, 경찰, 여성1 같은 이름 매핑은 2차 이후 기능으로 둔다.

---

### 5.4 faster-whisper

역할:

음성을 텍스트로 변환한다.

출력 예시:

```json
[
  {
    "start": 2.31,
    "end": 8.72,
    "text": "안녕하세요."
  },
  {
    "start": 10.53,
    "end": 14.91,
    "text": "반갑습니다."
  }
]
```

---

### 5.5 최종 Transcript JSON

최종 출력은 다음과 같은 구조를 목표로 한다.

```json
[
  {
    "speaker": "SPEAKER_00",
    "start": 2.31,
    "end": 8.72,
    "text": "안녕하세요."
  },
  {
    "speaker": "SPEAKER_01",
    "start": 10.53,
    "end": 14.91,
    "text": "반갑습니다."
  }
]
```

---

## 6. Python 중심 프로젝트 구조

초기 구조는 ComfyUI가 아니라 Python CLI 중심으로 만든다.

추천 디렉토리 구조:

```text
movie-transcript-pipeline/
├── main.py
├── config.yaml
├── requirements.txt
├── README.md
│
├── src/
│   ├── extract_audio.py
│   ├── detect_speech.py
│   ├── diarize.py
│   ├── transcribe.py
│   ├── merge_transcript.py
│   └── utils.py
│
├── input/
│   └── movie.mp4
│
├── output/
│   ├── movie.wav
│   ├── speech_segments.json
│   ├── speaker_segments.json
│   ├── transcription_segments.json
│   └── transcript.json
│
└── models/
```

---

## 7. 왜 Python 중심으로 가는가

ComfyUI도 워크플로우 구성은 가능하지만, 1차 목표에서는 Python 파이프라인이 더 적합하다.

### Python 중심 방식의 장점

- 긴 영상 처리에 적합
- 파일 입출력 관리가 쉬움
- 에러 처리와 재시도 구현이 쉬움
- 중간 결과 저장과 디버깅이 쉬움
- pyannote, faster-whisper, FFmpeg 연동이 자연스러움
- 나중에 FastAPI 또는 ComfyUI Custom Node로 감싸기 쉬움

### ComfyUI는 나중에 고려

ComfyUI는 다음 단계에서 검토한다.

- 번역
- TTS
- 음성 복제
- 립싱크
- 더빙
- 영상 합성

즉, 검증된 Python 기능을 나중에 ComfyUI Custom Node로 감싸는 순서가 좋다.

---

## 8. 1차 완료 기준

영화 파일 하나를 입력했을 때 다음이 자동으로 수행되면 1차 목표는 완료로 본다.

- FFmpeg로 오디오를 추출한다.
- Silero VAD로 음성 구간을 검출한다.
- pyannote.audio로 화자를 분리한다.
- faster-whisper로 음성을 텍스트로 변환한다.
- `speaker`, `start`, `end`, `text`를 포함한 `transcript.json`을 생성한다.

---

## 9. 이후 확장 계획

### 2차 후보: 자막 생성

Transcript JSON을 기반으로 SRT 또는 WebVTT를 생성한다.

```text
transcript.json
    ↓
subtitle.srt / subtitle.vtt
```

### 3차 후보: 번역

Qwen 계열 LLM을 Ollama로 실행하여 번역을 추가한다.

```text
transcript.json
    ↓
Qwen Translation
    ↓
translated_transcript.json
```

### 4차 후보: TTS / 더빙

번역된 Transcript를 기반으로 음성을 생성한다.

```text
translated_transcript.json
    ↓
TTS
    ↓
dubbed_audio.wav
```

---

## 10. 현재 결정 사항 요약

| 항목 | 결정 |
|---|---|
| 개발 방식 | Python 중심 |
| UI 방식 | 초기에는 없음, CLI 중심 |
| ASR | faster-whisper |
| VAD | Silero VAD |
| 화자 분리 | pyannote.audio |
| 영상 처리 | FFmpeg |
| 1차 산출물 | Transcript JSON |
| 번역 | 다음 단계에서 검토 |
| ComfyUI | 초기 제외, 나중에 Custom Node로 검토 |

---

## 11. 핵심 정의

이 프로젝트의 1차 버전은 자막 생성기가 아니라,

> 영화를 구조화된 대화 데이터로 변환하는 Python 기반 음성 분석 파이프라인

이다.

이 구조화된 Transcript JSON을 중심으로 이후 자막, 번역, 더빙, 검색, 요약 기능을 확장한다.
