

/*
WARNING: THIS FILE IS AUTO-GENERATED. DO NOT MODIFY.

This file was generated from UnionType.idl using "rtiddsgen".
The rtiddsgen tool is part of the RTI Connext distribution.
For more information, type 'rtiddsgen -help' at a command shell
or consult the RTI Connext manual.
*/

#ifndef UnionTypePlugin_240946868_h
#define UnionTypePlugin_240946868_h

#include "UnionType.hpp"

struct RTICdrStream;

#ifndef pres_typePlugin_h
#include "pres/pres_typePlugin.h"
#endif

#if (defined(RTI_WIN32) || defined (RTI_WINCE)) && defined(NDDS_USER_DLL_EXPORT)
/* If the code is building on Windows, start exporting symbols.
*/
#undef NDDSUSERDllExport
#define NDDSUSERDllExport __declspec(dllexport)
#endif

#define UnionTypePlugin_get_sample PRESTypePluginDefaultEndpointData_getSample 
#define UnionTypePlugin_get_buffer PRESTypePluginDefaultEndpointData_getBuffer 
#define UnionTypePlugin_return_buffer PRESTypePluginDefaultEndpointData_returnBuffer 

#define UnionTypePlugin_create_sample PRESTypePluginDefaultEndpointData_createSample 
#define UnionTypePlugin_destroy_sample PRESTypePluginDefaultEndpointData_deleteSample 

/* --------------------------------------------------------------------------------------
Support functions:
* -------------------------------------------------------------------------------------- */

NDDSUSERDllExport extern UnionType*
UnionTypePluginSupport_create_data_w_params(
    const struct DDS_TypeAllocationParams_t * alloc_params);

NDDSUSERDllExport extern UnionType*
UnionTypePluginSupport_create_data_ex(RTIBool allocate_pointers);

NDDSUSERDllExport extern UnionType*
UnionTypePluginSupport_create_data(void);

NDDSUSERDllExport extern RTIBool 
UnionTypePluginSupport_copy_data(
    UnionType *out,
    const UnionType *in);

NDDSUSERDllExport extern void 
UnionTypePluginSupport_destroy_data_w_params(
    UnionType *sample,
    const struct DDS_TypeDeallocationParams_t * dealloc_params);

NDDSUSERDllExport extern void 
UnionTypePluginSupport_destroy_data_ex(
    UnionType *sample,RTIBool deallocate_pointers);

NDDSUSERDllExport extern void 
UnionTypePluginSupport_destroy_data(
    UnionType *sample);

NDDSUSERDllExport extern void 
UnionTypePluginSupport_print_data(
    const UnionType *sample,
    const char *desc,
    unsigned int indent);

/* ----------------------------------------------------------------------------
Callback functions:
* ---------------------------------------------------------------------------- */

NDDSUSERDllExport extern PRESTypePluginParticipantData 
UnionTypePlugin_on_participant_attached(
    void *registration_data, 
    const struct PRESTypePluginParticipantInfo *participant_info,
    RTIBool top_level_registration, 
    void *container_plugin_context,
    RTICdrTypeCode *typeCode);

NDDSUSERDllExport extern void 
UnionTypePlugin_on_participant_detached(
    PRESTypePluginParticipantData participant_data);

NDDSUSERDllExport extern PRESTypePluginEndpointData 
UnionTypePlugin_on_endpoint_attached(
    PRESTypePluginParticipantData participant_data,
    const struct PRESTypePluginEndpointInfo *endpoint_info,
    RTIBool top_level_registration, 
    void *container_plugin_context);

NDDSUSERDllExport extern void 
UnionTypePlugin_on_endpoint_detached(
    PRESTypePluginEndpointData endpoint_data);

NDDSUSERDllExport extern void    
UnionTypePlugin_return_sample(
    PRESTypePluginEndpointData endpoint_data,
    UnionType *sample,
    void *handle);    

NDDSUSERDllExport extern RTIBool 
UnionTypePlugin_copy_sample(
    PRESTypePluginEndpointData endpoint_data,
    UnionType *out,
    const UnionType *in);

/* ----------------------------------------------------------------------------
(De)Serialize functions:
* ------------------------------------------------------------------------- */

NDDSUSERDllExport extern RTIBool 
UnionTypePlugin_serialize(
    PRESTypePluginEndpointData endpoint_data,
    const UnionType *sample,
    struct RTICdrStream *stream, 
    RTIBool serialize_encapsulation,
    RTIEncapsulationId encapsulation_id,
    RTIBool serialize_sample, 
    void *endpoint_plugin_qos);

NDDSUSERDllExport extern RTIBool 
UnionTypePlugin_deserialize_sample(
    PRESTypePluginEndpointData endpoint_data,
    UnionType *sample, 
    struct RTICdrStream *stream,
    RTIBool deserialize_encapsulation,
    RTIBool deserialize_sample, 
    void *endpoint_plugin_qos);

NDDSUSERDllExport extern RTIBool
UnionTypePlugin_serialize_to_cdr_buffer(
    char * buffer,
    unsigned int * length,
    const UnionType *sample); 

NDDSUSERDllExport extern RTIBool 
UnionTypePlugin_deserialize(
    PRESTypePluginEndpointData endpoint_data,
    UnionType **sample, 
    RTIBool * drop_sample,
    struct RTICdrStream *stream,
    RTIBool deserialize_encapsulation,
    RTIBool deserialize_sample, 
    void *endpoint_plugin_qos);

NDDSUSERDllExport extern RTIBool
UnionTypePlugin_deserialize_from_cdr_buffer(
    UnionType *sample,
    const char * buffer,
    unsigned int length);    

NDDSUSERDllExport extern RTIBool
UnionTypePlugin_skip(
    PRESTypePluginEndpointData endpoint_data,
    struct RTICdrStream *stream, 
    RTIBool skip_encapsulation,  
    RTIBool skip_sample, 
    void *endpoint_plugin_qos);

NDDSUSERDllExport extern unsigned int 
UnionTypePlugin_get_serialized_sample_max_size_ex(
    PRESTypePluginEndpointData endpoint_data,
    RTIBool * overflow,
    RTIBool include_encapsulation,
    RTIEncapsulationId encapsulation_id,
    unsigned int current_alignment);    

NDDSUSERDllExport extern unsigned int 
UnionTypePlugin_get_serialized_sample_max_size(
    PRESTypePluginEndpointData endpoint_data,
    RTIBool include_encapsulation,
    RTIEncapsulationId encapsulation_id,
    unsigned int current_alignment);

NDDSUSERDllExport extern unsigned int 
UnionTypePlugin_get_serialized_sample_min_size(
    PRESTypePluginEndpointData endpoint_data,
    RTIBool include_encapsulation,
    RTIEncapsulationId encapsulation_id,
    unsigned int current_alignment);

NDDSUSERDllExport extern unsigned int
UnionTypePlugin_get_serialized_sample_size(
    PRESTypePluginEndpointData endpoint_data,
    RTIBool include_encapsulation,
    RTIEncapsulationId encapsulation_id,
    unsigned int current_alignment,
    const UnionType * sample);

/* --------------------------------------------------------------------------------------
Key Management functions:
* -------------------------------------------------------------------------------------- */
NDDSUSERDllExport extern PRESTypePluginKeyKind 
UnionTypePlugin_get_key_kind(void);

NDDSUSERDllExport extern unsigned int 
UnionTypePlugin_get_serialized_key_max_size_ex(
    PRESTypePluginEndpointData endpoint_data,
    RTIBool * overflow,
    RTIBool include_encapsulation,
    RTIEncapsulationId encapsulation_id,
    unsigned int current_alignment);

NDDSUSERDllExport extern unsigned int 
UnionTypePlugin_get_serialized_key_max_size(
    PRESTypePluginEndpointData endpoint_data,
    RTIBool include_encapsulation,
    RTIEncapsulationId encapsulation_id,
    unsigned int current_alignment);

NDDSUSERDllExport extern RTIBool 
UnionTypePlugin_serialize_key(
    PRESTypePluginEndpointData endpoint_data,
    const UnionType *sample,
    struct RTICdrStream *stream,
    RTIBool serialize_encapsulation,
    RTIEncapsulationId encapsulation_id,
    RTIBool serialize_key,
    void *endpoint_plugin_qos);

NDDSUSERDllExport extern RTIBool 
UnionTypePlugin_deserialize_key_sample(
    PRESTypePluginEndpointData endpoint_data,
    UnionType * sample,
    struct RTICdrStream *stream,
    RTIBool deserialize_encapsulation,
    RTIBool deserialize_key,
    void *endpoint_plugin_qos);

NDDSUSERDllExport extern RTIBool 
UnionTypePlugin_deserialize_key(
    PRESTypePluginEndpointData endpoint_data,
    UnionType ** sample,
    RTIBool * drop_sample,
    struct RTICdrStream *stream,
    RTIBool deserialize_encapsulation,
    RTIBool deserialize_key,
    void *endpoint_plugin_qos);

NDDSUSERDllExport extern RTIBool
UnionTypePlugin_serialized_sample_to_key(
    PRESTypePluginEndpointData endpoint_data,
    UnionType *sample,
    struct RTICdrStream *stream, 
    RTIBool deserialize_encapsulation,  
    RTIBool deserialize_key, 
    void *endpoint_plugin_qos);

/* Plugin Functions */
NDDSUSERDllExport extern struct PRESTypePlugin*
UnionTypePlugin_new(void);

NDDSUSERDllExport extern void
UnionTypePlugin_delete(struct PRESTypePlugin *);

#if (defined(RTI_WIN32) || defined (RTI_WINCE)) && defined(NDDS_USER_DLL_EXPORT)
/* If the code is building on Windows, stop exporting symbols.
*/
#undef NDDSUSERDllExport
#define NDDSUSERDllExport
#endif

#endif /* UnionTypePlugin_240946868_h */

