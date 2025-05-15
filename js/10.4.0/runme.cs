            ObjectPoseInfoList list = new ObjectPoseInfoList();
            list.Add(new ObjectPoseInfo(1, 1.2, "hello1"));
            list.Add(new ObjectPoseInfo(2, 2.2, "hello2"));
            PairUser.updateInfo(list);

        static void updateInfo(const ObjectPoseInfoList& list)
        {
            for (const auto& tup : list) {
                std::printf("%d %.6f %s\n", std::get<0>(tup), std::get<1>(tup), std::get<2>(tup).c_str());
            }
        }
