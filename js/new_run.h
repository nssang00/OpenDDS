template<typename T>
T* SDDS_NEW_RUNTIME(size_t count = 1) {
  if(count == 1) {
    return reinterpret_cast<T*>(new (SDDSMemoryManager::Instance()->allocate(sizeof(T))) T);
  }
  else {
    T* array = reinterpret_cast<T*>(SDDSMemoryManager::Instance()->allocate(sizeof(T) * count));
    for(size_T i = 0; i<count; ++i)
      new (&array[i]) T;
    return array;
  }
}

template<typename T>
T* SDDS_NEW_RUNTIME(size_t count = 1) {
#ifdef USE_SDDS_MEMORY_MANAGER
  if (count == 1) {
    return reinterpret_cast<T*>(new (SDDSMemoryManager::Instance()->allocate(sizeof(T))) T);
  } else {
    T* array = reinterpret_cast<T*>(SDDSMemoryManager::Instance()->allocate(sizeof(T) * count));
    for (size_t i = 0; i < count; ++i)
      new (&array[i]) T;
    return array;
  }
#else
  if (count == 1) {
    return new T;
  } else {
    T* array = new T[count];
    for (size_t i = 0; i < count; ++i)
      new (&array[i]) T;
    return array;
  }
#endif
}
