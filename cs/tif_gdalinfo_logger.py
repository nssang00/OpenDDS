import subprocess
from pathlib import Path
from datetime import datetime

# ============================================================
# 설정 (필요에 따라 수정하세요)
# ============================================================
TIF_FOLDER = r"C:\path\to\tif_folder"   # TIF 파일들이 있는 폴더 경로
# ============================================================

GDALINFO_EXE = Path(__file__).parent / "bin" / "gdalinfo.exe"
LOGS_FOLDER  = Path(__file__).parent / "logs"


def get_file_size_str(path: Path) -> str:
    size_bytes = path.stat().st_size
    for unit in ["B", "KB", "MB", "GB", "TB"]:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}  ({size_bytes:,} bytes)"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


def run_gdalinfo(tif_path: Path) -> str:
    try:
        result = subprocess.run(
            [str(GDALINFO_EXE), str(tif_path)],
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
        return "[ERROR] gdalinfo 실행 시간 초과 (120초)"
    except Exception as e:
        return f"[ERROR] gdalinfo 실행 중 오류: {e}"


def process_tif_files():
    if not GDALINFO_EXE.exists():
        print(f"[ERROR] gdalinfo.exe를 찾을 수 없습니다: {GDALINFO_EXE}")
        return

    tif_dir = Path(TIF_FOLDER)
    if not tif_dir.exists():
        print(f"[ERROR] TIF 폴더를 찾을 수 없습니다: {tif_dir}")
        return

    LOGS_FOLDER.mkdir(parents=True, exist_ok=True)

    tif_files = sorted(
        [f for f in tif_dir.iterdir()
         if f.is_file() and f.suffix.lower() in (".tif", ".tiff")]
    )

    if not tif_files:
        print(f"[WARNING] TIF 파일이 없습니다: {tif_dir}")
        return

    print(f"[INFO] gdalinfo 경로: {GDALINFO_EXE}")
    print(f"[INFO] TIF 파일 {len(tif_files)}개 발견")
    print(f"[INFO] 로그 저장 위치: {LOGS_FOLDER}")
    print("-" * 60)

    success, failed = 0, 0

    for tif_path in tif_files:
        log_path = LOGS_FOLDER / (tif_path.stem + ".txt")
        print(f"  처리 중: {tif_path.name} ... ", end="", flush=True)

        try:
            size_str = get_file_size_str(tif_path)
        except Exception as e:
            size_str = f"[크기 읽기 실패: {e}]"

        gdalinfo_output = run_gdalinfo(tif_path)

        try:
            with open(log_path, "w", encoding="utf-8") as f:
                f.write(f"{'='*60}\n")
                f.write(f"파일명    : {tif_path.name}\n")
                f.write(f"전체 경로 : {tif_path.resolve()}\n")
                f.write(f"파일 용량 : {size_str}\n")
                f.write(f"처리 일시 : {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
                f.write(f"{'='*60}\n\n")
                f.write("[gdalinfo 출력]\n")
                f.write("-" * 60 + "\n")
                f.write(gdalinfo_output)
            print(f"저장 완료 → {log_path.name}")
            success += 1
        except Exception as e:
            print(f"[저장 실패: {e}]")
            failed += 1

    print("-" * 60)
    print(f"[완료] 성공: {success}개 / 실패: {failed}개 / 전체: {len(tif_files)}개")


if __name__ == "__main__":
    process_tif_files()
