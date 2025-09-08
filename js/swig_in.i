%module mapcs   // 생성될 C# 네임스페이스/어셈블리 이름 용

%{
#include "WindowInfo.h"
#include "Map2D.h"
%}

/* 1) 타입 먼저 알려주기 */
%include "WindowInfo.h"

/* 2) C# 프록시 클래스에 GC 방지용 강한 참조 필드 추가 */
%typemap(cscode) SmartGI::Map2D %{
  // Prevent GC on WindowInfo passed into constructor,
  // because the underlying C++ stores only a shallow pointer.
  private SmartGI.WindowInfo windowRef;
%}

/* 3) 생성자 인자에 post 코드 삽입
      - C++ 선언:  Map2D(SmartGI::WindowInfo* window)
      - 파라미터 이름이 반드시 'window'여야 함 (다르면 아래 이름을 동일하게 바꾸세요)
*/
%typemap(csin, post="      windowRef = $csinput;")
  SmartGI::WindowInfo *window "SmartGI.WindowInfo.getCPtr($csinput)"

/* (필요 시) const 포인터 버전도 지원하려면 주석 해제
%typemap(csin, post="      windowRef = $csinput;")
  const SmartGI::WindowInfo *window "SmartGI.WindowInfo.getCPtr($csinput)"
*/

/* 4) 사용하는 선언 포함 */
%include "Map2D.h"
