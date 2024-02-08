

/*
WARNING: THIS FILE IS AUTO-GENERATED. DO NOT MODIFY.

This file was generated from UnionType.idl using "rtiddsgen".
The rtiddsgen tool is part of the RTI Connext distribution.
For more information, type 'rtiddsgen -help' at a command shell
or consult the RTI Connext manual.
*/

#include <iosfwd>
#include <iomanip>

#include "rti/topic/cdr/Serialization.hpp"

#include "UnionType.hpp"
#include "UnionTypePlugin.hpp"

#include <rti/util/ostream_operators.hpp>

// ---- UnionType: 

#ifdef RTI_CXX11_RVALUE_REFERENCES
#ifdef RTI_CXX11_NO_IMPLICIT_MOVE_OPERATIONS
UnionType::UnionType(UnionType&& other_) OMG_NOEXCEPT 
{
    _d(std::move(other_._d()));
    switch(rti::topic::cdr::integer_case(_d())){
        case 11:
        {  
            long_data( std::move(other_.long_data()));
        } break;
        case 22:
        {  
            float_data( std::move(other_.float_data()));
        } break;
        case 33:
        {  
            string_data( std::move(other_.string_data()));
        } break;

        default: 
        {
            /* 
            * Prevents compiler warnings when discriminator is an enum
            * and unionType does not specify all enumeration members.
            */ 
        }
    }

}

UnionType& UnionType::operator=(UnionType&&  other_) OMG_NOEXCEPT {
    UnionType tmp(std::move(other_));
    swap(tmp); 
    return *this;
}
#endif
#endif 

UnionType::Union_::Union_() :
    m_long_data_ (0) ,
    m_float_data_ (0.0f)  {
}

UnionType::Union_::Union_(
    int32_t long_data,
    float float_data,
    const std::string& string_data)
    :
        m_long_data_( long_data ),
        m_float_data_( float_data ),
        m_string_data_( string_data ) {
}

UnionType::UnionType() :m_d_(default_discriminator())
{
}

void UnionType::swap(UnionType& other_)  OMG_NOEXCEPT 
{
    using std::swap;
    swap (m_d_,other_.m_d_);
    switch(rti::topic::cdr::integer_case(_d())){
        case 11:
        {  
            swap(m_u_.m_long_data_, other_.m_u_.m_long_data_);
        } break;
        case 22:
        {  
            swap(m_u_.m_float_data_, other_.m_u_.m_float_data_);
        } break;
        case 33:
        {  
            swap(m_u_.m_string_data_, other_.m_u_.m_string_data_);
        } break;

        default: 
        {
            /* 
            * Prevents compiler warnings when discriminator is an enum
            * and unionType does not specify all enumeration members.
            */ 
        }
    }
    if (_d() != other_._d()){
        switch(rti::topic::cdr::integer_case(other_._d())){
            case 11:
            {  
                swap(m_u_.m_long_data_, other_.m_u_.m_long_data_);
            } break;
            case 22:
            {  
                swap(m_u_.m_float_data_, other_.m_u_.m_float_data_);
            } break;
            case 33:
            {  
                swap(m_u_.m_string_data_, other_.m_u_.m_string_data_);
            } break;

            default: 
            {
                /* 
                * Prevents compiler warnings when discriminator is an enum
                * and unionType does not specify all enumeration members.
                */ 
            }
        }
    }
}  

bool UnionType::operator == (const UnionType& other_) const {
    if (_d() != other_._d()){
        return false;
    }
    switch(rti::topic::cdr::integer_case(_d())){
        case 11:
        {  
            if ( m_u_.m_long_data_ != other_.m_u_.m_long_data_) {
                return false;
            }
        } break ;
        case 22:
        {  
            if ( m_u_.m_float_data_ != other_.m_u_.m_float_data_) {
                return false;
            }
        } break ;
        case 33:
        {  
            if ( m_u_.m_string_data_ != other_.m_u_.m_string_data_) {
                return false;
            }
        } break ;
        default: 
        {
            /* 
            * Prevents compiler warnings when discriminator is an enum
            * and unionType does not specify all enumeration members.
            */ 
        }
    }
    return true;
}
bool UnionType::operator != (const UnionType& other_) const {
    return !this->operator ==(other_);
}

// --- Getters and Setters: -------------------------------------------------
int32_t& UnionType::_d()  {
    return m_d_;
}

const int32_t& UnionType::_d() const  {
    return m_d_;
}

void UnionType::_d(int32_t value) {
    m_d_ = value;
}

int32_t& UnionType::long_data()  {
    if ( _d() != 11) {
        throw dds::core::PreconditionNotMetError(
            "UnionType::long_data not selected by the discriminator" );
    }
    return m_u_.m_long_data_;
}

const int32_t& UnionType::long_data() const  {
    if ( _d() != 11) {
        throw dds::core::PreconditionNotMetError(
            "UnionType::long_data not selected by the discriminator" );
    }
    return m_u_.m_long_data_;
}

void UnionType::long_data(int32_t value) {
    m_u_.m_long_data_ = value;
    m_d_= 11;
}

float& UnionType::float_data()  {
    if ( _d() != 22) {
        throw dds::core::PreconditionNotMetError(
            "UnionType::float_data not selected by the discriminator" );
    }
    return m_u_.m_float_data_;
}

const float& UnionType::float_data() const  {
    if ( _d() != 22) {
        throw dds::core::PreconditionNotMetError(
            "UnionType::float_data not selected by the discriminator" );
    }
    return m_u_.m_float_data_;
}

void UnionType::float_data(float value) {
    m_u_.m_float_data_ = value;
    m_d_= 22;
}

std::string& UnionType::string_data()  {
    if ( _d() != 33) {
        throw dds::core::PreconditionNotMetError(
            "UnionType::string_data not selected by the discriminator" );
    }
    return m_u_.m_string_data_;
}

const std::string& UnionType::string_data() const  {
    if ( _d() != 33) {
        throw dds::core::PreconditionNotMetError(
            "UnionType::string_data not selected by the discriminator" );
    }
    return m_u_.m_string_data_;
}

void UnionType::string_data(const std::string& value) {
    m_u_.m_string_data_ = value;
    m_d_= 33;
}

std::ostream& operator << (std::ostream& o,const UnionType& sample)
{
    rti::util::StreamFlagSaver flag_saver (o);
    o <<"[";
    o << "_d: " << sample._d() <<", ";
    switch(rti::topic::cdr::integer_case(sample._d())){
        case 11:
        {  
            o << "long_data: " << sample.long_data()<<", ";
        } break ;
        case 22:
        {  
            o << "float_data: " << std::setprecision(9) <<sample.float_data()<<", ";
        } break ;
        case 33:
        {  
            o << "string_data: " << sample.string_data() ;        } break ;

        default: 
        {
            /* 
            * Prevents compiler warnings when discriminator is an enum
            * and unionType does not specify all enumeration members.
            */ 
        }
    }
    o <<"]";
    return o;
}

int32_t UnionType::default_discriminator() {
    return 11;
}  

// --- Type traits: -------------------------------------------------

namespace rti { 
    namespace topic {

        template<>
        struct native_type_code<UnionType> {
            static DDS_TypeCode * get()
            {
                static RTIBool is_initialized = RTI_FALSE;

                static DDS_TypeCode UnionType_g_tc_string_data_string = DDS_INITIALIZE_STRING_TYPECODE((255));
                static DDS_TypeCode_Member UnionType_g_tc_members[3]=
                {

                    {
                        (char *)"long_data",/* Member name */
                        {
                            1,/* Representation ID */          
                            DDS_BOOLEAN_FALSE,/* Is a pointer? */
                            -1, /* Bitfield bits */
                            NULL/* Member type code is assigned later */
                        },
                        0, /* Ignored */
                        1, /* Number of labels */
                        11, /* First label cpp11stl 11 */
                        NULL, /* Labels (it is NULL when there is only one label)*/
                        RTI_CDR_NONKEY_MEMBER, /* Is a key? */
                        DDS_PUBLIC_MEMBER,/* Member visibility */
                        1,
                        NULL/* Ignored */
                    }, 
                    {
                        (char *)"float_data",/* Member name */
                        {
                            2,/* Representation ID */          
                            DDS_BOOLEAN_FALSE,/* Is a pointer? */
                            -1, /* Bitfield bits */
                            NULL/* Member type code is assigned later */
                        },
                        0, /* Ignored */
                        1, /* Number of labels */
                        22, /* First label cpp11stl 22 */
                        NULL, /* Labels (it is NULL when there is only one label)*/
                        RTI_CDR_NONKEY_MEMBER, /* Is a key? */
                        DDS_PUBLIC_MEMBER,/* Member visibility */
                        1,
                        NULL/* Ignored */
                    }, 
                    {
                        (char *)"string_data",/* Member name */
                        {
                            3,/* Representation ID */          
                            DDS_BOOLEAN_FALSE,/* Is a pointer? */
                            -1, /* Bitfield bits */
                            NULL/* Member type code is assigned later */
                        },
                        0, /* Ignored */
                        1, /* Number of labels */
                        33, /* First label cpp11stl 33 */
                        NULL, /* Labels (it is NULL when there is only one label)*/
                        RTI_CDR_NONKEY_MEMBER, /* Is a key? */
                        DDS_PUBLIC_MEMBER,/* Member visibility */
                        1,
                        NULL/* Ignored */
                    }
                };

                static DDS_TypeCode UnionType_g_tc =
                {{
                        DDS_TK_UNION,/* Kind */
                        DDS_BOOLEAN_FALSE, /* Ignored */
                        -1, /*Ignored*/
                        (char *)"UnionType", /* Name */
                        NULL,     /* Base class type code is assigned later */      
                        0, /* Ignored */
                        0, /* Ignored */
                        NULL, /* Ignored */
                        3, /* Number of members */
                        UnionType_g_tc_members, /* Members */
                        DDS_VM_NONE   /* Type Modifier */        
                    }}; /* Type code for UnionType*/

                if (is_initialized) {
                    return &UnionType_g_tc;
                }

                UnionType_g_tc_members[0]._representation._typeCode = (RTICdrTypeCode *)&DDS_g_tc_long;

                UnionType_g_tc_members[1]._representation._typeCode = (RTICdrTypeCode *)&DDS_g_tc_float;

                UnionType_g_tc_members[2]._representation._typeCode = (RTICdrTypeCode *)&UnionType_g_tc_string_data_string;

                /* Discriminator type code */
                UnionType_g_tc._data._typeCode = (RTICdrTypeCode *)&DDS_g_tc_long;

                is_initialized = RTI_TRUE;

                return &UnionType_g_tc;
            }
        }; // native_type_code

        const dds::core::xtypes::UnionType& dynamic_type<UnionType>::get()
        {
            return static_cast<const dds::core::xtypes::UnionType&>(
                rti::core::native_conversions::cast_from_native<dds::core::xtypes::DynamicType>(
                    *(native_type_code<UnionType>::get())));
        }

    }
}  

namespace dds { 
    namespace topic {
        void topic_type_support<UnionType>:: register_type(
            dds::domain::DomainParticipant& participant,
            const std::string& type_name) 
        {

            rti::domain::register_type_plugin(
                participant,
                type_name,
                UnionTypePlugin_new,
                UnionTypePlugin_delete);
        }

        std::vector<char>& topic_type_support<UnionType>::to_cdr_buffer(
            std::vector<char>& buffer, const UnionType& sample)
        {
            // First get the length of the buffer
            unsigned int length = 0;
            RTIBool ok = UnionTypePlugin_serialize_to_cdr_buffer(
                NULL, 
                &length,
                &sample);
            rti::core::check_return_code(
                ok ? DDS_RETCODE_OK : DDS_RETCODE_ERROR,
                "Failed to calculate cdr buffer size");

            // Create a vector with that size and copy the cdr buffer into it
            buffer.resize(length);
            ok = UnionTypePlugin_serialize_to_cdr_buffer(
                &buffer[0], 
                &length, 
                &sample);
            rti::core::check_return_code(
                ok ? DDS_RETCODE_OK : DDS_RETCODE_ERROR,
                "Failed to copy cdr buffer");

            return buffer;
        }

        void topic_type_support<UnionType>::from_cdr_buffer(UnionType& sample, 
        const std::vector<char>& buffer)
        {

            RTIBool ok  = UnionTypePlugin_deserialize_from_cdr_buffer(
                &sample, 
                &buffer[0], 
                static_cast<unsigned int>(buffer.size()));
            rti::core::check_return_code(ok ? DDS_RETCODE_OK : DDS_RETCODE_ERROR,
            "Failed to create UnionType from cdr buffer");
        }

        void topic_type_support<UnionType>::reset_sample(UnionType& sample) 
        {
            sample._d() = 11;
            rti::topic::reset_sample(sample.long_data());
            sample._d() = 22;
            rti::topic::reset_sample(sample.float_data());
            sample._d() = 33;
            rti::topic::reset_sample(sample.string_data());

            sample._d() = UnionType::default_discriminator();
        }

        void topic_type_support<UnionType>::allocate_sample(UnionType& sample, int, int) 
        {
            sample._d() = 33;
            rti::topic::allocate_sample(sample.string_data(),  -1, 255);

            sample._d() = UnionType::default_discriminator();
        }

    }
}  

