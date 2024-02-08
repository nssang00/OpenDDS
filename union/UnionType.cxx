

/*
WARNING: THIS FILE IS AUTO-GENERATED. DO NOT MODIFY.

This file was generated from UnionType.idl 
using RTI Code Generator (rtiddsgen) version 4.2.0.
The rtiddsgen tool is part of the RTI Connext DDS distribution.
For more information, type 'rtiddsgen -help' at a command shell
or consult the Code Generator User's Manual.
*/

#ifndef NDDS_STANDALONE_TYPE
#ifndef ndds_cpp_h
#include "ndds/ndds_cpp.h"
#endif
#ifndef dds_c_log_impl_h              
#include "dds_c/dds_c_log_impl.h"                                
#endif 

#ifndef dds_c_log_infrastructure_h
#include "dds_c/dds_c_infrastructure_impl.h"       
#endif 

#ifndef cdr_type_h
#include "cdr/cdr_type.h"
#endif    

#ifndef osapi_heap_h
#include "osapi/osapi_heap.h" 
#endif
#else
#include "ndds_standalone_type.h"
#endif

#include "UnionType.h"

#ifndef NDDS_STANDALONE_TYPE
#include "UnionTypePlugin.h"
#endif

#include <new>

/* ========================================================================= */
const char *UnionTypeTYPENAME = "UnionType";

#ifndef NDDS_STANDALONE_TYPE
DDS_TypeCode * UnionType_get_typecode(void)
{
    static RTIBool is_initialized = RTI_FALSE;

    static DDS_TypeCode UnionType_g_tc_string_data_string = DDS_INITIALIZE_STRING_TYPECODE((255L));

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
            (11),
            NULL, /* Labels (it is NULL when there is only one label)*/
            RTI_CDR_NONKEY_MEMBER, /* Is a key? */
            DDS_PUBLIC_MEMBER,/* Member visibility */
            1,
            NULL, /* Ignored */
            RTICdrTypeCodeAnnotations_INITIALIZER
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
            (22),
            NULL, /* Labels (it is NULL when there is only one label)*/
            RTI_CDR_NONKEY_MEMBER, /* Is a key? */
            DDS_PUBLIC_MEMBER,/* Member visibility */
            1,
            NULL, /* Ignored */
            RTICdrTypeCodeAnnotations_INITIALIZER
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
            (33),
            NULL, /* Labels (it is NULL when there is only one label)*/
            RTI_CDR_NONKEY_MEMBER, /* Is a key? */
            DDS_PUBLIC_MEMBER,/* Member visibility */
            1,
            NULL, /* Ignored */
            RTICdrTypeCodeAnnotations_INITIALIZER
        }
    };

    static DDS_TypeCode UnionType_g_tc =
    {{
            DDS_TK_UNION, /* Kind */
            DDS_BOOLEAN_FALSE, /* Ignored */
            -1, /*Ignored*/
            (char *)"UnionType", /* Name */
            NULL,     /* Base class type code is assigned later */      
            0, /* Ignored */
            0, /* Ignored */
            NULL, /* Ignored */
            3, /* Number of members */
            UnionType_g_tc_members, /* Members */
            DDS_VM_NONE, /* Type Modifier */
            RTICdrTypeCodeAnnotations_INITIALIZER,
            DDS_BOOLEAN_TRUE, /* _isCopyable */
            NULL, /* _sampleAccessInfo: assigned later */
            NULL /* _typePlugin: assigned later */
        }}; /* Type code for UnionType*/

    if (is_initialized) {
        return &UnionType_g_tc;
    }

    is_initialized = RTI_TRUE;

    UnionType_g_tc._data._annotations._allowedDataRepresentationMask = 5;

    UnionType_g_tc_members[0]._representation._typeCode = (RTICdrTypeCode *)&DDS_g_tc_long_w_new;
    UnionType_g_tc_members[1]._representation._typeCode = (RTICdrTypeCode *)&DDS_g_tc_float_w_new;
    UnionType_g_tc_members[2]._representation._typeCode = (RTICdrTypeCode *)&UnionType_g_tc_string_data_string;

    /* Initialize the values for member annotations. */
    UnionType_g_tc_members[0]._annotations._defaultValue._d = RTI_XCDR_TK_LONG;
    UnionType_g_tc_members[0]._annotations._defaultValue._u.long_value = 0;
    UnionType_g_tc_members[0]._annotations._minValue._d = RTI_XCDR_TK_LONG;
    UnionType_g_tc_members[0]._annotations._minValue._u.long_value = RTIXCdrLong_MIN;
    UnionType_g_tc_members[0]._annotations._maxValue._d = RTI_XCDR_TK_LONG;
    UnionType_g_tc_members[0]._annotations._maxValue._u.long_value = RTIXCdrLong_MAX;
    UnionType_g_tc_members[1]._annotations._defaultValue._d = RTI_XCDR_TK_FLOAT;
    UnionType_g_tc_members[1]._annotations._defaultValue._u.float_value = 0.0f;
    UnionType_g_tc_members[1]._annotations._minValue._d = RTI_XCDR_TK_FLOAT;
    UnionType_g_tc_members[1]._annotations._minValue._u.float_value = RTIXCdrFloat_MIN;
    UnionType_g_tc_members[1]._annotations._maxValue._d = RTI_XCDR_TK_FLOAT;
    UnionType_g_tc_members[1]._annotations._maxValue._u.float_value = RTIXCdrFloat_MAX;
    UnionType_g_tc_members[2]._annotations._defaultValue._d = RTI_XCDR_TK_STRING;
    UnionType_g_tc_members[2]._annotations._defaultValue._u.string_value = (DDS_Char *) "";

    /* Discriminator type code */
    UnionType_g_tc._data._typeCode = (RTICdrTypeCode *)&DDS_g_tc_long_w_new;

    UnionType_g_tc._data._sampleAccessInfo =
    UnionType_get_sample_access_info();
    UnionType_g_tc._data._typePlugin =
    UnionType_get_type_plugin_info();    

    return &UnionType_g_tc;
}

#define TSeq UnionTypeSeq
#define T UnionType
#include "dds_cpp/generic/dds_cpp_data_TInterpreterSupport.gen"
#undef T
#undef TSeq

RTIXCdrSampleAccessInfo *UnionType_get_sample_seq_access_info()
{
    static RTIXCdrSampleAccessInfo UnionType_g_seqSampleAccessInfo = {
        RTI_XCDR_TYPE_BINDING_CPP, \
        {sizeof(UnionTypeSeq),0,0,0}, \
        RTI_XCDR_FALSE, \
        DDS_Sequence_get_member_value_pointer, \
        UnionTypeSeq_set_member_element_count, \
        NULL, \
        NULL, \
        NULL \
    };

    return &UnionType_g_seqSampleAccessInfo;
}

RTIXCdrSampleAccessInfo *UnionType_get_sample_access_info()
{
    static RTIBool is_initialized = RTI_FALSE;

    UnionType *sample;

    static RTIXCdrMemberAccessInfo UnionType_g_memberAccessInfos[4] =
    {RTIXCdrMemberAccessInfo_INITIALIZER};

    static RTIXCdrSampleAccessInfo UnionType_g_sampleAccessInfo = 
    RTIXCdrSampleAccessInfo_INITIALIZER;

    if (is_initialized) {
        return (RTIXCdrSampleAccessInfo*) &UnionType_g_sampleAccessInfo;
    }

    RTIXCdrHeap_allocateStruct(
        &sample, 
        UnionType);
    if (sample == NULL) {
        return NULL;
    }

    UnionType_g_memberAccessInfos[0].bindingMemberValueOffset[0] = 
    (RTIXCdrUnsignedLong) ((char *)&sample->_d - (char *)sample);

    UnionType_g_memberAccessInfos[1].bindingMemberValueOffset[0] = 
    (RTIXCdrUnsignedLong) ((char *)&sample->_u.long_data - (char *)sample);

    UnionType_g_memberAccessInfos[2].bindingMemberValueOffset[0] = 
    (RTIXCdrUnsignedLong) ((char *)&sample->_u.float_data - (char *)sample);

    UnionType_g_memberAccessInfos[3].bindingMemberValueOffset[0] = 
    (RTIXCdrUnsignedLong) ((char *)&sample->_u.string_data - (char *)sample);

    UnionType_g_sampleAccessInfo.memberAccessInfos = 
    UnionType_g_memberAccessInfos;

    {
        size_t candidateTypeSize = sizeof(UnionType);

        if (candidateTypeSize > RTIXCdrLong_MAX) {
            UnionType_g_sampleAccessInfo.typeSize[0] =
            RTIXCdrLong_MAX;
        } else {
            UnionType_g_sampleAccessInfo.typeSize[0] =
            (RTIXCdrUnsignedLong) candidateTypeSize;
        }
    }

    UnionType_g_sampleAccessInfo.useGetMemberValueOnlyWithRef =
    RTI_XCDR_TRUE;

    UnionType_g_sampleAccessInfo.getMemberValuePointerFcn = 
    UnionType_get_member_value_pointer;

    UnionType_g_sampleAccessInfo.languageBinding = 
    RTI_XCDR_TYPE_BINDING_CPP ;

    RTIXCdrHeap_freeStruct(sample);
    is_initialized = RTI_TRUE;
    return (RTIXCdrSampleAccessInfo*) &UnionType_g_sampleAccessInfo;
}
RTIXCdrTypePlugin *UnionType_get_type_plugin_info()
{
    static RTIXCdrTypePlugin UnionType_g_typePlugin = 
    {
        NULL, /* serialize */
        NULL, /* serialize_key */
        NULL, /* deserialize_sample */
        NULL, /* deserialize_key_sample */
        NULL, /* skip */
        NULL, /* get_serialized_sample_size */
        NULL, /* get_serialized_sample_max_size_ex */
        NULL, /* get_serialized_key_max_size_ex */
        NULL, /* get_serialized_sample_min_size */
        NULL, /* serialized_sample_to_key */
        (RTIXCdrTypePluginInitializeSampleFunction) 
        UnionType_initialize_ex,
        NULL,
        (RTIXCdrTypePluginFinalizeSampleFunction)
        UnionType_finalize_w_return,
        NULL,
        NULL
    };

    return &UnionType_g_typePlugin;
}
#endif

DDS_LongLong UnionType_getDefaultDiscriminator(void)
{
    return 11;
}

RTIBool UnionType_initialize(
    UnionType* sample)
{
    return UnionType_initialize_ex(
        sample, 
        RTI_TRUE, 
        RTI_TRUE);
}
RTIBool UnionType_initialize_w_params(
    UnionType *sample,
    const struct DDS_TypeAllocationParams_t *allocParams)
{

    if (sample == NULL) {
        return RTI_FALSE;
    }
    if (allocParams == NULL) {
        return RTI_FALSE;
    }

    sample->_d = (DDS_Long)UnionType_getDefaultDiscriminator();
    sample->_u.long_data = 0;

    sample->_u.float_data = 0.0f;

    if (allocParams->allocate_memory) {
        sample->_u.string_data = DDS_String_alloc((255L));
        if (sample->_u.string_data != NULL) {
            RTIOsapiUtility_unusedReturnValue(
                RTICdrType_copyStringEx(
                    &sample->_u.string_data,
                    "",
                    (255L),
                    RTI_FALSE),
                    RTIBool);
        }
        if (sample->_u.string_data == NULL) {
            return RTI_FALSE;
        }
    } else {
        if (sample->_u.string_data != NULL) {
            RTIOsapiUtility_unusedReturnValue(
                RTICdrType_copyStringEx(
                    &sample->_u.string_data,
                    "",
                    (255L),
                    RTI_FALSE),
                    RTIBool);
            if (sample->_u.string_data == NULL) {
                return RTI_FALSE;
            }
        }
    }

    return RTI_TRUE;
}
RTIBool UnionType_initialize_ex(
    UnionType *sample,
    RTIBool allocatePointers, 
    RTIBool allocateMemory)
{

    struct DDS_TypeAllocationParams_t allocParams =
    DDS_TYPE_ALLOCATION_PARAMS_DEFAULT;

    allocParams.allocate_pointers =  (DDS_Boolean)allocatePointers;
    allocParams.allocate_memory = (DDS_Boolean)allocateMemory;

    return UnionType_initialize_w_params(
        sample,
        &allocParams);
}

RTIBool UnionType_finalize_w_return(
    UnionType* sample)
{
    UnionType_finalize_ex(sample, RTI_TRUE);

    return RTI_TRUE;
}

void UnionType_finalize(
    UnionType* sample)
{  
    UnionType_finalize_ex(
        sample, 
        RTI_TRUE);
}

void UnionType_finalize_ex(
    UnionType *sample,
    RTIBool deletePointers)
{
    struct DDS_TypeDeallocationParams_t deallocParams =
    DDS_TYPE_DEALLOCATION_PARAMS_DEFAULT;

    if (sample==NULL) {
        return;
    } 

    deallocParams.delete_pointers = (DDS_Boolean)deletePointers;

    UnionType_finalize_w_params(
        sample,
        &deallocParams);
}

void UnionType_finalize_w_params(
    UnionType *sample,
    const struct DDS_TypeDeallocationParams_t *deallocParams)
{
    if (sample==NULL) {
        return;
    }

    if (deallocParams == NULL) {
        return;
    }

    if (sample->_u.string_data != NULL) {
        DDS_String_free(sample->_u.string_data);
        sample->_u.string_data=NULL;

    }
}

void UnionType_finalize_optional_members(
    UnionType* sample, RTIBool deletePointers)
{
    struct DDS_TypeDeallocationParams_t deallocParamsTmp =
    DDS_TYPE_DEALLOCATION_PARAMS_DEFAULT;
    struct DDS_TypeDeallocationParams_t * deallocParams =
    &deallocParamsTmp;

    if (sample==NULL) {
        return;
    } 
    if (deallocParams) {} /* To avoid warnings */

    deallocParamsTmp.delete_pointers = (DDS_Boolean)deletePointers;
    deallocParamsTmp.delete_optional_members = DDS_BOOLEAN_TRUE;

    switch(sample->_d) {
        case 11:
        {
        } break ;
        case 22:
        {
        } break ;
        case 33:
        {
        } break ;
        default: 
        {
            /* 
            * Prevents compiler warnings when discriminator is an enum
            * and unionType does not specify all enumeration members.
            */ 
        }
    }
}

RTIBool UnionType_copy(
    UnionType* dst,
    const UnionType* src)
{
    try {

        if (dst == NULL || src == NULL) {
            return RTI_FALSE;
        }

        if (!RTICdrType_copyLong (
            &dst->_d, 
            &src->_d)) { 
            return RTI_FALSE;
        }
        switch(src->_d) {

            case 11:
            {
                if (!RTICdrType_copyLong (
                    &dst->_u.long_data, 
                    &src->_u.long_data)) { 
                    return RTI_FALSE;
                }
            } break ;
            case 22:
            {
                if (!RTICdrType_copyFloat (
                    &dst->_u.float_data, 
                    &src->_u.float_data)) { 
                    return RTI_FALSE;
                }
            } break ;
            case 33:
            {
                if (!RTICdrType_copyStringEx (
                    &dst->_u.string_data
                    ,
                    src->_u.string_data, 
                    (255L) + 1,
                    RTI_FALSE)){
                    return RTI_FALSE;
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
        return RTI_TRUE;
    } catch (const std::bad_alloc&) {
        return RTI_FALSE;
    }
}

/**
* <<IMPLEMENTATION>>
*
* Defines:  TSeq, T
*
* Configure and implement 'UnionType' sequence class.
*/
#define T UnionType
#define TSeq UnionTypeSeq

#define T_initialize_w_params UnionType_initialize_w_params

#define T_finalize_w_params   UnionType_finalize_w_params
#define T_copy       UnionType_copy

#ifndef NDDS_STANDALONE_TYPE
#include "dds_c/generic/dds_c_sequence_TSeq.gen"
#include "dds_cpp/generic/dds_cpp_sequence_TSeq.gen"
#else
#include "dds_c_sequence_TSeq.gen"
#include "dds_cpp_sequence_TSeq.gen"
#endif

#undef T_copy
#undef T_finalize_w_params

#undef T_initialize_w_params

#undef TSeq
#undef T

#ifndef NDDS_STANDALONE_TYPE
namespace rti { 
    namespace xcdr {
        const RTIXCdrTypeCode * type_code< UnionType>::get() 
        {
            return (const RTIXCdrTypeCode *) UnionType_get_typecode();
        }

    } 
}
#endif
