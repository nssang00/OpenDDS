import os
import subprocess
import platform
from pathlib import Path
from datetime import datetime

# ============================================================
# 설정 (필요에 따라 수정하세요)
# ============================================================
TIF_FOLDER = r"C:\path\to\tif_folder"   # TIF 파일들이 있는 폴더 경로
LOGS_FOLDER = r"C:\path\to\logs"        # 로그 저장 폴더 경로 (현재 logs 폴더)

# ogrinfo 실행 파일 경로 (자동 감지 또는 직접 지정)
# 예: r"C:\OSGeo4W\bin\ogrinfo.exe" 또는 "/usr/bin/ogrinfo"
OGRINFO_PATH = None  # None이면 자동 감지
# ============================================================


def find_ogrinfo() -> str:
    """ogrinfo 실행 파일 경로를 자동으로 찾습니다."""
    if OGRINFO_PATH:
        return OGRINFO_PATH

    is_windows = platform.system() == "Windows"

    candidates = []
    if is_windows:
        candidates = [
            "ogrinfo.exe",
            r"C:\OSGeo4W64\bin\ogrinfo.exe",
            r"C:\OSGeo4W\bin\ogrinfo.exe",
            r"C:\Program Files\QGIS 3.x\bin\ogrinfo.exe",
        ]
        # QGIS 설치 경로 동적 탐색
        for root in [r"C:\Program Files", r"C:\Program Files (x86)"]:
            if os.path.exists(root):
                for d in os.listdir(root):
                    exe = os.path.join(root, d, "bin", "ogrinfo.exe")
                    if os.path.exists(exe):
                        candidates.append(exe)
    else:
        candidates = ["ogrinfo", "/usr/bin/ogrinfo", "/usr/local/bin/ogrinfo"]

    for c in candidates:
        try:
            result = subprocess.run(
                [c, "--version"],
                capture_output=True, text=True, timeout=5
            )
            if result.returncode == 0 or "GDAL" in (result.stdout + result.stderr):
                print(f"[INFO] ogrinfo 경로: {c}")
                return c
        except (FileNotFoundError, subprocess.TimeoutExpired):
            continue

    raise FileNotFoundError(
        "ogrinfo를 찾을 수 없습니다. OGRINFO_PATH를 직접 지정하세요.\n"
        "  예) OGRINFO_PATH = r'C:\\OSGeo4W64\\bin\\ogrinfo.exe'"
    )


def get_file_size_str(path: Path) -> str:
    """파일 크기를 읽기 좋은 문자열로 반환합니다."""
    size_bytes = path.stat().st_size
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}  ({size_bytes:,} bytes)"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


def run_ogrinfo(ogrinfo: str, tif_path: Path) -> str:
    """ogrinfo -al -mm 으로 TIF 전체 정보를 가져옵니다."""
    cmd = [ogrinfo, "-al", "-mm", str(tif_path)]
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=120
        )
        output = result.stdout
        if result.stderr:
            output += "\n[STDERR]\n" + result.stderr
        return output
    except subprocess.TimeoutExpired:
        return "[ERROR] ogrinfo 실행 시간 초과 (120초)"
    except Exception as e:
        return f"[ERROR] ogrinfo 실행 중 오류: {e}"


def process_tif_files():
    tif_dir = Path(TIF_FOLDER)
    logs_dir = Path(LOGS_FOLDER)

    # 폴더 유효성 확인
    if not tif_dir.exists():
        print(f"[ERROR] TIF 폴더를 찾을 수 없습니다: {tif_dir}")
        return
    logs_dir.mkdir(parents=True, exist_ok=True)

    # ogrinfo 경로 확인
    try:
        ogrinfo = find_ogrinfo()
    except FileNotFoundError as e:
        print(f"[ERROR] {e}")
        return

    # TIF 파일 수집 (대소문자 모두)
    tif_files = sorted(
        [f for f in tif_dir.iterdir()
         if f.is_file() and f.suffix.lower() in (".tif", ".tiff")]
    )

    if not tif_files:
        print(f"[WARNING] TIF 파일이 없습니다: {tif_dir}")
        return

    print(f"[INFO] TIF 파일 {len(tif_files)}개 발견")
    print(f"[INFO] 로그 저장 위치: {logs_dir}")
    print("-" * 60)

    success, failed = 0, 0

    for tif_path in tif_files:
        log_path = logs_dir / (tif_path.stem + ".txt")
        print(f"  처리 중: {tif_path.name} ... ", end="", flush=True)

        # 파일 크기 정보
        try:
            size_str = get_file_size_str(tif_path)
        except Exception as e:
            size_str = f"[크기 읽기 실패: {e}]"

        # ogrinfo 실행
        ogrinfo_output = run_ogrinfo(ogrinfo, tif_path)

        # 로그 파일 작성
        try:
            with open(log_path, "w", encoding="utf-8") as f:
                f.write(f"{'='*60}\n")
                f.write(f"파일명    : {tif_path.name}\n")
                f.write(f"전체 경로 : {tif_path.resolve()}\n")
                f.write(f"파일 용량 : {size_str}\n")
                f.write(f"처리 일시 : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"{'='*60}\n\n")
                f.write("[ogrinfo 출력]\n")
                f.write("-" * 60 + "\n")
                f.write(ogrinfo_output)
            print(f"저장 완료 → {log_path.name}")
            success += 1
        except Exception as e:
            print(f"[저장 실패: {e}]")
            failed += 1

    print("-" * 60)
    print(f"[완료] 성공: {success}개 / 실패: {failed}개 / 전체: {len(tif_files)}개")


if __name__ == "__main__":
    process_tif_files()
