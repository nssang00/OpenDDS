# UMAA++ Documentation
This README provides a summary of the usage of UMAA related classes as well as any limitations or caveats of their implementation. Documentation on specific interfaces and methods can be generated via Doxygen.
## Conditionals
### Conditional Base
The `ConditionalBase` class is a pure virtual class that is used to link a base conditional with its specialization and allow conditionals of various specialized types to be evaluated without needing to know type information for each.
### Conditional Factory
The `ConditionalFactory` class is a factory class used to simplify the creation of conditionals derived from the `ConditionalBase` class. It allows for the creation of said conditionals with only the generalized UMAA `ConditionalType` that can be obtained from the Large Set provided by the Conditional Report. Since it is impossible to know in advance what types of specialized conditionals may be needed, the `ConditionalFactoryIo` object passed to the Conditional Factory in its constructor contains `SpecializationCache` objects which can be used to retrieve specialized conditionals types. The factory can be used to create conditional objects individually, but it is most effective when used as part of the `ConditionalReportConsumer` class where it can resolve dependencies between conditionals and automatically register the proper observers.
#### Conditional Factory IO
The `ConditionalFactory` class takes a separate `ConditionalFactoryIo` object in its constructor which groups all the necessary `SpecializationCache`s and `Subject`s used to construct conditionals derived from the `ConditionalBase` class. The `SpecializationCache`s continuously listen for incoming samples of the specialized type and assigns them to a lookup table based on their `specializationReferenceID` which corresponds to the `specializationID` of the generalized UMAA `ConditionalType`. The `Subject`s are used by some specialized conditionals in order to access the latest samples of a given type where multiple parties may need to have access to the data. These `Subject`s allow the specialized conditional to register as an `Observer` for in order to access said data and be evaluated properly. These `Subject`s are currently reports containing data falling under the *Situational Awareness* category.
### Specialization Cache
The `SpecializationCache` class is a utility that takes a reader of a type that is a UMAA Specialization and continuously polls for incoming samples of the specialized type. When a new sample is received, it is assigned to a lookup table based on its `specializationReferenceID` which corresponds to the `specializationID` of the generalized UMAA type. It also handles updates and disposals.
### Conditional Report Consumer
The `ConditionalReportConsumer` class is a utility that reads the UMAA `ConditionalReportType` and its associated Large Set and generates conditionals derived from the `ConditionalBase` class using a `ConditionalFactory` object. It exists to reduce the complexity of transforming a Conditional Report into individual conditionals that can be evaluated.
## Large Collections
### Large Lists
The `LargeList` class is used internally by the `LargeListReader` class but may be useful on its own in some situations. It is not tied to the BaseReader interface and deals with ListElement and Metadata objects directly regardless of their source.
#### Large List Writer
The `LargeListWriter` class can be used to automate the process of publishing updates and maintaining metadata associated with the process of creating, updating, and disposing of Elements in a Large List. Signaling a change in a Large Collection is accomplished by publishing the metadata as its own topic or as part of another topic. Because of this, the LargeListWriter class will handle writing Large List Elements but requires the user to publish the metadata to signal the end of an atomic transaction. This class takes two template parameters: one for the Element that the list is composed of, and one for the topic that encapsulates said Element (hereby referred to as a ListElement) that contains metadata about the Element itself and its relationship with other Elements.

The following is an example where Element is `GlobalWaypointType` and the ListElement is `GlobalWaypointCommandTypeWaypointsListElement`. The metadata is updated via the `GlobalWaypointCommandType`.
```c++
// DDS Writer for GlobalWaypointCommandTypeWaypointsListElement
auto waypointListElementSender = std::make_shared<SenderBase<GlobalWaypointCommandTypeWaypointsListElement>>(...);

// DDS Writer for GlobalWaypointCommandType
auto globalWaypointCommandSender = std::make_shared<SenderBase<GlobalWaypointCommandType>>(...);

// Note that there is no DDS Writer for the GlobalWaypointType directly since it is encapsulated in the GlobalWaypointCommandTypeWaypointsListElement type

// Populate an initial list of waypoints if desired
std::vector<GlobalWaypointType> initialWaypointList(...);

// Create the LargeListWriter 
LargeListWriter<GlobalWaypointType, GlobalWaypointCommandTypeWaypointsListElement> waypointList(waypointListElementSender, initialWaypointList);

// Create a Global Waypoint Command and initialize common command fields
GlobalWaypointCommandType command;
...
// Set the metadata field to signal an update to the Large List
command.waypointsListMetadata(waypointList.getMetadata());

// Sending the command with the LargeListMetadata confirms the creation/update of the Large List
auto status = globalWaypointCommandSender.send(command);
```
#### Large List Reader
The `LargeListReader` class manages the state of and provides an interface to all Large Lists of type `Element` where `Element`s type is provided by the first template parameter. The other template parameter is for the actual DDS topic that encapsulates an `Element`, hereby referred to as a `ListElement`. The `ListElement` contains metadata about the `Element` and its relationship with other `ListElement`s. 

This class uses a single instance of a derivation of the `BaseReader` *pure virtual class* that reads `ListElement` samples. This allows us to process all the incoming changes to any Large List at once. This allows us to share a single `BaseReader` instance for all Large Lists of the same type instead of having to individually manage multiple LargeList objects and filtered readers listening for specific List IDs. 
> In the case where this functionality is added, this class would become a `LargeListAggregateReader` or something similar

To read the contents of a Large List, use the `getListFromMetadata` function to get update the Large List and generate a `LargeListResult` with the state of the list (i.e. `VALID_LIST`, `EMPTY_LIST`, or `INVALID_LIST`) and a `std::weak_ptr` to a `std::list<Element>` representation of the Large List. To retrieve a Large List from its existing metadata (e.g. to check if a list has become valid since the metadata was updated), use the `getListById` function and provide the ID of the desired Large List as a `NumericGuid`.

**Some caveats of this implementation:**
- Users must handle the disposal of Large Lists manually by calling either `disposeListById` or `disposeListFromMetadata` since the implementation does not read the `LargeListMetadata` directly.
- Reads are performed *only* when metadata is updated (dispose is considered a metadata update) or there has not been a valid list generated since the last metadata update (i.e. `getListFromMetadata` had a result with the status `INVALID_LIST`). You may want to use a `BufferedReaderBase` implementation or periodically call the `updateListElements` function to make sure the DDS buffer doesn't overflow.
- The reader stores *all* ListElement data and does not filter for specific Large Lists in case those elements are from Large List whose metadata has not been sent yet. This may lead to the storage of `ListElement`s from unused Large Lists.

### Large Sets
The `LargeSet` class is used internally by the `LargeSetReader` class but may be useful on its own in some situations. It is not tied to the BaseReader interface and deals with SetElement and Metadata objects directly regardless of their source.
#### Large List Writer
The `LargeSetWriter` class can be used to automate the process of publishing updates and maintaining metadata associated with the process of creating, updating, and disposing of Elements in a Large Set. Signaling a change in a Large Collection is accomplished by publishing the metadata as its own topic or as part of another topic. Because of this, the LargeSetWriter class will handle writing Large Set Elements but requires the user to publish the metadata to signal the end of an atomic transaction. This class takes two template parameters: one for the Element that the list is composed of, and one for the topic that encapsulates said Element (hereby referred to as a SetElement) that contains metadata about the Element itself.

The following is an example where Element is `ObjectiveType` and the ListElement is `TaskPlanTypeObjectivesSetElement`. The metadata is updated via the `TaskPlanType`.
```c++
// DDS Writer for TaskPlanTypeObjectivesSetElement
auto objectiveSetElementSender = std::make_shared<SenderBase<TaskPlanTypeObjectivesSetElement>>(...);

// DDS Writer for TaskPlanType
auto taskPlanSender = std::make_shared<SenderBase<TaskPlanType>>(...);

// Note that there is no DDS Writer for the ObjectiveType directly since it is encapsulated in the TaskPlanTypeObjectivesSetElement type

// Populate an initial set of objectives if desired
std::vector<ObjectiveType> initialObjectiveSet(...);

// Create the LargeSetWriter 
LargeSetWriter<ObjectiveType, TaskPlanTypeObjectivesSetElement> objectiveSet(objectiveSetElementSender, initialObjectiveSet);

// Create a Task Plan and initialize common fields
TaskPlanType plan;
...
// Set the metadata field to signal an update to the Large Set
plan.objectivesSetMetadata(objectiveSet.getMetadata());

// Sending the command with the LargeSetMetadata confirms the creation/update of the Large Set
auto status = taskPlanSender.send(plan);
```
#### Large Set Reader
The `LargeSetReader` class manages the state of and provides an interface to all Large Sets of type `Element` where `Element`s type is provided by the first template parameter. The other template parameter is for the actual DDS topic that encapsulates an `Element`, hereby referred to as a `SetElement`. The `SetElement` contains metadata about the `Element` and its relationship with other `SetElement`s. 

This class uses a single instance of a derivation of the `BaseReader` *pure virtual class* that reads `SetElement` samples. This allows us to process all the incoming changes to any Large Set at once. This allows us to share a single `BaseReader` instance for all Large Sets of the same type instead of having to individually manage multiple LargeSet objects and filtered readers listening for specific Set IDs. 
> In the case where this functionality is added, this class would become a `LargeSetAggregateReader` or something similar

To read the contents of a Large Set, use the `getSetFromMetadata` function to get update the Large Set and generate a `LargeSetResult` with the state of the list (i.e. `VALID_SET`, `EMPTY_SET`, or `INVALID_SET`) and a `std::weak_ptr` to a `std::unordered_set<Element, ElementHasher<Element>>` representation of the Large Set. To retrieve a Large Set from its existing metadata (e.g. to check if a list has become valid since the metadata was updated), use the `getSetById` function and provide the ID of the desired Large Set as a `NumericGuid`.

**Some caveats of this implementation:**
- An unordered_set in C++ uses hashing with chaining to store data which requires the `Element` class to have a hashing method. A default template hashing method is provided as part of the `ElementHasher` template, but it is inefficient as it maps all Elements to the same value and relies on chaining. This is due to the fact that not all `Element`s have the same field for their ID (e.g. `ObjectiveID` vs `TaskID`) so an efficient generic implementation is not possible. This problem can be avoided by specializing the template to key off of an `Element`'s ID (e.g. an `ObjectiveType`'s `ObjectiveID`) by returning the results of the `hashNumericGuid` function applied to its ID. The goal of UMAA++ would be to provide these specialized hash templates for all of the `Element`s that make up a large set. If a specialization does not exist, it can be defined by the end user or the default method may be used at the cost of performance.
> A C++ set (ordered) has a similar limitation where `operator<` would need to be defined for each `Element` type.
- Users must handle the disposal of Large Sets manually by calling either `disposeSetById` or `disposeSetFromMetadata` since the implementation does not read the `LargeSetMetadata` directly.
- Reads are performed *only* when metadata is updated (dispose is considered a metadata update) or there has not been a valid list generated since the last metadata update (i.e. `getSetFromMetadata` had a result with the status `INVALID_LIST`). You may want to use a `BufferedReaderBase` implementation or periodically call the `updateSetElements` function to make sure the DDS buffer doesn't overflow.
- The reader stores *all* SetElement data and does not filter for specific Large Sets in case those elements are from Large Set whose metadata has not been sent yet. This may lead to the storage of `SetElement`s from unused Large Sets.
