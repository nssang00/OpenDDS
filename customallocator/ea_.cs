using System;
using EA;

class Program
{
    static void Main()
    {
        // 1️⃣ Repository 생성
        Repository repository = new Repository();

        // 2️⃣ 모델 파일 열기
        bool opened = repository.OpenFile(@"C:\Model\sample.qea");
        if (!opened)
        {
            Console.WriteLine("모델 파일 열기 실패");
            return;
        }

        // 3️⃣ 루트 모델 가져오기
        Package rootModel = repository.Models.GetAt(0);

        // 4️⃣ 패키지 생성
        Package newPackage = (Package)rootModel.Packages.AddNew("Domain", "");
        newPackage.Update();
        rootModel.Packages.Refresh();

        // 5️⃣ 클래스 생성
        Element newClass = (Element)newPackage.Elements.AddNew("Person", "Class");
        newClass.Update();
        newPackage.Elements.Refresh();

        // 6️⃣ 멤버 변수 추가
        Attribute attr1 = (Attribute)newClass.Attributes.AddNew("name", "String");
        attr1.Update();

        Attribute attr2 = (Attribute)newClass.Attributes.AddNew("age", "int");
        attr2.Update();

        newClass.Attributes.Refresh();

        // 7️⃣ 모델 뷰 갱신
        repository.RefreshModelView(newPackage.PackageID);

        Console.WriteLine("패키지, 클래스, 멤버 변수 생성 완료");

        // 8️⃣ 종료
        repository.CloseFile();
        repository.Exit();
    }
}
