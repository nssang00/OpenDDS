

/*
WARNING: THIS FILE IS AUTO-GENERATED. DO NOT MODIFY.

This file was generated from UnionType.idl
using RTI Code Generator (rtiddsgen) version 4.2.0.
The rtiddsgen tool is part of the RTI Connext DDS distribution.
For more information, type 'rtiddsgen -help' at a command shell
or consult the Code Generator User's Manual.
*/

#ifndef UnionType_240946868_h
#define UnionType_240946868_h

#ifndef NDDS_STANDALONE_TYPE
#ifndef ndds_cpp_h
#include "ndds/ndds_cpp.h"
#endif
#include "rti/xcdr/Interpreter.hpp"
#else
#include "ndds_standalone_type.h"
#endif

extern "C" {

    extern const char *UnionTypeTYPENAME;

}

struct UnionTypeSeq;
#ifndef NDDS_STANDALONE_TYPE
class UnionTypeTypeSupport;
class UnionTypeDataWriter;
class UnionTypeDataReader;
#endif

typedef struct UnionType
{
    typedef struct UnionTypeSeq Seq;
    #ifndef NDDS_STANDALONE_TYPE
    typedef UnionTypeTypeSupport TypeSupport;
    typedef UnionTypeDataWriter DataWriter;
    typedef UnionTypeDataReader DataReader;
    #endif

    DDS_Long _d;
    struct UnionType_u 
    {

        DDS_Long   long_data ;
        DDS_Float   float_data ;
        DDS_Char *   string_data ;
    }_u;

} UnionType ;
#if (defined(RTI_WIN32) || defined (RTI_WINCE) || defined(RTI_INTIME)) && defined(NDDS_USER_DLL_EXPORT)
/* If the code is building on Windows, start exporting symbols.
*/
#undef NDDSUSERDllExport
#define NDDSUSERDllExport __declspec(dllexport)
#endif

#ifndef NDDS_STANDALONE_TYPE
NDDSUSERDllExport DDS_TypeCode * UnionType_get_typecode(void); /* Type code */
NDDSUSERDllExport RTIXCdrTypePlugin *UnionType_get_type_plugin_info(void);
NDDSUSERDllExport RTIXCdrSampleAccessInfo *UnionType_get_sample_access_info(void);
NDDSUSERDllExport RTIXCdrSampleAccessInfo *UnionType_get_sample_seq_access_info(void);
#endif
DDS_SEQUENCE(UnionTypeSeq, UnionType);

NDDSUSERDllExport
RTIBool UnionType_initialize(
    UnionType* self);

NDDSUSERDllExport
RTIBool UnionType_initialize_ex(
    UnionType* self,RTIBool allocatePointers,RTIBool allocateMemory);

NDDSUSERDllExport
RTIBool UnionType_initialize_w_params(
    UnionType* self,
    const struct DDS_TypeAllocationParams_t * allocParams);  

NDDSUSERDllExport
RTIBool UnionType_finalize_w_return(
    UnionType* self);

NDDSUSERDllExport
void UnionType_finalize(
    UnionType* self);

NDDSUSERDllExport
void UnionType_finalize_ex(
    UnionType* self,RTIBool deletePointers);

NDDSUSERDllExport
void UnionType_finalize_w_params(
    UnionType* self,
    const struct DDS_TypeDeallocationParams_t * deallocParams);

NDDSUSERDllExport
void UnionType_finalize_optional_members(
    UnionType* self, RTIBool deletePointers);  

NDDSUSERDllExport
RTIBool UnionType_copy(
    UnionType* dst,
    const UnionType* src);

NDDSUSERDllExport
DDS_LongLong UnionType_getDefaultDiscriminator(void);

#if (defined(RTI_WIN32) || defined (RTI_WINCE) || defined(RTI_INTIME)) && defined(NDDS_USER_DLL_EXPORT)
/* If the code is building on Windows, stop exporting symbols.
*/
#undef NDDSUSERDllExport
#define NDDSUSERDllExport
#endif

#ifndef NDDS_STANDALONE_TYPE
namespace rti { 
    namespace xcdr {
        template <>
        struct type_code< UnionType> {
            static const RTIXCdrTypeCode * get();
        };

    } 
}

#endif

#endif /* UnionType */

