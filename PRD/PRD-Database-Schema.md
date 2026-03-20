# CWT 命題工作平臺 — 跨 PRD 衝突分析 ＋ 統一資料庫規劃

> **版本**: v1.0
> **日期**: 2026-03-19
> **目的**: 彙整 10 份頁面 PRD 中的資料表定義，標示邏輯衝突，並產出一份統一的資料庫結構

---

## 一、跨 PRD 邏輯衝突清單

### 🔴 衝突 1：主鍵型別不一致（UNIQUEIDENTIFIER vs INT）

| 來源 PRD | 資料表 | PK 型別 |
|----------|--------|---------|
| PRD-Login | Users, Roles, RolePermissions | UNIQUEIDENTIFIER |
| PRD-FirstPage | Projects, Announcements, etc. | UNIQUEIDENTIFIER |
| PRD-Overview | Questions, SubQuestions | UNIQUEIDENTIFIER |
| **PRD-Roles** | **Roles, RolePermissions** | **int AUTO INCREMENT** |
| **PRD-Announcements** | **Announcements, UserGuideFiles** | **int AUTO INCREMENT** |

**問題**：同一個 `Roles` 表在 PRD-Login 用 GUID，在 PRD-Roles 用 int。`Announcements` 在 PRD-FirstPage 用 GUID，在 PRD-Announcements 用 int。FK 連結必然衝突。

**✅ 統一決議**：全系統統一使用 **`int IDENTITY(1,1)`** 作為所有資料表的 PK。
理由：
- Blazor .NET 10 + EF Core 預設以 int 為主鍵效能最佳
- GUID 在索引排序、JOIN 效能上劣於 int
- 此系統為內部平臺，不需分散式 ID 生成

---

### 🔴 衝突 2：Roles 表結構定義不同

| 欄位 | PRD-Login | PRD-Roles |
|------|-----------|-----------|
| PK 型別 | UNIQUEIDENTIFIER | int |
| `Code` | ✅ NVARCHAR(20) UNIQUE | ❌ 不存在 |
| `Category` | ❌ 不存在 | ✅ nvarchar(20) internal/external |
| `IsSystem` | ✅ BIT DEFAULT 0 | ❌ 不存在 |
| `IsDefault` | ❌ 不存在 | ✅ bit DEFAULT 0 |

**✅ 統一決議**：合併為完整版本，保留兩邊的優點：
- 保留 `Code`（用於程式邏輯判斷，如 `TEACHER`、`REVIEWER`、`CHIEF`）
- 保留 `Category`（區分 internal/external）
- 用 `IsDefault` 取代 `IsSystem`（語義更清楚：預設角色不可刪除、權限不可改）

---

### 🔴 衝突 3：RolePermissions 權限粒度模型不同

| 面向 | PRD-Login | PRD-Roles |
|------|-----------|-----------|
| 權限辨識 | `PermissionCode` 如 `dashboard.view` | `ModuleKey` 如 `dashboard` |
| 粒度 | 功能級（view/edit/manage） | 模組級（enabled/disabled） |
| 公告特殊欄位 | ❌ | ✅ `AnnouncementPerm` (view/edit) |

**✅ 統一決議**：以 PRD-Roles 的 **模組級開關** 為主體，因為：
- 前端 Demo 實際使用 8 模組 toggle 開關，不支援細粒度
- 公告權限用 `AnnouncementPerm` 額外欄位處理 view/edit 差異
- 未來若需細粒度，可擴展 `PermissionLevel` 欄位

---

### 🔴 衝突 4：Announcements 表欄位名稱不同

| 欄位概念 | PRD-FirstPage | PRD-Announcements |
|----------|---------------|-------------------|
| 置頂 | `IsTop` | `IsPinned` |
| 狀態 | `IsPublished` (BIT) | `Status` (ENUM: draft/published/archived) |
| 分類 | `Category` (system/proposition/review/other) | `Category` (system/**compose**/review/other) |
| 下架日期 | ❌ 不存在 | ✅ `UnpublishDate` |
| 發佈日期 | `PublishedAt` (DATETIME2) | `PublishDate` (DATE) |
| 建立者 | `CreatedBy` | `AuthorId` |

**✅ 統一決議**：
- 置頂 → 用 `IsPinned`（語義更精準）
- 狀態 → 用 `Status` 三態 enum（草稿/已發佈/已下架），不用 BIT
- 分類 → 統一 category 值為 `system`/`compose`/`review`/`other`（PRD-FirstPage 的 `proposition` 改為 `compose` 以與模組 key 一致）
- 發佈日期 → 用 `PublishDate` (DATE)，另有 `PublishedAt` (DATETIME2) 記錄實際發佈時間
- 建立者 → 用 `AuthorId`

---

### 🔴 衝突 5：試題狀態碼命名不一致

| PRD-Overview 定義 | PRD-Dashboard 使用 | 問題 |
|-------------------|--------------------|------|
| `adopted` | `approved` | 同一概念不同名稱 |
| `peer_reviewing` | `cross_review` | 命名風格不同 |
| `peer_editing` | `cross_revision` | 命名風格不同 |
| — | `submitted` | Overview 無此狀態 |

**✅ 統一決議**：以 PRD-Overview 的 14 個狀態碼為正式定義（它最完整）：
```
draft → completed → pending →
peer_reviewing → peer_reviewed → peer_editing →
expert_reviewing → expert_reviewed → expert_editing →
final_reviewing → final_reviewed → final_editing →
adopted / rejected
```
PRD-Dashboard 須同步修正引用。

---

### 🔴 衝突 6：階段代碼命名風格不一致

| PRD-FirstPage (ProjectPhases) | PRD-Reviews (前端 key) |
|-------------------------------|------------------------|
| `proposition` | `proposing` |
| `cross_review` | `peerReview` |
| `cross_revision` | `peerEdit` |
| `expert_review` | `expertReview` |
| `expert_revision` | `expertEdit` |
| `chief_review` | `finalReview` |
| `chief_revision` | `finalEdit` |

**✅ 統一決議**：DB 統一使用 **snake_case**，前端顯示用 mapping 轉換：
```
proposition, cross_review, cross_revision,
expert_review, expert_revision, chief_review, chief_revision
```
PRD-Reviews 前端 camelCase 為 UI 層命名，不影響 DB。

---

### 🟡 衝突 7：ProjectMembers 單角色 vs 多角色

| PRD-FirstPage | PRD-Projects |
|---------------|--------------|
| `ProjectMembers.AssignedRoleCode` (單一值) | 新增 `ProjectMemberRoles` 關聯表（多角色） |

**✅ 統一決議**：
- **移除** `ProjectMembers.AssignedRoleCode`
- **保留** `ProjectMemberRoles` 多角色關聯表
- 理由：PRD-Projects 明確指出同一成員可在專案中同時擔任教師與互審角色

---

### 🟡 衝突 8：教師帳號建立入口描述不一致

| PRD-Login | PRD-Teachers |
|-----------|--------------|
| 「TEACHER / REVIEWER 帳號由管理者透過『角色與權限管理』建立」 | 教師透過「教師管理系統」建立 |

**✅ 統一決議**：
- **外部教師** → 由「教師管理系統」建立（自動生成 Users + Teachers 記錄）
- **內部人員** → 由「角色與權限管理 › 人員帳號管理」建立
- PRD-Login 的描述需修正

---

### 🟡 衝突 9：Users.RoleId FK 目標衝突

| PRD | Users.RoleId 指向 |
|-----|-------------------|
| PRD-Login | Roles.Id (UNIQUEIDENTIFIER) |
| PRD-Roles | Roles.Id (int) |

**✅ 統一決議**：統一為 `int` FK → `Roles.Id (int)`

---

### 🟢 注意事項：預設密碼不同

| 對象 | 預設密碼 | 來源 |
|------|---------|------|
| 內部人員 | `01024304`（公司統編） | PRD-Roles |
| 外部教師 | `Cwt2026!` | PRD-Teachers |

**✅ 非衝突**：這是有意設計，兩類帳號預設密碼不同是合理的。

---

## 二、統一資料庫結構規劃

> 所有 PK 統一為 `int IDENTITY(1,1)`
> 所有時間欄位用 `DATETIME2`，預設 `GETUTCDATE()`
> 軟刪除採 `IsDeleted` + `DeletedAt` 模式
> FK 命名慣例：`{目標表名單數}Id`

---

### 表 1：Users（使用者帳號表）

```sql
CREATE TABLE Users (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    Account         nvarchar(50)  NOT NULL UNIQUE,        -- 登入帳號
    PasswordHash    nvarchar(256) NOT NULL,
    Name            nvarchar(50)  NOT NULL,                -- 顯示名稱
    Email           nvarchar(100) NULL,
    RoleId          int           NOT NULL,                 -- FK → Roles.Id
    Category        nvarchar(20)  NOT NULL DEFAULT 'internal', -- internal/external
    CompanyTitle    nvarchar(100) NULL,                     -- 公司職稱（內部人員）
    Note            nvarchar(500) NULL,                     -- 備註
    IsActive        bit           NOT NULL DEFAULT 1,
    IsFirstLogin    bit           NOT NULL DEFAULT 1,
    RememberToken   nvarchar(256) NULL,
    RememberExpiry  datetime2     NULL,
    LastLoginAt     datetime2     NULL,
    LastProjectId   int           NULL,                     -- FK → Projects.Id
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Users_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id),
    CONSTRAINT FK_Users_LastProject FOREIGN KEY (LastProjectId) REFERENCES Projects(Id)
);
CREATE INDEX IX_Users_Account ON Users(Account);
CREATE INDEX IX_Users_RoleId ON Users(RoleId);
```

---

### 表 2：Roles（角色表）

```sql
CREATE TABLE Roles (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    Name            nvarchar(50)  NOT NULL UNIQUE,         -- 角色名稱
    Code            nvarchar(20)  NOT NULL UNIQUE,         -- 程式代碼 TEACHER/REVIEWER/CHIEF/ADMIN...
    Category        nvarchar(20)  NOT NULL,                -- internal / external
    Description     nvarchar(500) NULL,
    IsDefault       bit           NOT NULL DEFAULT 0,      -- 預設角色不可刪/不可改權限
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE()
);
```

**Seed Data:**
| Id | Name | Code | Category | IsDefault |
|----|------|------|----------|-----------|
| 1 | 命題教師 | TEACHER | external | 1 |
| 2 | 審題委員 | REVIEWER | external | 1 |
| 3 | 總召 | CHIEF | internal | 1 |
| 4 | 系統管理員 | ADMIN | internal | 0 |
| 5 | 計畫主持人 | PI | internal | 0 |
| 6 | 教務管理者 | ACADEMIC | internal | 0 |

---

### 表 3：RolePermissions（角色功能權限表）

```sql
CREATE TABLE RolePermissions (
    Id                int IDENTITY(1,1) PRIMARY KEY,
    RoleId            int           NOT NULL,              -- FK → Roles.Id
    ModuleKey         nvarchar(50)  NOT NULL,              -- dashboard/projects/overview/compose/review/teachers/roles/announcements
    IsEnabled         bit           NOT NULL DEFAULT 0,
    AnnouncementPerm  nvarchar(10)  NULL DEFAULT 'view',   -- view/edit（僅 announcements 模組使用）
    CreatedAt         datetime2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt         datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (RoleId) REFERENCES Roles(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_RolePermissions UNIQUE (RoleId, ModuleKey)
);
```

**8 個模組 Key：**
| ModuleKey | 功能名稱 |
|-----------|---------|
| `dashboard` | 命題儀表板 |
| `projects` | 命題專案管理 |
| `overview` | 命題總覽 |
| `compose` | 命題任務 |
| `review` | 審題任務 |
| `teachers` | 教師管理系統 |
| `roles` | 角色與權限管理 |
| `announcements` | 系統公告/使用說明 |

---

### 表 4：PasswordResetTokens（密碼重設 Token 表）

```sql
CREATE TABLE PasswordResetTokens (
    Id          int IDENTITY(1,1) PRIMARY KEY,
    UserId      int           NOT NULL,                    -- FK → Users.Id
    Token       nvarchar(128) NOT NULL UNIQUE,
    ExpiresAt   datetime2     NOT NULL,
    IsUsed      bit           NOT NULL DEFAULT 0,
    CreatedAt   datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_PasswordResetTokens_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);
```

---

### 表 5：LoginLogs（登入日誌表）

```sql
CREATE TABLE LoginLogs (
    Id          int IDENTITY(1,1) PRIMARY KEY,
    UserId      int           NOT NULL,                    -- FK → Users.Id
    LoginAt     datetime2     NOT NULL DEFAULT GETUTCDATE(),
    IpAddress   nvarchar(45)  NULL,
    UserAgent   nvarchar(500) NULL,
    IsSuccess   bit           NOT NULL,
    FailReason  nvarchar(100) NULL,

    CONSTRAINT FK_LoginLogs_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);
CREATE INDEX IX_LoginLogs_UserId ON LoginLogs(UserId, LoginAt DESC);
```

---

### 表 6：Projects（命題專案/梯次表）

```sql
CREATE TABLE Projects (
    Id          int IDENTITY(1,1) PRIMARY KEY,
    Code        nvarchar(20)  NOT NULL UNIQUE,             -- P2026-01
    Name        nvarchar(100) NOT NULL,
    Year        nvarchar(10)  NOT NULL,                    -- 115 (民國年)
    Status      nvarchar(20)  NOT NULL DEFAULT 'preparing', -- preparing/active/closed
    SchoolName  nvarchar(100) NULL,
    StartDate   date          NULL,
    EndDate     date          NULL,
    ClosedAt    datetime2     NULL,
    CreatedAt   datetime2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt   datetime2     NOT NULL DEFAULT GETUTCDATE()
);
```

---

### 表 7：ProjectPhases（專案階段時程表）

```sql
CREATE TABLE ProjectPhases (
    Id          int IDENTITY(1,1) PRIMARY KEY,
    ProjectId   int           NOT NULL,                    -- FK → Projects.Id
    PhaseCode   nvarchar(30)  NOT NULL,                    -- proposition/cross_review/cross_revision/...
    PhaseName   nvarchar(50)  NOT NULL,
    StartDate   date          NOT NULL,
    EndDate     date          NOT NULL,
    SortOrder   int           NOT NULL,

    CONSTRAINT FK_ProjectPhases_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ProjectPhases UNIQUE (ProjectId, PhaseCode)
);
```

**階段 Seed 格式（每個專案 7 筆）：**
| SortOrder | PhaseCode | PhaseName |
|-----------|-----------|-----------|
| 1 | `proposition` | 命題階段 |
| 2 | `cross_review` | 交互審題 |
| 3 | `cross_revision` | 互審修題 |
| 4 | `expert_review` | 專家審題 |
| 5 | `expert_revision` | 專審修題 |
| 6 | `chief_review` | 總召審題 |
| 7 | `chief_revision` | 總召修題 |

---

### 表 8：ProjectMembers（專案成員指派表）

```sql
CREATE TABLE ProjectMembers (
    Id          int IDENTITY(1,1) PRIMARY KEY,
    ProjectId   int           NOT NULL,                    -- FK → Projects.Id
    UserId      int           NOT NULL,                    -- FK → Users.Id
    CreatedAt   datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_ProjectMembers_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id),
    CONSTRAINT FK_ProjectMembers_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT UQ_ProjectMembers UNIQUE (ProjectId, UserId)
);
```

> ⚠️ 已移除 `AssignedRoleCode`，改由 `ProjectMemberRoles` 支援多角色。

---

### 表 9：ProjectMemberRoles（專案成員角色關聯表）

```sql
CREATE TABLE ProjectMemberRoles (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    ProjectMemberId int           NOT NULL,                -- FK → ProjectMembers.Id
    RoleCode        nvarchar(20)  NOT NULL,                -- TEACHER/CROSS_REVIEWER/EXPERT_REVIEWER/CHIEF/INTERNAL

    CONSTRAINT FK_PMR_ProjectMembers FOREIGN KEY (ProjectMemberId) REFERENCES ProjectMembers(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_PMR UNIQUE (ProjectMemberId, RoleCode)
);
```

---

### 表 10：ProjectTargets（專案題型目標數量表）

```sql
CREATE TABLE ProjectTargets (
    Id                  int IDENTITY(1,1) PRIMARY KEY,
    ProjectId           int           NOT NULL,            -- FK → Projects.Id
    QuestionTypeCode    nvarchar(20)  NOT NULL,            -- single/select/readGroup/...
    TargetCount         int           NOT NULL DEFAULT 0,

    CONSTRAINT FK_ProjectTargets_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_ProjectTargets UNIQUE (ProjectId, QuestionTypeCode)
);
```

---

### 表 11：MemberQuotas（人員命題配額表）

```sql
CREATE TABLE MemberQuotas (
    Id                  int IDENTITY(1,1) PRIMARY KEY,
    ProjectMemberId     int           NOT NULL,            -- FK → ProjectMembers.Id
    QuestionTypeCode    nvarchar(20)  NOT NULL,
    Quota               int           NOT NULL DEFAULT 0,

    CONSTRAINT FK_MemberQuotas_PM FOREIGN KEY (ProjectMemberId) REFERENCES ProjectMembers(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_MemberQuotas UNIQUE (ProjectMemberId, QuestionTypeCode)
);
```

---

### 表 12：QuestionTypes（題型設定表）

```sql
CREATE TABLE QuestionTypes (
    Code            nvarchar(20) PRIMARY KEY,              -- 以 Code 為 PK（唯一例外）
    Name            nvarchar(20)  NOT NULL,
    HasSubQuestions bit           NOT NULL DEFAULT 0,
    SubQuestionMode nvarchar(20)  NULL,                    -- choice/freeResponse/NULL
    HasAudio        bit           NOT NULL DEFAULT 0,
    HasPassage      bit           NOT NULL DEFAULT 0,
    PassageLabel    nvarchar(20)  NULL
);
```

**Seed Data（7 題型）：**
| Code | Name | HasSubQuestions | SubQuestionMode | HasAudio | HasPassage | PassageLabel |
|------|------|:---:|:---:|:---:|:---:|:---:|
| `single` | 一般單選題 | 0 | NULL | 0 | 0 | NULL |
| `select` | 精選單選題 | 0 | NULL | 0 | 0 | NULL |
| `longText` | 長文題目 | 0 | NULL | 0 | 0 | NULL |
| `readGroup` | 閱讀題組 | 1 | choice | 0 | 1 | 閱讀文本 |
| `shortGroup` | 短文題組 | 1 | freeResponse | 0 | 1 | 短文題幹 |
| `listen` | 聽力測驗 | 0 | NULL | 1 | 0 | NULL |
| `listenGroup` | 聽力題組 | 1 | choice | 1 | 1 | 聽力文本 |

---

### 表 13：Questions（試題母題表）

```sql
CREATE TABLE Questions (
    Id                  int IDENTITY(1,1) PRIMARY KEY,
    ProjectId           int           NOT NULL,            -- FK → Projects.Id
    QuestionCode        nvarchar(20)  NOT NULL UNIQUE,     -- Q-2603-001
    QuestionTypeCode    nvarchar(20)  NOT NULL,            -- FK → QuestionTypes.Code
    Level               nvarchar(10)  NOT NULL,            -- 初級/中級/中高級/高級/優級/難度一~五
    Difficulty          nvarchar(10)  NOT NULL,            -- easy/medium/hard
    AuthorId            int           NOT NULL,            -- FK → Users.Id
    Stem                nvarchar(MAX) NULL,                -- 題幹（HTML）
    Passage             nvarchar(MAX) NULL,                -- 閱讀文本/聽力文本
    AudioUrl            nvarchar(500) NULL,                -- 音訊檔案路徑
    Options             nvarchar(MAX) NULL,                -- JSON [{"label":"A","text":"..."},...]
    Answer              nvarchar(10)  NULL,                -- A/B/C/D
    Analysis            nvarchar(MAX) NULL,                -- 解析（HTML）
    CurrentStage        int           NOT NULL DEFAULT 1,  -- 1~7 對應階段
    Status              nvarchar(30)  NOT NULL DEFAULT 'draft',
    ReturnCount         int           NOT NULL DEFAULT 0,  -- 累計退回次數
    IsDeleted           bit           NOT NULL DEFAULT 0,
    DeletedAt           datetime2     NULL,
    CreatedAt           datetime2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt           datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Questions_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id),
    CONSTRAINT FK_Questions_Types FOREIGN KEY (QuestionTypeCode) REFERENCES QuestionTypes(Code),
    CONSTRAINT FK_Questions_Author FOREIGN KEY (AuthorId) REFERENCES Users(Id)
);
CREATE INDEX IX_Questions_ProjectId ON Questions(ProjectId);
CREATE INDEX IX_Questions_Status ON Questions(Status);
CREATE INDEX IX_Questions_AuthorId ON Questions(AuthorId);
```

**統一狀態碼（14 個）：**
| Status | 顯示標籤 | 說明 |
|--------|---------|------|
| `draft` | 草稿 | 教師命題中 |
| `completed` | 命題完成 | 教師完成但未送出 |
| `pending` | 待審 | 已提交等待分配 |
| `peer_reviewing` | 互審中 | 交互審題階段 |
| `peer_reviewed` | 互審完成 | 互審意見已提交 |
| `peer_editing` | 互審修題 | 教師依互審意見修改 |
| `expert_reviewing` | 專審中 | 專家審題階段 |
| `expert_reviewed` | 專審完成 | 專審意見已提交 |
| `expert_editing` | 專審修題 | 教師依專審意見修改 |
| `final_reviewing` | 總審中 | 總召審題階段 |
| `final_reviewed` | 總審完成 | 總審意見已提交 |
| `final_editing` | 總審修題 | 教師/總召修改 |
| `adopted` | 採用 | 試題入庫 |
| `rejected` | 不採用 | 試題淘汰 |

---

### 表 14：SubQuestions（子題表）

```sql
CREATE TABLE SubQuestions (
    Id          int IDENTITY(1,1) PRIMARY KEY,
    QuestionId  int           NOT NULL,                    -- FK → Questions.Id
    SubIndex    int           NOT NULL,                    -- 1, 2, 3...
    SubCode     char(1)       NOT NULL,                    -- A, B, C...
    Stem        nvarchar(MAX) NOT NULL,                    -- 子題題幹（HTML）
    Options     nvarchar(MAX) NULL,                        -- JSON（choice 模式）
    Answer      nvarchar(10)  NULL,                        -- A/B/C/D
    Analysis    nvarchar(MAX) NULL,                        -- 解析
    Dimension   nvarchar(20)  NULL,                        -- 向度（短文題組用）
    Indicator   nvarchar(100) NULL,                        -- 細目指標（短文題組用）
    SortOrder   int           NOT NULL DEFAULT 0,

    CONSTRAINT FK_SubQuestions_Questions FOREIGN KEY (QuestionId) REFERENCES Questions(Id) ON DELETE CASCADE,
    CONSTRAINT UQ_SubQuestions UNIQUE (QuestionId, SubIndex)
);
```

---

### 表 15：QuestionAttributes（試題屬性表）

```sql
CREATE TABLE QuestionAttributes (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    QuestionId      int           NOT NULL UNIQUE,         -- FK → Questions.Id (1:1)
    Topic           nvarchar(50)  NULL,                    -- 主類
    SubTopic        nvarchar(50)  NULL,                    -- 細目
    Mode            nvarchar(50)  NULL,                    -- 作文模式（長文）
    Genre           nvarchar(20)  NULL,                    -- 文體（長文）
    MainCategory    nvarchar(50)  NULL,                    -- 主分類（聽力）
    SubCategory     nvarchar(50)  NULL,                    -- 次分類（聽力）
    AudioType       nvarchar(20)  NULL,                    -- 音訊類型（聽力）
    Material        nvarchar(20)  NULL,                    -- 素材來源
    Competency      nvarchar(50)  NULL,                    -- 核心能力
    Indicator       nvarchar(100) NULL,                    -- 細目指標

    CONSTRAINT FK_QuestionAttributes_Questions FOREIGN KEY (QuestionId) REFERENCES Questions(Id) ON DELETE CASCADE
);
```

---

### 表 16：QuestionHistoryLogs（試題歷程軌跡表）

```sql
CREATE TABLE QuestionHistoryLogs (
    Id          int IDENTITY(1,1) PRIMARY KEY,
    QuestionId  int           NOT NULL,                    -- FK → Questions.Id
    UserId      int           NOT NULL,                    -- FK → Users.Id
    Action      nvarchar(50)  NOT NULL,                    -- create/submit/review/return/adopt/reject/edit/...
    Comment     nvarchar(MAX) NULL,
    CreatedAt   datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_QHL_Questions FOREIGN KEY (QuestionId) REFERENCES Questions(Id),
    CONSTRAINT FK_QHL_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);
CREATE INDEX IX_QHL_QuestionId ON QuestionHistoryLogs(QuestionId, CreatedAt DESC);
```

---

### 表 17：RevisionReplies（修題回覆表）

```sql
CREATE TABLE RevisionReplies (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    QuestionId      int           NOT NULL,                -- FK → Questions.Id
    ReviewStage     nvarchar(10)  NOT NULL,                -- peer/expert/final
    ReplyContent    nvarchar(MAX) NOT NULL,                -- 修題回覆內容（HTML）
    RepliedBy       int           NOT NULL,                -- FK → Users.Id
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_RevisionReplies_Questions FOREIGN KEY (QuestionId) REFERENCES Questions(Id),
    CONSTRAINT FK_RevisionReplies_Users FOREIGN KEY (RepliedBy) REFERENCES Users(Id)
);
```

---

### 表 18：ReviewAssignments（審題分配表）

```sql
CREATE TABLE ReviewAssignments (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    QuestionId      int           NOT NULL,                -- FK → Questions.Id
    ProjectId       int           NOT NULL,                -- FK → Projects.Id
    ReviewerId      int           NOT NULL,                -- FK → Users.Id
    ReviewStage     nvarchar(10)  NOT NULL,                -- peer/expert/final
    ReviewStatus    nvarchar(10)  NOT NULL DEFAULT 'pending', -- pending/decided
    Decision        nvarchar(10)  NULL,                    -- comment/adopt/revise/reject
    Comment         nvarchar(MAX) NULL,                    -- 審查意見（HTML）
    DecidedAt       datetime2     NULL,
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_RA_Questions FOREIGN KEY (QuestionId) REFERENCES Questions(Id),
    CONSTRAINT FK_RA_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id),
    CONSTRAINT FK_RA_Reviewers FOREIGN KEY (ReviewerId) REFERENCES Users(Id),
    CONSTRAINT UQ_RA UNIQUE (QuestionId, ReviewerId, ReviewStage)
);
```

---

### 表 19：ReviewReturnCounts（總審退回次數追蹤表）

```sql
CREATE TABLE ReviewReturnCounts (
    Id                  int IDENTITY(1,1) PRIMARY KEY,
    QuestionId          int           NOT NULL,            -- FK → Questions.Id
    FinalReviewerId     int           NOT NULL,            -- FK → Users.Id
    ReturnCount         int           NOT NULL DEFAULT 0,
    CanEditByReviewer   bit           NOT NULL DEFAULT 0,  -- ReturnCount ≥ 2 → 總召自行修改

    CONSTRAINT FK_RRC_Questions FOREIGN KEY (QuestionId) REFERENCES Questions(Id),
    CONSTRAINT FK_RRC_Users FOREIGN KEY (FinalReviewerId) REFERENCES Users(Id),
    CONSTRAINT UQ_RRC UNIQUE (QuestionId, FinalReviewerId)
);
```

---

### 表 20：SimilarityChecks（試題比對記錄表）

```sql
CREATE TABLE SimilarityChecks (
    Id                  int IDENTITY(1,1) PRIMARY KEY,
    SourceQuestionId    int           NOT NULL,            -- FK → Questions.Id
    ComparedQuestionId  int           NOT NULL,            -- FK → Questions.Id
    SimilarityScore     decimal(5,2)  NOT NULL,            -- 0.00~100.00
    Determination       nvarchar(20)  NOT NULL,            -- 無疑慮/低度相似/高度相似
    CheckedBy           int           NULL,                -- FK → Users.Id
    CheckedAt           datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_SC_Source FOREIGN KEY (SourceQuestionId) REFERENCES Questions(Id),
    CONSTRAINT FK_SC_Compared FOREIGN KEY (ComparedQuestionId) REFERENCES Questions(Id),
    CONSTRAINT FK_SC_User FOREIGN KEY (CheckedBy) REFERENCES Users(Id)
);
```

---

### 表 21：CannedMessages（罐頭訊息表）

```sql
CREATE TABLE CannedMessages (
    Id          int IDENTITY(1,1) PRIMARY KEY,
    Content     nvarchar(500) NOT NULL,
    SortOrder   int           NOT NULL DEFAULT 0,
    IsActive    bit           NOT NULL DEFAULT 1
);
```

---

### 表 22：Teachers（教師人才庫表）

```sql
CREATE TABLE Teachers (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    UserId          int           NOT NULL UNIQUE,         -- FK → Users.Id (1:1)
    TeacherCode     nvarchar(10)  NOT NULL UNIQUE,         -- T1001
    Gender          nvarchar(5)   NULL,
    Phone           nvarchar(20)  NULL,
    IdNumber        nvarchar(20)  NULL,                    -- 加密儲存
    School          nvarchar(100) NOT NULL,
    Department      nvarchar(50)  NULL,
    Title           nvarchar(20)  NULL,                    -- 教授/副教授/助理教授/講師/教師/兼任教師
    Expertise       nvarchar(200) NULL,
    TeachingYears   int           NULL,
    Education       nvarchar(10)  NULL,                    -- 博士/碩士/學士
    Note            nvarchar(500) NULL,
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Teachers_Users FOREIGN KEY (UserId) REFERENCES Users(Id)
);
```

---

### 表 23：Announcements（系統公告表）

```sql
CREATE TABLE Announcements (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    Category        nvarchar(20)  NOT NULL,                -- system/compose/review/other
    Status          nvarchar(20)  NOT NULL DEFAULT 'draft', -- draft/published/archived
    ProjectId       int           NULL,                    -- FK → Projects.Id，NULL = 全站廣播
    PublishDate     date          NOT NULL,                 -- 預定發佈日期
    UnpublishDate   date          NULL,                     -- 預定下架日期
    PublishedAt     datetime2     NULL,                     -- 實際發佈時間
    IsPinned        bit           NOT NULL DEFAULT 0,
    Title           nvarchar(200) NOT NULL,
    Content         nvarchar(MAX) NOT NULL,                -- HTML Rich Text
    AuthorId        int           NOT NULL,                -- FK → Users.Id
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_Announcements_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id),
    CONSTRAINT FK_Announcements_Author FOREIGN KEY (AuthorId) REFERENCES Users(Id)
);
CREATE INDEX IX_Announcements_Status ON Announcements(Status, PublishDate DESC);
CREATE INDEX IX_Announcements_ProjectId ON Announcements(ProjectId);
```

---

### 表 24：UserGuideFiles（使用說明手冊表）

```sql
CREATE TABLE UserGuideFiles (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    FileName        nvarchar(200) NOT NULL,
    FilePath        nvarchar(500) NOT NULL,
    FileSize        bigint        NOT NULL,
    UploadedBy      int           NOT NULL,                -- FK → Users.Id
    IsActive        bit           NOT NULL DEFAULT 1,
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),
    UpdatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_UserGuideFiles_Users FOREIGN KEY (UploadedBy) REFERENCES Users(Id)
);
```

---

### 表 25：UrgentReminders（急件提醒表）

```sql
CREATE TABLE UrgentReminders (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    ProjectId       int           NOT NULL,                -- FK → Projects.Id
    PhaseCode       nvarchar(30)  NOT NULL,
    TargetRoleCode  nvarchar(20)  NULL,                    -- NULL = 全角色
    TargetUserId    int           NULL,                     -- FK → Users.Id，NULL = 全員
    Message         nvarchar(500) NOT NULL,
    LinkUrl         nvarchar(200) NULL,
    IsActive        bit           NOT NULL DEFAULT 1,
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_UR_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id),
    CONSTRAINT FK_UR_Users FOREIGN KEY (TargetUserId) REFERENCES Users(Id)
);
```

---

### 表 26：AuditLogs（操作日誌表）

```sql
CREATE TABLE AuditLogs (
    Id              int IDENTITY(1,1) PRIMARY KEY,
    UserId          int           NOT NULL,                -- FK → Users.Id
    ProjectId       int           NULL,                    -- FK → Projects.Id
    Action          nvarchar(20)  NOT NULL,                -- CREATE/UPDATE/DELETE/LOGIN/LOGOUT
    TargetTable     nvarchar(50)  NULL,
    TargetId        nvarchar(50)  NULL,
    Description     nvarchar(500) NULL,
    OldValue        nvarchar(MAX) NULL,                    -- JSON
    NewValue        nvarchar(MAX) NULL,                    -- JSON
    IpAddress       nvarchar(45)  NULL,
    CreatedAt       datetime2     NOT NULL DEFAULT GETUTCDATE(),

    CONSTRAINT FK_AuditLogs_Users FOREIGN KEY (UserId) REFERENCES Users(Id),
    CONSTRAINT FK_AuditLogs_Projects FOREIGN KEY (ProjectId) REFERENCES Projects(Id)
);
CREATE INDEX IX_AuditLogs_UserId ON AuditLogs(UserId, CreatedAt DESC);
CREATE INDEX IX_AuditLogs_ProjectId ON AuditLogs(ProjectId);
```

---

## 三、資料表關聯圖（ERD Text）

```
┌─────────────────────────────────────────────────────────────────────┐
│                          核心身份層                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Roles ──1:N──► RolePermissions                                     │
│    │                                                                │
│    │ 1:N                                                            │
│    ▼                                                                │
│  Users ──1:1──► Teachers（外部教師延伸資料）                          │
│    │                                                                │
│    ├──1:N──► LoginLogs                                              │
│    ├──1:N──► PasswordResetTokens                                    │
│    └──1:N──► AuditLogs                                              │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          專案管理層                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Projects                                                           │
│    ├──1:N──► ProjectPhases（7 階段時程）                              │
│    ├──1:N──► ProjectTargets（題型目標數量）                            │
│    ├──1:N──► ProjectMembers                                         │
│    │              ├──1:N──► ProjectMemberRoles（多角色）              │
│    │              └──1:N──► MemberQuotas（命題配額）                  │
│    ├──1:N──► Announcements                                          │
│    └──1:N──► UrgentReminders                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          試題核心層                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  QuestionTypes（7 題型定義）                                         │
│    │                                                                │
│    │ 1:N                                                            │
│    ▼                                                                │
│  Questions                                                          │
│    ├──1:N──► SubQuestions（子題）                                    │
│    ├──1:1──► QuestionAttributes（擴充屬性）                          │
│    ├──1:N──► QuestionHistoryLogs（歷程軌跡）                         │
│    ├──1:N──► RevisionReplies（修題回覆）                             │
│    ├──1:N──► ReviewAssignments（審題分配）                           │
│    ├──1:N──► ReviewReturnCounts（退回次數追蹤）                       │
│    └──1:N──► SimilarityChecks（相似度比對）                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          獨立功能層                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  CannedMessages（罐頭訊息，無 FK）                                   │
│  UserGuideFiles（使用說明手冊）                                      │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 四、View / Stored Procedure 建議

### View 1：DashboardSummaryView（儀表板彙總）

```sql
CREATE VIEW DashboardSummaryView AS
SELECT
    q.ProjectId,
    q.QuestionTypeCode,
    COUNT(*)                                                    AS TotalCount,
    SUM(CASE WHEN q.Status = 'adopted' THEN 1 ELSE 0 END)     AS AdoptedCount,
    SUM(CASE WHEN q.Status IN ('peer_reviewing','peer_editing','expert_reviewing',
        'expert_editing','final_reviewing','final_editing') THEN 1 ELSE 0 END)
                                                                AS ReviewingCount,
    SUM(CASE WHEN q.Status IN ('draft','completed') THEN 1 ELSE 0 END)
                                                                AS DraftCount
FROM Questions q
WHERE q.IsDeleted = 0
GROUP BY q.ProjectId, q.QuestionTypeCode;
```

### View 2：OverdueTasksView（逾期待辦）

```sql
CREATE VIEW OverdueTasksView AS
SELECT
    q.Id AS QuestionId,
    q.ProjectId,
    q.QuestionCode,
    q.QuestionTypeCode,
    q.Status,
    q.AuthorId,
    u.Name AS AuthorName,
    pp.EndDate AS PhaseEndDate,
    DATEDIFF(DAY, pp.EndDate, GETUTCDATE()) AS OverdueDays
FROM Questions q
JOIN Users u ON u.Id = q.AuthorId
JOIN ProjectPhases pp ON pp.ProjectId = q.ProjectId
    AND pp.SortOrder = q.CurrentStage
WHERE q.IsDeleted = 0
    AND q.Status NOT IN ('adopted', 'rejected', 'draft', 'completed')
    AND pp.EndDate < CAST(GETUTCDATE() AS DATE);
```

---

## 五、待各 PRD 同步修正事項

| # | 影響 PRD | 修正內容 |
|---|---------|---------|
| 1 | PRD-Login | PK 改 int；Roles 表加 `Category`、`IsDefault`，移除 `IsSystem`；RolePermissions 改模組級；移除「教師帳號由角色管理建立」描述 |
| 2 | PRD-FirstPage | Announcements 表：`IsTop` → `IsPinned`，`IsPublished` → `Status`；ProjectMembers 移除 `AssignedRoleCode`；Category `proposition` → `compose` |
| 3 | PRD-Dashboard | 狀態碼 `approved` → `adopted`，`submitted` → `pending`，`cross_review` → `peer_reviewing` 等對齊 Overview 定義 |
| 4 | PRD-Overview | PK 改 int（已正確定義完整狀態碼，作為標準） |
| 5 | PRD-Projects | PK 改 int |
| 6 | PRD-CwtList | PK 改 int |
| 7 | PRD-Reviews | PK 改 int；前端階段 key 加上 mapping 說明 |
| 8 | PRD-Teachers | PK 改 int |
| 9 | PRD-Roles | ✅ 已是 int PK；加入 `Code` 欄位 |
| 10 | PRD-Announcements | ✅ 已是 int PK；Category `compose` 確認一致 |

---

## 六、資料表總覽（26 張表 + 2 個 View）

| # | 資料表 | 筆數量級 | 主要用途 |
|---|--------|---------|---------|
| 1 | Users | 百 | 所有使用者帳號 |
| 2 | Roles | 十 | 角色定義 |
| 3 | RolePermissions | 百 | 角色 × 模組權限 |
| 4 | PasswordResetTokens | 百 | 密碼重設 |
| 5 | LoginLogs | 萬 | 登入日誌 |
| 6 | Projects | 十 | 命題專案/梯次 |
| 7 | ProjectPhases | 百 | 專案 × 7 階段時程 |
| 8 | ProjectMembers | 百 | 專案成員指派 |
| 9 | ProjectMemberRoles | 百 | 成員多角色 |
| 10 | ProjectTargets | 百 | 專案題型目標 |
| 11 | MemberQuotas | 百 | 成員命題配額 |
| 12 | QuestionTypes | 7 | 題型定義（Seed） |
| 13 | Questions | 千 | 試題母題 |
| 14 | SubQuestions | 千 | 子題 |
| 15 | QuestionAttributes | 千 | 試題擴充屬性 |
| 16 | QuestionHistoryLogs | 萬 | 試題歷程軌跡 |
| 17 | RevisionReplies | 千 | 修題回覆 |
| 18 | ReviewAssignments | 千 | 審題分配 |
| 19 | ReviewReturnCounts | 百 | 總審退回追蹤 |
| 20 | SimilarityChecks | 千 | 相似度比對 |
| 21 | CannedMessages | 十 | 罐頭訊息 |
| 22 | Teachers | 百 | 教師人才庫 |
| 23 | Announcements | 百 | 系統公告 |
| 24 | UserGuideFiles | 十 | 使用說明手冊 |
| 25 | UrgentReminders | 百 | 急件提醒 |
| 26 | AuditLogs | 萬 | 操作日誌 |
| V1 | DashboardSummaryView | — | 儀表板彙總 |
| V2 | OverdueTasksView | — | 逾期待辦 |
