// ITopicMessage.h
public interface class ITopicMessage {
    void Deserialize(array<System::Byte>^ data);
};

// TopicManager.h
public ref class TopicManager sealed {
private:
    static TopicManager^ _instance = gcnew TopicManager();
    System::Collections::Generic::Dictionary<System::String^, System::Type^>^ _registry;

    TopicManager() {
        _registry = gcnew System::Collections::Generic::Dictionary<System::String^, System::Type^>();
    }

public:
    static property TopicManager^ Instance {
        TopicManager^ get() { return _instance; }
    }

    void Register(System::String^ topicName, System::Type^ type) {
        if (!_registry->ContainsKey(topicName))
            _registry->Add(topicName, type);
    }

    ITopicMessage^ CreateAndDeserialize(System::String^ topicName, array<System::Byte>^ data) {
        System::Type^ type;
        if (!_registry->TryGetValue(topicName, type))
            throw gcnew System::Exception("Unknown topic: " + topicName);

        // Activator로 인스턴스 생성 후 Deserialize 호출
        ITopicMessage^ msg = safe_cast<ITopicMessage^>(System::Activator::CreateInstance(type));
        msg->Deserialize(data);
        return msg;
    }
};
2. 생성되는 ref class 템플릿
코드젠이 아래 패턴으로 클래스를 뽑아내면 됩니다.
// [Generated] SensorData.h
public ref class SensorDataMessage : public ITopicMessage {
public:
    // 실제 필드
    float Temperature;
    float Humidity;

    // ★ static 생성자 → 클래스 최초 로드 시 자동 등록
    static SensorDataMessage() {
        TopicManager::Instance->Register("sensor/data", SensorDataMessage::typeid);
    }

    virtual void Deserialize(array<System::Byte>^ data) override {
        // 예: 네이티브 구조체로 pin_ptr 후 memcpy
        pin_ptr<System::Byte> p = &data[0];
        NativeSensorData* native = reinterpret_cast<NativeSensorData*>(p);
        Temperature = native->temperature;
        Humidity    = native->humidity;
    }
};

// [Generated] CameraFrame.h
public ref class CameraFrameMessage : public ITopicMessage {
public:
    int Width, Height;
    array<System::Byte>^ PixelData;

    static CameraFrameMessage() {
        TopicManager::Instance->Register("camera/frame", CameraFrameMessage::typeid);
    }

    virtual void Deserialize(array<System::Byte>^ data) override {
        // ... 역직렬화 로직
    }
};
3. 문제: static 생성자는 실제로 참조될 때만 실행됨
CLR의 static 생성자는 해당 타입이 처음 사용될 때 실행됩니다. 아무도 참조 안 하면 등록이 안 됩니다.
해결책: 강제 초기화 모듈 생성
// TopicRegistry.h  ← 코드젠이 함께 생성
public ref class TopicRegistry abstract sealed {
public:
    static void Initialize() {
        // 각 타입에 접근해서 static 생성자를 강제 실행
        System::Runtime::CompilerServices::RuntimeHelpers::RunClassConstructor(
            SensorDataMessage::typeid->TypeHandle);
        System::Runtime::CompilerServices::RuntimeHelpers::RunClassConstructor(
            CameraFrameMessage::typeid->TypeHandle);
        // 새 토픽 추가 시 여기도 코드젠으로 자동 추가
    }
};
또는 더 자동화하려면 커스텀 Attribute + 반사:
// 마킹용 attribute
[System::AttributeUsage(System::AttributeTargets::Class)]
public ref class TopicAttribute : public System::Attribute {
public:
    System::String^ TopicName;
    TopicAttribute(System::String^ name) : TopicName(name) {}
};

// 사용
[Topic("sensor/data")]
public ref class SensorDataMessage : public ITopicMessage { ... };

// 스타트업에서 어셈블리 스캔
static void AutoRegisterAll() {
    auto assembly = System::Reflection::Assembly::GetExecutingAssembly();
    for each (System::Type^ t in assembly->GetTypes()) {
        auto attr = safe_cast<TopicAttribute^>(
            System::Attribute::GetCustomAttribute(t, TopicAttribute::typeid));
        if (attr != nullptr)
            TopicManager::Instance->Register(attr->TopicName, t);
    }
}
4. C# 사용 측
// 앱 시작 시 한 번만
TopicRegistry.Initialize(); // 또는 AutoRegisterAll()

// 메시지 수신 시
void OnTopicReceived(string topicName, byte[] data)
{
    var msg = TopicManager.Instance.CreateAndDeserialize(topicName, data);

    switch (msg)
    {
        case SensorDataMessage sensor:
            Console.WriteLine($"Temp: {sensor.Temperature}");
            break;
        case CameraFrameMessage cam:
            Console.WriteLine($"Frame: {cam.Width}x{cam.Height}");
            break;
    }
}
