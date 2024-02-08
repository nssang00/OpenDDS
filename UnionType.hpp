

/*
WARNING: THIS FILE IS AUTO-GENERATED. DO NOT MODIFY.

This file was generated from UnionType.idl using "rtiddsgen".
The rtiddsgen tool is part of the RTI Connext distribution.
For more information, type 'rtiddsgen -help' at a command shell
or consult the RTI Connext manual.
*/

#ifndef UnionType_240946868_hpp
#define UnionType_240946868_hpp

#include <iosfwd>

#if (defined(RTI_WIN32) || defined (RTI_WINCE)) && defined(NDDS_USER_DLL_EXPORT)
/* If the code is building on Windows, start exporting symbols.
*/
#undef RTIUSERDllExport
#define RTIUSERDllExport __declspec(dllexport)
#endif

#include "dds/domain/DomainParticipant.hpp"
#include "dds/topic/TopicTraits.hpp"
#include "dds/core/SafeEnumeration.hpp"
#include "dds/core/String.hpp"
#include "dds/core/array.hpp"
#include "dds/core/vector.hpp"
#include "dds/core/Optional.hpp"
#include "dds/core/xtypes/DynamicType.hpp"
#include "dds/core/xtypes/StructType.hpp"
#include "dds/core/xtypes/UnionType.hpp"
#include "dds/core/xtypes/EnumType.hpp"
#include "dds/core/xtypes/AliasType.hpp"
#include "rti/core/array.hpp"
#include "rti/core/BoundedSequence.hpp"
#include "rti/util/StreamFlagSaver.hpp"
#include "rti/domain/PluginSupport.hpp"
#include "rti/core/LongDouble.hpp"
#include "dds/core/External.hpp"
#include "rti/core/Pointer.hpp"
#include "rti/topic/TopicTraits.hpp"
#if (defined(RTI_WIN32) || defined (RTI_WINCE)) && defined(NDDS_USER_DLL_EXPORT)
/* If the code is building on Windows, stop exporting symbols.
*/
#undef RTIUSERDllExport
#define RTIUSERDllExport
#endif

#if (defined(RTI_WIN32) || defined (RTI_WINCE)) && defined(NDDS_USER_DLL_EXPORT)
/* If the code is building on Windows, start exporting symbols.
*/
#undef NDDSUSERDllExport
#define NDDSUSERDllExport __declspec(dllexport)
#endif

class NDDSUSERDllExport UnionType {

  public:
    UnionType();

    #ifdef RTI_CXX11_RVALUE_REFERENCES
    #ifndef RTI_CXX11_NO_IMPLICIT_MOVE_OPERATIONS
    UnionType (UnionType&&) = default;
    UnionType& operator=(UnionType&&) = default;
    UnionType& operator=(const UnionType&) = default;
    UnionType(const UnionType&) = default;
    #else
    UnionType(UnionType&& other_) OMG_NOEXCEPT;  
    UnionType& operator=(UnionType&&  other_) OMG_NOEXCEPT;
    #endif
    #endif 

    int32_t& _d() ; 
    const int32_t& _d() const ;
    void _d(int32_t value);

    int32_t& long_data() ; 
    const int32_t& long_data() const ;
    void long_data(int32_t value);

    float& float_data() ; 
    const float& float_data() const ;
    void float_data(float value);

    std::string& string_data() ; 
    const std::string& string_data() const ;
    void string_data(const std::string& value);

    bool operator == (const UnionType& other_) const;
    bool operator != (const UnionType& other_) const;

    static int32_t default_discriminator();  

    void swap(UnionType& other_) OMG_NOEXCEPT ;

  private:

    int32_t m_d_;
    struct NDDSUSERDllExport Union_ {
        int32_t m_long_data_;
        float m_float_data_;
        std::string m_string_data_;
        Union_();
        Union_(
            int32_t long_data,
            float float_data,
            const std::string& string_data);
    };
    Union_ m_u_;

};

inline void swap(UnionType& a, UnionType& b)  OMG_NOEXCEPT 
{
    a.swap(b);
}

NDDSUSERDllExport std::ostream& operator<<(std::ostream& o, const UnionType& sample);

namespace dds { 
    namespace topic {

        template<>
        struct topic_type_name<UnionType> {
            NDDSUSERDllExport static std::string value() {
                return "UnionType";
            }
        };

        template<>
        struct is_topic_type<UnionType> : public dds::core::true_type {};

        template<>
        struct topic_type_support<UnionType> {
            NDDSUSERDllExport 
            static void register_type(
                dds::domain::DomainParticipant& participant,
                const std::string & type_name);

            NDDSUSERDllExport 
            static std::vector<char>& to_cdr_buffer(
                std::vector<char>& buffer, const UnionType& sample);

            NDDSUSERDllExport 
            static void from_cdr_buffer(UnionType& sample, const std::vector<char>& buffer);

            NDDSUSERDllExport 
            static void reset_sample(UnionType& sample);

            NDDSUSERDllExport 
            static void allocate_sample(UnionType& sample, int, int);

            static const rti::topic::TypePluginKind::type type_plugin_kind = 
            rti::topic::TypePluginKind::STL;
        };

    }
}

namespace rti { 
    namespace topic {
        template<>
        struct dynamic_type<UnionType> {
            typedef dds::core::xtypes::UnionType type;
            NDDSUSERDllExport static const dds::core::xtypes::UnionType& get();
        };

        template <>
        struct extensibility<UnionType> {
            static const dds::core::xtypes::ExtensibilityKind::type kind =
            dds::core::xtypes::ExtensibilityKind::EXTENSIBLE;                
        };

    }
}

#if (defined(RTI_WIN32) || defined (RTI_WINCE)) && defined(NDDS_USER_DLL_EXPORT)
/* If the code is building on Windows, stop exporting symbols.
*/
#undef NDDSUSERDllExport
#define NDDSUSERDllExport
#endif

#endif // UnionType_240946868_hpp

