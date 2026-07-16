# EnglishPath Agent Workflow

Tài liệu này mô tả cách một AI Agent/Codex Agent phải vận hành khi triển khai dự án **EnglishPath**. Agent phải đọc file này trước khi tự động tạo story, viết code, viết test, sửa bug, review hoặc merge bất kỳ thay đổi nào.

---

## 1. Mục tiêu của workflow

EnglishPath được triển khai theo mô hình **story-based loop engineering**:

```txt
Ý tưởng / yêu cầu
→ tạo story nhỏ
→ Agent lập plan
→ Agent triển khai code
→ Agent viết test / sửa test
→ chạy checks
→ review
→ chuyển story sang review/done
→ merge về main
→ story tiếp theo
```

Không được triển khai kiểu “làm toàn bộ app một lần”. Mỗi lần chỉ xử lý **một story nhỏ**, có scope rõ ràng, có allowed paths, forbidden paths, acceptance criteria và verification commands.

---

## 2. Model routing cho Codex Agent

Agent phải dùng đúng model theo từng pha:

| Pha | Model | Reasoning | Vai trò |
|---|---|---:|---|
| Planning / story split / architecture | `gpt-5.6-sol` | `high` | Phân tích yêu cầu, chia story, kiểm tra kiến trúc |
| Implementation / coding | `gpt-5.4` | `medium` | Viết code theo story nhỏ |
| Review / testing / QA | `gpt-5.6-terra` | `medium` | Review diff, viết test, kiểm tra edge case |
| Debug khó / security / database / auth | `gpt-5.6-sol` | `high` | Dùng khi lỗi phức tạp hoặc story nhạy cảm |

Rule quan trọng:

```txt
Nếu implementation model fail 2 vòng liên tiếp:
- không tự sửa vô hạn
- chuyển sang debug model
- hoặc split story nhỏ hơn
```

---

## 3. Cấu trúc thư mục quan trọng

```txt
apps/
  web/                 # Next.js frontend
  api/                 # NestJS backend
  worker/              # worker background jobs, dùng sau

apps/api/src/
  prisma/              # PrismaService, PrismaModule
  generated/prisma/    # Prisma generated client, không sửa tay
  modules/             # business modules

stories/
  ready/               # story sẵn sàng để Agent làm
  in-progress/         # story đang được làm
  review/              # story đã code xong, chờ human review
  done/                # story đã được duyệt
  blocked/             # story bị chặn do lỗi hoặc thiếu thông tin

docs/                  # tài liệu kỹ thuật, API contract, architecture
ai-skills/             # rule nội bộ cho Agent
.agents/skills/        # BMAD / Taste / custom skills
scripts/               # automation scripts cho story loop
```

---

## 4. Nguyên tắc nhánh Git

Mỗi story phải chạy trên một branch riêng, tách từ `main`.

Đúng:

```txt
main
├── story/ep0-st001
├── story/ep0-st002
└── story/ep1-st001
```

Sai:

```txt
main
└── story/ep0-st001
    └── story/ep0-st002
```

Không chạy story mới khi đang đứng trên branch story cũ.

Trước khi chạy loop:

```powershell
git checkout main
git status --short
```

`git status --short` phải sạch. Nếu có file chưa commit/stash thì không chạy loop.

---

## 5. Story lifecycle

Một story đi qua các trạng thái sau:

```txt
stories/ready
→ stories/in-progress
→ stories/review
→ stories/done
```

Nếu lỗi không thể tự xử lý:

```txt
stories/in-progress
→ stories/blocked
```

### 5.1. ready

Story mới được đặt trong:

```txt
stories/ready/<story-id>-<short-title>.md
```

Story phải được commit trước khi chạy loop:

```powershell
git add stories/ready/<file>.md
git commit -m "chore: add <story name> story"
```

### 5.2. in-progress

Khi loop chạy, story được chuyển sang:

```txt
stories/in-progress/
```

Agent chỉ được làm đúng scope trong story.

### 5.3. review

Khi code, test, build, verify đều pass, chuyển story sang:

```txt
stories/review/
```

Sau đó commit:

```powershell
git add -A
git commit -m "<STORY-ID>: <summary>"
```

### 5.4. done

Sau khi human review approve, chuyển story sang:

```txt
stories/done/
```

Commit approve:

```powershell
git mv stories/review/<file>.md stories/done/<file>.md
git commit -m "chore: approve <STORY-ID>"
```

Sau đó merge về `main`:

```powershell
git checkout main
git merge --ff-only story/<story-id-lowercase>
```

---

## 6. Story template bắt buộc

Mỗi story phải có frontmatter và nội dung rõ ràng:

```md
---
id: EP0-ST002
title: Health Check API
status: ready
type: backend
priority: high
phase: phase-0-foundation
allowed_paths:
  - apps/api/src/modules/health/**
  - apps/api/src/app.module.ts
  - docs/08_API_CONTRACT.md
  - docs/06_BACKEND_ARCHITECTURE.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/schema.prisma
  - apps/api/src/generated/**
  - apps/web/**
  - packages/**
requires_human_approval: false
max_fix_rounds: 2
---

# Story: Health Check API

## Goal
Mô tả mục tiêu ngắn gọn.

## Business Rules
- Rule nghiệp vụ 1.
- Rule nghiệp vụ 2.

## Requirements
- Yêu cầu kỹ thuật cụ thể.

## Acceptance Criteria
- Điều kiện để story được coi là hoàn thành.

## Verification
- pnpm --filter api build
- pnpm --filter api test
- pnpm --filter web build
```

Agent không được tự ý sửa file nằm trong `forbidden_paths`.

Nếu cần sửa forbidden path, Agent phải dừng lại và chuyển story sang `blocked`, kèm lý do.

---

## 7. Cách chạy loop

Lệnh chính:

```powershell
pnpm story:loop
```

Loop chuẩn gồm các pha:

```txt
1. Pick story trong stories/ready
2. Tạo branch story/<id>
3. Chuyển story sang stories/in-progress
4. Story doctor kiểm tra frontmatter/scope
5. Planning phase bằng gpt-5.6-sol high
6. Build phase bằng gpt-5.4 medium
7. Run checks
8. Review/test phase bằng gpt-5.6-terra medium
9. Run checks lần 2
10. Verify story
11. Chuyển story sang review hoặc blocked
12. Commit kết quả
```

---

## 8. Commands kiểm tra bắt buộc

### 8.1. Full check

```powershell
node scripts/run-checks.mjs
```

### 8.2. Verify story

```powershell
node scripts/verify-story.mjs stories/in-progress/<story-file>.md
```

### 8.3. Backend checks

```powershell
pnpm --filter api lint
pnpm --filter api build
pnpm --filter api test
```

### 8.4. Frontend checks

```powershell
pnpm --filter web lint
pnpm --filter web build
```

### 8.5. Manual API check

Khi backend chạy:

```powershell
pnpm --filter api start:dev
```

Sau đó test endpoint:

```powershell
curl http://localhost:3001/api/v1/health
```

---

## 9. Backend architecture rules

Backend dùng NestJS theo module-based N-layer.

Một module backend nên có cấu trúc:

```txt
apps/api/src/modules/<module>/
  dto/
  <module>.controller.ts
  <module>.service.ts
  <module>.repository.ts
  <module>.module.ts
  <module>.controller.spec.ts
  <module>.service.spec.ts
  <module>.repository.spec.ts
```

Luồng chuẩn:

```txt
Controller
→ Service
→ Repository
→ PrismaService
→ Database
```

### Controller

Controller chỉ xử lý:

```txt
HTTP route
DTO input/output
status code
calling service
```

Không đặt business logic phức tạp trong controller.

### Service

Service xử lý:

```txt
business rules
validation nghiệp vụ
orchestration
error mapping
```

### Repository

Repository xử lý:

```txt
database query
Prisma access
mapping data thô nếu cần
```

### Prisma

- Dùng `PrismaService`.
- Không tạo PrismaClient mới trong từng module.
- Không sửa tay `apps/api/src/generated/**`.
- Không commit `.env`.
- Không expose `DATABASE_URL`, host, username, password trong API response/log.

---

## 10. Frontend architecture rules

Frontend dùng Next.js + TypeScript + Tailwind, định hướng FSD/Atomic nhẹ.

Nguyên tắc:

```txt
app/       # route-level pages/layout
features/  # feature-specific UI and logic
entities/  # domain entity UI/model nếu cần
shared/    # reusable UI, utils, constants
```

UI story phải xử lý đủ trạng thái:

```txt
loading
empty
error
success
unauthorized nếu liên quan auth
```

Không hardcode API key hoặc secret trong frontend.

Nếu cần gọi AI, frontend phải gọi backend AI Gateway, không gọi trực tiếp provider.

---

## 11. Phương thức viết testcase

Agent phải viết test theo nguyên tắc:

```txt
Test business rule trước
Test happy path
Test edge case
Test error path
Không mock quá mức làm test vô nghĩa
Không bỏ test chỉ để pass
```

### 11.1. Backend unit test

Dùng Jest. Mỗi layer test theo trách nhiệm riêng.

#### Service test

Service test nên mock repository, không gọi DB thật.

Ví dụ pattern:

```ts
describe('VocabularyService', () => {
  let service: VocabularyService;
  let repository: jest.Mocked<VocabularyRepository>;

  beforeEach(async () => {
    repository = {
      findById: jest.fn(),
      create: jest.fn(),
    } as unknown as jest.Mocked<VocabularyRepository>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        VocabularyService,
        { provide: VocabularyRepository, useValue: repository },
      ],
    }).compile();

    service = moduleRef.get(VocabularyService);
  });

  it('creates vocabulary when input is valid', async () => {
    repository.create.mockResolvedValue({ id: 'vocab_1', word: 'apple' });

    await expect(service.create({ word: 'apple' })).resolves.toEqual({
      id: 'vocab_1',
      word: 'apple',
    });

    expect(repository.create).toHaveBeenCalledWith({ word: 'apple' });
  });
});
```

#### Controller test

Controller test mock service, chỉ kiểm tra route handler gọi đúng service và trả response đúng shape.

```ts
describe('HealthController', () => {
  it('returns health response', async () => {
    service.getHealth.mockResolvedValue({
      status: 'ok',
      api: 'running',
      database: 'connected',
      timestamp: '2026-07-16T00:00:00.000Z',
    });

    await expect(controller.getHealth()).resolves.toMatchObject({
      status: 'ok',
      api: 'running',
    });
  });
});
```

#### Repository test

Repository test mock `PrismaService`, không dùng database thật trong unit test.

```ts
describe('HealthRepository', () => {
  it('checks database connectivity', async () => {
    prisma.$queryRaw = jest.fn().mockResolvedValue([{ result: 1 }]);

    await expect(repository.checkDatabase()).resolves.toBe(true);
  });
});
```

### 11.2. Integration / e2e test

Chỉ viết e2e khi story yêu cầu endpoint behavior thật.

E2E nên kiểm tra:

```txt
HTTP method
URL
status code
response body shape
validation error
permission nếu có auth
```

Không dùng production database cho e2e.

### 11.3. Frontend test

Khi frontend test được setup, mỗi UI story nên có test cho:

```txt
render success state
render loading state
render empty state
render error state
user interaction chính
```

Nếu chưa có test framework frontend, ít nhất phải pass:

```powershell
pnpm --filter web lint
pnpm --filter web build
```

### 11.4. Test naming convention

Tên test nên mô tả nghiệp vụ:

Đúng:

```txt
returns degraded health status when database is disconnected
prevents booking when weekly mentor quota is exceeded
hides answer key during active TOEIC mock test
```

Sai:

```txt
works
should be ok
test service
```

---

## 12. Quy trình sửa bug kỹ thuật

Khi gặp bug kỹ thuật, Agent phải làm theo thứ tự:

```txt
1. Reproduce lỗi
2. Xác định command fail
3. Đọc stack trace
4. Xác định file liên quan
5. Viết hoặc cập nhật test tái hiện lỗi nếu hợp lý
6. Sửa nhỏ nhất có thể
7. Chạy lại test liên quan
8. Chạy full checks
9. Ghi lại nguyên nhân trong summary
```

Không được sửa lan rộng nếu chưa cần.

Ví dụ:

```txt
Bug: api test fail do mock Prisma thiếu method
→ sửa mock trong spec
→ không sửa Prisma schema
→ không bỏ test
```

---

## 13. Quy trình sửa bug nghiệp vụ

Bug nghiệp vụ là bug khi code chạy được nhưng hành vi sai rule.

Ví dụ:

```txt
- Cho phép học viên xem answer key khi TOEIC test đang chạy
- Cho phép book quá quota mentor
- Tính điểm writing sai rubric
- Health endpoint expose thông tin DB nhạy cảm
```

Agent phải xử lý theo quy trình:

```txt
1. Xác định business rule bị vi phạm
2. Tìm nguồn rule trong story / PRD / docs
3. Nếu rule chưa rõ, chuyển story sang blocked hoặc yêu cầu làm rõ
4. Viết failing test thể hiện rule đúng
5. Sửa service/domain logic
6. Chạy test liên quan
7. Cập nhật docs/API contract nếu behavior public thay đổi
8. Chạy full checks
```

### 13.1. Bug story template

```md
---
id: BUG-EP1-001
title: Prevent answer key access during active TOEIC test
status: ready
type: bugfix
priority: high
allowed_paths:
  - apps/api/src/modules/toeic/**
  - docs/08_API_CONTRACT.md
forbidden_paths:
  - apps/api/.env
  - apps/api/prisma/schema.prisma
requires_human_approval: false
max_fix_rounds: 2
---

# Bug: Prevent answer key access during active TOEIC test

## Problem
Mô tả hành vi sai.

## Expected Business Rule
Trong lúc TOEIC mock test đang diễn ra, user không được xem answer key.

## Reproduction
1. Start mock test.
2. Call answer endpoint.
3. Current result: answer is visible.
4. Expected result: request is rejected.

## Acceptance Criteria
- Answer key is hidden during active test.
- Test covers the blocked behavior.
- Existing completed-test review still works.

## Verification
- pnpm --filter api test
- pnpm --filter api build
```

---

## 14. Quy trình khi loop fail

Khi `pnpm story:loop` fail, không chạy lại ngay. Làm theo thứ tự:

```powershell
git status --short
git branch --show-current
dir stories\in-progress
dir stories\review
dir stories\blocked
```

Sau đó chạy lệnh bị fail riêng:

```powershell
pnpm --filter api build
pnpm --filter api test
pnpm --filter web build
node scripts/run-checks.mjs
```

### 14.1. Nếu code đã gần đúng

Sửa lỗi nhỏ, chạy checks, verify story thủ công:

```powershell
node scripts/run-checks.mjs
node scripts/verify-story.mjs stories/in-progress/<story-file>.md
```

Nếu pass:

```powershell
git mv stories\in-progress\<story-file>.md stories\review\<story-file>.md
git add -A
git commit -m "<STORY-ID>: <summary>"
```

### 14.2. Nếu lỗi do script loop

Không sửa feature code vội. Sửa script trên `main` nếu cần, rồi chạy lại story từ `ready`.

### 14.3. Nếu story bị chuyển sang blocked do lỗi tạm thời

Nếu lỗi do môi trường/script chứ không do requirement, có thể đưa story về `ready`:

```powershell
git mv stories\blocked\<story-file>.md stories\ready\<story-file>.md
git commit -m "chore: reset <STORY-ID> to ready"
```

---

## 15. Review checklist

Trước khi story được chuyển sang `review`, Agent phải kiểm tra:

```txt
Scope:
- Có làm đúng story không?
- Có sửa file ngoài allowed_paths không?
- Có đụng forbidden_paths không?

Architecture:
- Backend có đúng controller/service/repository không?
- Frontend có đúng component boundary không?
- Có hardcode logic sai chỗ không?

Tests:
- Có unit test cho business rule không?
- Có test error/edge case quan trọng không?
- Có bỏ test để pass không?

Security:
- Có expose secret không?
- Có commit .env không?
- Có gọi AI provider trực tiếp từ frontend không?

Docs:
- API contract có cập nhật nếu endpoint thay đổi không?
- Architecture docs có cập nhật nếu thêm module/layer không?

Commands:
- api lint/build/test pass?
- web lint/build pass?
- run-checks pass?
- verify-story pass?
```

---

## 16. Commit convention

### Thêm story

```txt
chore: add health check API story
```

### Implement story

```txt
EP0-ST002: implement health check API
```

### Approve story

```txt
chore: approve EP0-ST002
```

### Fix bug

```txt
BUG-EP1-001: prevent answer key access during active test
```

### Sửa automation

```txt
fix: support current codex exec flags
```

---

## 17. Không được làm

Agent không được:

```txt
- Commit .env hoặc secrets
- Sửa Prisma generated client bằng tay
- Sửa quá scope story
- Xóa test để pass
- Tự ý đổi architecture đã chốt
- Tự ý thêm thư viện lớn khi không có story
- Tự ý đổi database schema khi story không cho phép
- Gọi AI provider trực tiếp từ frontend
- Viết endpoint trả dữ liệu nhạy cảm
- Chạy destructive command như git reset --hard nếu chưa được phép
```

---

## 18. Khi cần tạo story mới

Story mới phải nhỏ và kiểm tra được.

Ưu tiên thứ tự:

```txt
Foundation
→ Health/API base
→ Auth skeleton
→ User module
→ Vocabulary module
→ Quiz/Daily deck
→ Listening
→ TOEIC mock
→ Writing AI
→ Speaking AI
→ Admin CMS
```

Một story tốt thường chỉ sửa 3–8 file chính, có test rõ ràng, có verification command.

Nếu story quá lớn, split thành nhiều story nhỏ:

```txt
Sai:
Build full Vocabulary feature

Đúng:
EP1-ST001 Vocabulary DB model
EP1-ST002 Vocabulary API CRUD
EP1-ST003 Vocabulary list UI
EP1-ST004 Vocabulary quiz card UI
EP1-ST005 Vocabulary spaced repetition logic
```

---

## 19. Definition of Done

Một story chỉ được coi là hoàn thành khi:

```txt
- Code đúng acceptance criteria
- Không sửa forbidden paths
- Không còn untracked file ngoài ý muốn
- Tests phù hợp đã được thêm/cập nhật
- pnpm --filter api build pass nếu backend đổi
- pnpm --filter api test pass nếu backend đổi
- pnpm --filter web build pass nếu frontend đổi
- node scripts/run-checks.mjs pass
- node scripts/verify-story.mjs pass
- Story được chuyển sang stories/review hoặc stories/done theo đúng trạng thái
- Commit message đúng convention
```

---

## 20. Quick command reference

### Start new story

```powershell
git checkout main
git status --short
git add stories/ready/<story>.md
git commit -m "chore: add <story>"
pnpm story:loop
```

### Check current state after failure

```powershell
git status --short
git branch --show-current
dir stories\in-progress
dir stories\review
dir stories\blocked
```

### Finish story manually after checks pass

```powershell
node scripts/run-checks.mjs
node scripts/verify-story.mjs stories/in-progress/<story>.md
git mv stories\in-progress\<story>.md stories\review\<story>.md
git add -A
git commit -m "<STORY-ID>: <summary>"
```

### Approve and merge

```powershell
git mv stories\review\<story>.md stories\done\<story>.md
git commit -m "chore: approve <STORY-ID>"
git checkout main
git merge --ff-only story/<story-id-lowercase>
git branch -d story/<story-id-lowercase>
```

---

## 21. Final instruction for Agent

Khi đọc file này, Agent phải ưu tiên:

```txt
1. Safety
2. Small scope
3. Passing tests
4. Business correctness
5. Clear docs
6. Clean Git history
```

Nếu không chắc, Agent phải dừng lại, ghi rõ blocker, không đoán bừa và không sửa lan rộng.
