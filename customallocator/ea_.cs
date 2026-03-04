
using EA;
using System.Windows.Forms;

public class MyAddin
{
    // 필수
    public string EA_Connect(Repository repository)
    {
        return "MyAddin connected";
    }

    public void EA_Disconnect()
    {
    }

    // 메뉴
    public object EA_GetMenuItems(Repository repository, string location, string menuName)
    {
        if (menuName == "") return "My Addin Menu";
        else if (menuName == "My Addin Menu") return new string[] { "Open Builder" };
        return "";
    }

    public void EA_MenuClick(Repository repository, string location, string menuName, string itemName)
    {
        if (itemName == "Open Builder")
        {
            var form = new MyBuilderForm(repository);
            form.Show();
        }
    }

    // 선택적 이벤트
    public void EA_OnPostNewElement(Repository repository, EventProperties info)
    {
        // Element 생성 후 자동 처리
    }
}

//////////////
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

//////////
using System;
using EA;

class Program
{
    static void Main()
    {
        Repository repository = new Repository();

        bool opened = repository.OpenFile(@"C:\Model\sample.qea");
        if (!opened)
        {
            Console.WriteLine("파일 열기 실패");
            return;
        }

        // 루트 모델 순회
        foreach (Package model in repository.Models)
        {
            PrintPackage(model, 0);
        }

        repository.CloseFile();
        repository.Exit();
    }

    static void PrintPackage(Package package, int depth)
    {
        string indent = new string(' ', depth * 2);
        Console.WriteLine($"{indent}📦 Package: {package.Name}");

        // 클래스 출력
        foreach (Element element in package.Elements)
        {
            if (element.Type == "Class")
            {
                Console.WriteLine($"{indent}  🧱 Class: {element.Name}");

                // 멤버 변수
                foreach (Attribute attr in element.Attributes)
                {
                    Console.WriteLine($"{indent}    - {attr.Name} : {attr.Type}");
                }

                // 메서드
                foreach (Method method in element.Methods)
                {
                    Console.WriteLine($"{indent}    + {method.Name}() : {method.ReturnType}");
                }
            }
        }

        // 하위 패키지 재귀 호출
        foreach (Package child in package.Packages)
        {
            PrintPackage(child, depth + 1);
        }
    }
}
