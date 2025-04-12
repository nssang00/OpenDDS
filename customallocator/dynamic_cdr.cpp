/****************************************************
 * SampleDynamicCDR.cpp
 * 
 * 개념 시연용 예시 코드
 ****************************************************/
#include <iostream>
#include <string>
#include <unordered_map>
#include <vector>
#include <memory>
#include <cassert>

/****************************************************
 * 1) 메타정보: TypeIdentifier, TypeObject
 ****************************************************/
// 실제 DDS에서는 해시, 이름, 버전 등을 포함한 구조.
struct TypeIdentifier {
    // 예시로 간단히 string으로 구분
    std::string type_name;

    // 동등성 판단 오퍼레이터
    bool operator==(const TypeIdentifier& other) const {
        return type_name == other.type_name;
    }
};

// 해시 함수를 위한 struct
struct TypeIdentifierHash {
    size_t operator()(const TypeIdentifier& id) const {
        // 간단히 std::hash<string>만 사용
        return std::hash<std::string>()(id.type_name);
    }
};

// 실제 DDS에선 훨씬 더 많은 정보(멤버 리스트, discriminator 등)를 가짐
struct TypeObject {
    std::string name;
    // ... struct/union/enum 등 다양한 타입 정의
    // 필드 목록을 단순화해서 담아봄
    // 실제론 nested 구조, 디스크리미네이터 등이 들어감
    // 여기서는 멤버 하나하나에 대한 정의만 담는다고 가정
    // ex) vector<MemberDescriptor> members;
};

// 멤버 종류 (간단화: 실제론 훨씬 많음)
enum class DataKind {
    INT32,
    FLOAT32,
    STRING,
    // 구조체(복합) 타입
    COMPLEX
};

// 필드(멤버) 메타정보
struct MemberDescriptor {
    std::string name;
    DataKind kind;
    // 만약 복합 타입이면 참조할 sub-type 식별자
    TypeIdentifier nestedTypeId; 
};

/****************************************************
 * 2) DynamicType
 *    - TypeObject를 파싱한 결과, 멤버 정보를 저장
 ****************************************************/
class DynamicType {
public:
    DynamicType(const TypeObject& obj)
        : name_(obj.name) {
        // 실제로는 obj의 멤버리스트를 파싱해 저장
        // 여기서는 멤버가 여러 개 있다고 가정
    }

    void addMember(const MemberDescriptor& md) {
        members_.push_back(md);
    }

    const std::vector<MemberDescriptor>& getMembers() const {
        return members_;
    }

    const std::string& getName() const { 
        return name_;
    }

private:
    std::string name_;
    std::vector<MemberDescriptor> members_;
};

using DynamicTypePtr = std::shared_ptr<DynamicType>;

/****************************************************
 * 3) DynamicData
 *    - 실제 필드(값)들을 저장하는 런타임 객체
 ****************************************************/
class DynamicData {
public:
    // 필드명 -> 어떤 값인지 저장
    // 실제론 Variant나 Union 형태로 저장해야 한다
    // 여기서는 간단히 예시
    std::unordered_map<std::string, int32_t> int32_values;
    std::unordered_map<std::string, float>   float_values;
    std::unordered_map<std::string, std::string> string_values;
    // 복합타입 멤버는 DynamicData로 재귀 구조
    std::unordered_map<std::string, std::shared_ptr<DynamicData>> complex_values;

    // 편의 함수
    void setInt32(const std::string& field, int32_t v) {
        int32_values[field] = v;
    }
    void setFloat32(const std::string& field, float v) {
        float_values[field] = v;
    }
    void setString(const std::string& field, const std::string& v) {
        string_values[field] = v;
    }
    void setComplex(const std::string& field, std::shared_ptr<DynamicData> v) {
        complex_values[field] = v;
    }

    int32_t getInt32(const std::string& field) const {
        auto it = int32_values.find(field);
        if(it != int32_values.end()) return it->second;
        return 0;
    }
    float getFloat32(const std::string& field) const {
        auto it = float_values.find(field);
        if(it != float_values.end()) return it->second;
        return 0.0f;
    }
    std::string getString(const std::string& field) const {
        auto it = string_values.find(field);
        if(it != string_values.end()) return it->second;
        return "";
    }
    std::shared_ptr<DynamicData> getComplex(const std::string& field) const {
        auto it = complex_values.find(field);
        if(it != complex_values.end()) return it->second;
        return nullptr;
    }
};

/****************************************************
 * 4) Type Cache
 *    - (TypeIdentifier -> DynamicTypePtr) 매핑
 ****************************************************/
class TypeCache {
public:
    // 캐시에 있으면 그대로 반환, 없으면 새로 파싱
    DynamicTypePtr getOrCreateType(const TypeIdentifier& id) {
        auto it = cache_.find(id);
        if(it != cache_.end()) {
            return it->second;
        } else {
            // 실제론 IDL/TypeObject를 더 복잡하게 로딩/파싱해야 함
            // 여기서는 간단히 스텁으로 처리
            DynamicTypePtr dt = parseTypeFromRegistry(id);
            cache_[id] = dt;
            return dt;
        }
    }

private:
    // 스텁: 실제론 외부에서 TypeObject를 가져와 DynamicType를 만드는 과정 필요
    DynamicTypePtr parseTypeFromRegistry(const TypeIdentifier& id) {
        // 예시: 가상의 레지스트리 (이름에 맞춰 멤버를 생성)
        if(id.type_name == "MyType") {
            TypeObject tob;
            tob.name = "MyType";
            // 예시로 멤버 3개를 넣었다고 가정
            MemberDescriptor m1{"field_int", DataKind::INT32, {}};
            MemberDescriptor m2{"field_str", DataKind::STRING, {}};
            MemberDescriptor m3{"field_sub", DataKind::COMPLEX, {"SubType"}};
            // ...

            // DynamicType 만들기
            auto d = std::make_shared<DynamicType>(tob);
            d->addMember(m1);
            d->addMember(m2);
            d->addMember(m3);
            return d;
        } 
        else if(id.type_name == "SubType") {
            TypeObject tob;
            tob.name = "SubType";
            MemberDescriptor sub1{"sub_int", DataKind::INT32, {}};
            MemberDescriptor sub2{"sub_float", DataKind::FLOAT32, {}};
            auto d = std::make_shared<DynamicType>(tob);
            d->addMember(sub1);
            d->addMember(sub2);
            return d;
        }
        // 기타...
        // 실제론 등록 안 된 타입일 수도 있으니 예외처리 필요
        return nullptr;
    }

    std::unordered_map<TypeIdentifier, DynamicTypePtr, TypeIdentifierHash> cache_;
};

/****************************************************
 * 5) CDR Serializer/Deserializer
 *    - 실제로는 CDR 라이브러리 함수 호출 필요
 ****************************************************/
class CDRBuffer {
public:
    // 단순히 바이트 배열에 push/pop하는 예시
    std::vector<uint8_t> buffer;
    size_t readPos = 0;

    void writeInt32(int32_t v) {
        // CDR 빅엔디안/리틀엔디안 처리 필요. 여기선 단순 예시
        for(int i=0; i<4; ++i) {
            buffer.push_back((uint8_t)((v >> (8*i)) & 0xFF));
        }
    }

    int32_t readInt32() {
        // 단순 예시
        int32_t v = 0;
        for(int i=0; i<4; ++i) {
            v |= (buffer[readPos++] << (8*i));
        }
        return v;
    }

    void writeFloat32(float f) {
        // float -> uint32_t 비트 변환
        uint32_t bits;
        static_assert(sizeof(float)==4, "float must be 4 bytes");
        std::memcpy(&bits, &f, sizeof(float));
        writeInt32((int32_t)bits);
    }

    float readFloat32() {
        uint32_t bits = (uint32_t)readInt32();
        float f;
        std::memcpy(&f, &bits, sizeof(float));
        return f;
    }

    void writeString(const std::string& s) {
        // 길이 + 데이터
        writeInt32((int32_t)s.size());
        for(char c : s) {
            buffer.push_back((uint8_t)c);
        }
    }

    std::string readString() {
        int32_t size = readInt32();
        std::string s;
        s.reserve(size);
        for(int i=0; i<size; ++i) {
            s.push_back((char)buffer[readPos++]);
        }
        return s;
    }
};

// 동적(재귀) 직렬화
void serializeDynamicData(const DynamicData& data, const DynamicTypePtr& type, CDRBuffer& buf, TypeCache& cache);

// 동적(재귀) 역직렬화
void deserializeDynamicData(DynamicData& data, const DynamicTypePtr& type, CDRBuffer& buf, TypeCache& cache);

void serializeDynamicData(const DynamicData& data, const DynamicTypePtr& type, CDRBuffer& buf, TypeCache& cache) {
    // type의 멤버 순회
    for(const auto& member : type->getMembers()) {
        switch(member.kind) {
        case DataKind::INT32: {
            int32_t v = data.getInt32(member.name);
            buf.writeInt32(v);
            break;
        }
        case DataKind::FLOAT32: {
            float v = data.getFloat32(member.name);
            buf.writeFloat32(v);
            break;
        }
        case DataKind::STRING: {
            std::string v = data.getString(member.name);
            buf.writeString(v);
            break;
        }
        case DataKind::COMPLEX: {
            // nested
            auto subData = data.getComplex(member.name);
            // subType 구해서 재귀
            auto subType = cache.getOrCreateType(member.nestedTypeId);
            serializeDynamicData(*subData, subType, buf, cache);
            break;
        }
        }
    }
}

void deserializeDynamicData(DynamicData& data, const DynamicTypePtr& type, CDRBuffer& buf, TypeCache& cache) {
    for(const auto& member : type->getMembers()) {
        switch(member.kind) {
        case DataKind::INT32: {
            int32_t v = buf.readInt32();
            data.setInt32(member.name, v);
            break;
        }
        case DataKind::FLOAT32: {
            float f = buf.readFloat32();
            data.setFloat32(member.name, f);
            break;
        }
        case DataKind::STRING: {
            std::string s = buf.readString();
            data.setString(member.name, s);
            break;
        }
        case DataKind::COMPLEX: {
            auto subType = cache.getOrCreateType(member.nestedTypeId);
            auto subData = std::make_shared<DynamicData>();
            deserializeDynamicData(*subData, subType, buf, cache);
            data.setComplex(member.name, subData);
            break;
        }
        }
    }
}

/****************************************************
 * 6) 사용 예시 (main)
 ****************************************************/
int main() {
    TypeCache cache;

    // 1) 예시: MyType 식별자를 써서 DynamicType 획득
    TypeIdentifier myTypeId{"MyType"};
    auto myType = cache.getOrCreateType(myTypeId);

    // 2) MyType 구조에 맞춰 DynamicData 생성
    auto data = std::make_shared<DynamicData>();
    data->setInt32("field_int", 123);
    data->setString("field_str", "Hello CDR!");

    // 하위 필드 field_sub(SubType)
    auto subData = std::make_shared<DynamicData>();
    subData->setInt32("sub_int", 999);
    subData->setFloat32("sub_float", 3.14f);
    data->setComplex("field_sub", subData);

    // 3) CDRBuffer에 직렬화
    CDRBuffer buf;
    serializeDynamicData(*data, myType, buf, cache);

    // 4) 역직렬화 테스트
    DynamicData decoded;
    deserializeDynamicData(decoded, myType, buf, cache);

    // 5) 결과 확인
    std::cout << "decoded.field_int = " << decoded.getInt32("field_int") << std::endl;
    std::cout << "decoded.field_str = " << decoded.getString("field_str") << std::endl;
    auto dsub = decoded.getComplex("field_sub");
    if(dsub) {
        std::cout << "decoded.field_sub.sub_int   = " << dsub->getInt32("sub_int") << std::endl;
        std::cout << "decoded.field_sub.sub_float = " << dsub->getFloat32("sub_float") << std::endl;
    }

    return 0;
}
