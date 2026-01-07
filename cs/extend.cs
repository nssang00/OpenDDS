public class SGISGraphicBase2D
{
    // 1. 타입을 생성하는 로직을 담은 딕셔너리 정의
    private static readonly Dictionary<string, Func<IntPtr, bool, SGISGraphicBase2D>> _creators = 
        new Dictionary<string, Func<IntPtr, bool, SGISGraphicBase2D>>()
    {
        { "SGISGraphicCircle", (ptr, own) => new SGISGraphicCircle(ptr, own) },
        { "SGISGraphicRectangle", (ptr, own) => new SGISGraphicRectangle(ptr, own) },
        { "SGISGraphicPolygon", (ptr, own) => new SGISGraphicPolygon(ptr, own) }
        // 새로운 클래스가 생기면 여기에만 추가하면 됩니다.
    };

    public static SGISGraphicBase2D CreateFromPtr(IntPtr cPtr, bool cMemoryOwn)
    {
        if (cPtr == IntPtr.Zero) return null;

        string typeName = GetObjectTypeName(cPtr);

        // 2. 딕셔너리에서 해당 타입명이 있는지 확인 후 실행
        if (_creators.TryGetValue(typeName, out var creator))
        {
            return creator(cPtr, cMemoryOwn);
        }

        // 3. 일치하는 게 없으면 기본 클래스 반환
        return new SGISGraphicBase2D(cPtr, cMemoryOwn);
    }
}
