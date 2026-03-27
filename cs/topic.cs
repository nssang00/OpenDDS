TopicSystem.h
#pragma once
using namespace System;
using namespace System::Collections::Generic;

public interface class ISerializable
{
    void Deserialize(IntPtr data, int size);
    IntPtr Serialize(int% size);
};

public interface class ITopicMessage : public ISerializable
{
    property String^ TopicName { String^ get(); }
};

public delegate ITopicMessage^ CreateMessageDelegate();
public delegate void OnMessageDelegate(String^ topicName, ITopicMessage^ msg);

public ref class TopicManager sealed
{
private:
    static TopicManager^ _instance = gcnew TopicManager();
    Dictionary<String^, CreateMessageDelegate^>^ _registry;

    TopicManager()
    {
        _registry = gcnew Dictionary<String^, CreateMessageDelegate^>();
    }

public:
    static property TopicManager^ Instance
    {
        TopicManager^ get() { return _instance; }
    }

    event OnMessageDelegate^ OnMessage;

    void Register(String^ topicName, CreateMessageDelegate^ factory)
    {
        if (!_registry->ContainsKey(topicName))
            _registry->Add(topicName, factory);
    }

    // 내부에서 생성 + deserialize 후 OnMessage로 바로 던짐
    void Dispatch(String^ topicName, IntPtr data, int size)
    {
        CreateMessageDelegate^ factory;
        if (!_registry->TryGetValue(topicName, factory))
            throw gcnew Exception("Unknown topic: " + topicName);

        ITopicMessage^ msg = factory();
        msg->Deserialize(data, size);
        OnMessage(topicName, msg);
    }
};
Messages.h (코드젠 대상)
#pragma once
#include "TopicSystem.h"
using namespace System;

public ref class SensorDataMessage : public ITopicMessage
{
public:
    float Temperature;
    float Humidity;

    virtual property String^ TopicName
    {
        String^ get() { return "sensor/data"; }
    }

    static ITopicMessage^ Create()
    {
        return gcnew SensorDataMessage();
    }

    static SensorDataMessage()
    {
        TopicManager::Instance->Register("sensor/data",
            gcnew CreateMessageDelegate(&SensorDataMessage::Create));
    }

    #pragma pack(push, 1)
    struct Native {
        float temperature;
        float humidity;
    };
    #pragma pack(pop)

    virtual void Deserialize(IntPtr data, int size) override
    {
        Native* native = reinterpret_cast<Native*>(data.ToPointer());
        Temperature = native->temperature;
        Humidity    = native->humidity;
    }

    virtual IntPtr Serialize(int% size) override
    {
        Native* native = new Native();
        native->temperature = Temperature;
        native->humidity    = Humidity;
        size = sizeof(Native);
        return IntPtr(native);
    }
};
TopicRegistry.h (코드젠 대상)
#pragma once
#include "Messages.h"

public ref class TopicRegistry abstract sealed
{
public:
    static void Initialize()
    {
        SensorDataMessage::Create();
        // [Generated] 새 토픽 추가 시 한 줄 추가
    }
};
C# - 사용자는 그냥 받아서 쓰면 끝
// 앱 시작 시 한 번
TopicRegistry.Initialize();

// 토픽명 + 객체 바로 수신
TopicManager.Instance.OnMessage += (topicName, msg) =>
{
    switch (msg)
    {
        case SensorDataMessage sensor:
            Console.WriteLine($"온도: {sensor.Temperature}, 습도: {sensor.Humidity}");
            break;

        case CameraFrameMessage cam:
            Console.WriteLine($"프레임: {cam.Width}x{cam.Height}");
            break;
    }
};
흐름
C++ void* + topicName
        ↓
Dispatch(topicName, IntPtr, size)
  factory()                     ← gcnew 직접 호출
  msg->Deserialize(IntPtr)      ← 복사 없이 포인터 캐스팅
  OnMessage(topicName, msg)     ← C# 콜백
        ↓
C# case SensorDataMessage sensor
  sensor.Temperature 바로 사용  ← 캐스팅/복사 없음
