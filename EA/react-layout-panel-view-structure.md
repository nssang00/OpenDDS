# React UI 구조 정리: Layout / Panel / View 기준

## 목적

현재 프로젝트의 목표는 컴포넌트 계층을 과하게 추상화하는 것이 아니라, **폴더명과 파일명만 봐도 수정 위치를 빠르게 찾을 수 있게 하는 것**입니다.

WPF 개발자에게도 익숙한 감각으로 보면 다음처럼 대응시키면 됩니다.

```txt
React Layout   ≈ WPF Window / Grid / DockPanel 구조
React Panel    ≈ 영역 단위 UserControl
React View     ≈ 탭 안의 실제 화면 UserControl
React Store    ≈ ViewModel / 상태 관리
```

따라서 `Pane`은 별도 폴더나 파일로 만들지 않고, `WorkspaceLayout.jsx` 안의 `Splitter.Panel`이 그 역할을 담당하도록 두는 것이 좋습니다.

---

## 최종 권장 계층

```txt
MainLayout
└── WorkspaceLayout
    ├── ExplorerPanel
    │   ├── ModelView
    │   └── SearchView
    ├── WorkspacePanel
    │   ├── DiagramView
    │   ├── IdlView
    │   ├── QosXmlView
    │   └── ValidationView
    └── InspectorPanel
        ├── PropertiesView
        ├── MembersView
        └── QosView
```

핵심 규칙은 다음과 같습니다.

```txt
Layout    = 화면 전체 배치 / Splitter / 영역 크기
Panel     = 탭을 가진 기능 영역
View      = 탭 안의 실제 화면
Component = 재사용 가능한 작은 UI 조각
Page      = 라우팅 또는 화면 진입점
Store     = 상태 관리 / ViewModel 역할
```

---

## Pane을 만들지 않는 이유

`ExplorerPane.jsx`와 `ExplorerPanel.jsx`를 동시에 만들면 이름이 비슷해서 오히려 수정 위치를 헷갈리게 만들 수 있습니다.

```txt
ExplorerPane.jsx
ExplorerPanel.jsx
```

이 구조에서는 개발자가 다음을 계속 고민하게 됩니다.

```txt
탭 수정은 Panel인가?
크기 수정은 Pane인가?
Explorer 전체 수정은 어디인가?
둘 다 봐야 하나?
```

현재 프로젝트에서는 `Splitter.Panel` 자체가 Pane 역할을 하므로 별도 파일로 만들 필요가 없습니다.

---

## 추천 폴더 구조

```txt
src/
  App.jsx
  main.jsx

  layouts/
    MainLayout.jsx
    WorkspaceLayout.jsx

  components/
    AppHeader.jsx
    MemberTable.jsx
    ModelDiagram.jsx
    ModelTree.jsx
    PropertyForm.jsx
    TextEditor.jsx

  panels/
    ExplorerPanel.jsx
    WorkspacePanel.jsx
    InspectorPanel.jsx

  views/
    explorer/
      ModelView.jsx
      SearchView.jsx

    workspace/
      DiagramView.jsx
      IdlView.jsx
      QosXmlView.jsx
      ValidationView.jsx

    inspector/
      PropertiesView.jsx
      MembersView.jsx
      QosView.jsx

  pages/
    LoginPage.jsx
    ProjectListPage.jsx
    UserManagementPage.jsx
    WorkspacePage.jsx

  stores/
    useAuthStore.js
    useDesignerStore.js
    useProjectStore.js

  api/
    mockData.js

  utils/
    documentGenerator.js
    idlGenerator.js
```

현재처럼 `views/` 아래에 모든 View를 한 줄로 나열하는 것도 가능하지만, 수정 위치를 빠르게 찾는 목적이라면 아래처럼 Panel 기준으로 하위 폴더를 나누는 것이 더 좋습니다.

```txt
views/explorer/ModelView.jsx
views/workspace/DiagramView.jsx
views/inspector/PropertiesView.jsx
```

---

## 파일별 책임 기준

### `layouts/MainLayout.jsx`

역할:

```txt
앱 전체 Shell 구성
Header와 WorkspaceLayout 배치
인증된 사용자가 보는 메인 화면의 최상위 구조
```

권장:

```txt
프로젝트 선택 로직, 로그아웃 버튼, 사용자 표시 UI는 AppHeader로 분리
MainLayout은 배치만 담당
```

---

### `components/AppHeader.jsx`

역할:

```txt
상단 Header UI
프로젝트 선택
Manage / Users 이동
사용자 표시
Logout
dirty 상태 표시
```

수정 예:

```txt
상단 버튼 추가
프로젝트 선택 UI 변경
사용자 메뉴 추가
로그아웃 위치 변경
```

---

### `layouts/WorkspaceLayout.jsx`

역할:

```txt
좌측 Explorer / 중앙 Workspace / 우측 Inspector 배치
Splitter.Panel 크기 설정
min / max / default size 설정
```

수정 예:

```txt
좌측 영역 기본 너비 변경
우측 Inspector 최소 너비 변경
중앙 영역 배치 변경
하단 Console 영역 추가
```

---

### `panels/ExplorerPanel.jsx`

역할:

```txt
Explorer 영역의 탭 구성
Model 탭 / Search 탭 관리
Explorer 영역 toolbar 또는 actions 관리
```

수정 예:

```txt
Explorer에 새 탭 추가
Model/Search 탭 이름 변경
Explorer 영역 상단 버튼 추가
```

---

### `panels/WorkspacePanel.jsx`

역할:

```txt
중앙 작업 영역의 탭 구성
Diagram / IDL / QoS XML / Validation 탭 관리
```

수정 예:

```txt
중앙에 새 탭 추가
Diagram 탭을 기본 탭으로 설정
Validation 탭 위치 변경
```

---

### `panels/InspectorPanel.jsx`

역할:

```txt
우측 Inspector 영역의 탭 구성
Properties / Members / QoS 탭 관리
```

수정 예:

```txt
Inspector에 새 탭 추가
Properties 탭 기본 선택
Members 탭 제거 또는 위치 변경
```

---

### `views/*/*View.jsx`

역할:

```txt
각 탭 안의 실제 콘텐츠 화면
데이터 표시
사용자 입력 처리
작은 컴포넌트 조합
```

예:

```txt
views/explorer/ModelView.jsx       = Model 탭 내부
views/workspace/DiagramView.jsx    = Diagram 탭 내부
views/inspector/PropertiesView.jsx = Properties 탭 내부
```

---

### `components/`

역할:

```txt
여러 View 또는 Panel에서 재사용 가능한 작은 UI 조각
도메인 단위 UI 컴포넌트
```

예:

```txt
ModelTree.jsx
ModelDiagram.jsx
PropertyForm.jsx
MemberTable.jsx
TextEditor.jsx
```

---

### `stores/`

역할:

```txt
전역 상태 관리
WPF의 ViewModel과 유사한 역할
```

예:

```txt
useAuthStore.js      = 로그인 사용자, 페이지 이동, 로그아웃
useProjectStore.js   = 프로젝트 목록, 현재 프로젝트
useDesignerStore.js  = 모델 데이터, 선택 상태, dirty 상태
```

---

## JSX 예시

### `layouts/MainLayout.jsx`

```jsx
import { Layout } from 'antd';
import AppHeader from '../components/AppHeader.jsx';
import WorkspaceLayout from './WorkspaceLayout.jsx';

export default function MainLayout() {
  return (
    <Layout className="app-shell">
      <AppHeader />
      <WorkspaceLayout />
    </Layout>
  );
}
```

---

### `layouts/WorkspaceLayout.jsx`

```jsx
import { Splitter } from 'antd';
import ExplorerPanel from '../panels/ExplorerPanel.jsx';
import WorkspacePanel from '../panels/WorkspacePanel.jsx';
import InspectorPanel from '../panels/InspectorPanel.jsx';

export default function WorkspaceLayout() {
  return (
    <Splitter className="workspace-layout">
      <Splitter.Panel
        defaultSize={300}
        min={240}
        max={480}
        className="workspace-layout__explorer"
      >
        <ExplorerPanel />
      </Splitter.Panel>

      <Splitter.Panel
        min={520}
        className="workspace-layout__main"
      >
        <WorkspacePanel />
      </Splitter.Panel>

      <Splitter.Panel
        defaultSize={390}
        min={320}
        max={560}
        className="workspace-layout__inspector"
      >
        <InspectorPanel />
      </Splitter.Panel>
    </Splitter>
  );
}
```

---

### `panels/ExplorerPanel.jsx`

```jsx
import { Tabs } from 'antd';
import ModelView from '../views/explorer/ModelView.jsx';
import SearchView from '../views/explorer/SearchView.jsx';

export default function ExplorerPanel() {
  const items = [
    {
      key: 'model',
      label: 'Model',
      children: <ModelView />,
    },
    {
      key: 'search',
      label: 'Search',
      children: <SearchView />,
    },
  ];

  return (
    <section className="panel explorer-panel">
      <Tabs
        size="small"
        defaultActiveKey="model"
        items={items}
      />
    </section>
  );
}
```

---

### `panels/WorkspacePanel.jsx`

```jsx
import { Tabs } from 'antd';
import DiagramView from '../views/workspace/DiagramView.jsx';
import IdlView from '../views/workspace/IdlView.jsx';
import QosXmlView from '../views/workspace/QosXmlView.jsx';
import ValidationView from '../views/workspace/ValidationView.jsx';

export default function WorkspacePanel() {
  const items = [
    {
      key: 'diagram',
      label: 'Diagram',
      children: <DiagramView />,
    },
    {
      key: 'idl',
      label: 'IDL',
      children: <IdlView />,
    },
    {
      key: 'qosXml',
      label: 'QoS XML',
      children: <QosXmlView />,
    },
    {
      key: 'validation',
      label: 'Validation',
      children: <ValidationView />,
    },
  ];

  return (
    <section className="panel workspace-panel">
      <Tabs
        size="small"
        defaultActiveKey="diagram"
        items={items}
      />
    </section>
  );
}
```

---

### `panels/InspectorPanel.jsx`

```jsx
import { Tabs } from 'antd';
import PropertiesView from '../views/inspector/PropertiesView.jsx';
import MembersView from '../views/inspector/MembersView.jsx';
import QosView from '../views/inspector/QosView.jsx';

export default function InspectorPanel() {
  const items = [
    {
      key: 'properties',
      label: 'Properties',
      children: <PropertiesView />,
    },
    {
      key: 'members',
      label: 'Members',
      children: <MembersView />,
    },
    {
      key: 'qos',
      label: 'QoS',
      children: <QosView />,
    },
  ];

  return (
    <section className="panel inspector-panel">
      <Tabs
        size="small"
        defaultActiveKey="properties"
        items={items}
      />
    </section>
  );
}
```

---

## 수정 위치 빠른 판단표

| 수정 내용 | 수정 위치 |
|---|---|
| 좌/중앙/우 영역 크기 변경 | `layouts/WorkspaceLayout.jsx` |
| 새 영역 추가, Splitter 구조 변경 | `layouts/WorkspaceLayout.jsx` |
| 상단 Header 버튼 추가 | `components/AppHeader.jsx` |
| 프로젝트 선택 UI 변경 | `components/AppHeader.jsx` |
| Explorer 탭 추가/삭제 | `panels/ExplorerPanel.jsx` |
| Workspace 탭 추가/삭제 | `panels/WorkspacePanel.jsx` |
| Inspector 탭 추가/삭제 | `panels/InspectorPanel.jsx` |
| Model 탭 내부 내용 수정 | `views/explorer/ModelView.jsx` |
| Search 탭 내부 내용 수정 | `views/explorer/SearchView.jsx` |
| Diagram 화면 수정 | `views/workspace/DiagramView.jsx` |
| IDL 출력 화면 수정 | `views/workspace/IdlView.jsx` |
| Properties 폼 수정 | `views/inspector/PropertiesView.jsx` |
| 여러 곳에서 쓰는 테이블 수정 | `components/MemberTable.jsx` |
| 전역 모델 상태 수정 | `stores/useDesignerStore.js` |
| 프로젝트 목록/선택 상태 수정 | `stores/useProjectStore.js` |
| 로그인/페이지 이동/로그아웃 수정 | `stores/useAuthStore.js` |

---

## 최종 결론

현재 프로젝트에서는 다음 원칙이 가장 적합합니다.

```txt
Pane은 파일/폴더로 만들지 않는다.
Splitter.Panel이 Pane 역할을 한다.
Layout은 배치만 담당한다.
Panel은 Tabs를 담당한다.
View는 탭 내부 콘텐츠를 담당한다.
Component는 재사용 가능한 작은 UI를 담당한다.
Store는 WPF ViewModel처럼 상태를 담당한다.
```

가장 추천하는 최종 구조는 다음입니다.

```txt
MainLayout.jsx
  → AppHeader와 WorkspaceLayout 배치

WorkspaceLayout.jsx
  → 좌/중앙/우 Splitter 배치

ExplorerPanel.jsx / WorkspacePanel.jsx / InspectorPanel.jsx
  → 영역별 Tabs 구성

views/explorer/*View.jsx
views/workspace/*View.jsx
views/inspector/*View.jsx
  → 각 탭 내부 화면
```
