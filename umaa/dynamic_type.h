omg dds xtypes
Fluent Interface,  Method 


​sequence<std::string<20>,30> aaa[40]
auto type = TypeBuilder("Complex")
.member<std::string>("aaa")
.bound(20) // string<20>
.sequence(30) // sequence<string<20>, 30>
.array(40) // array[40] of sequence
.build();​

auto type = TypeBuilder("Complex")
.member<int32_t>("id").key()
.member<float>("temp")
.member<std::string>("name").bound(100)
.member<std::string>("uuid").key().bound(36)
.member<float>("coefficients").array(4, 20)
.member<std::string>("labels").array(10).bound(50)
.member<float>("readings").sequence()
.member<double>("history").sequence(1000)
.member<std::string>("tags").bound(64).sequence(20)
.build();
    .struct("Nested")
        .member("x")
        .member("y")
    .end_struct()
.build();

auto type = TypeBuilder("Sensor")
.member<int32_t>("id").key()
.member<float>("temp").annotation("description", "unique id")
.member<std::string>("name").bound(100)
.member<std::string>("uuid").key().bound(36)
.member<float>("coefficients").array(4, 20)
.member<std::string>("labels").array(10).bound(50)
.member<float>("readings").sequence()
.member<double>("history").sequence(1000)
.member<std::string>("tags").sequence(20).bound(64)
.build();​

.key()
.bound(N)
.optional()
.annotation("key", "value")
.default_value(value)​

//////////
data["pose"]["x"] = 1.0f; 

data.set("pose.x", 1.0f);
