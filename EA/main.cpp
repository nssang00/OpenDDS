int main() {
    try {
        EARepository repo("project.qea");
        IDLGenerator gen(repo);
        gen.generate("output.idl");
        std::cout << "IDL 생성 완료\n";
    } catch (const std::exception& e) {
        std::cerr << "오류: " << e.what() << "\n";
    }
}
