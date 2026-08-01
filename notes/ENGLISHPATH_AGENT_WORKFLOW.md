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
→ merge về dev
→ human promote lên main
→ story tiếp theo
```

Không được triển khai kiểu “làm toàn bộ app một lần”. Mỗi lần chỉ xử lý **một story nhỏ**, có scope rõ ràng, có allowed paths, forbidden paths, acceptance criteria và verification commands.

---

## 2. Model routing cho Codex Agent

Agent phải dùng đúng model theo từng pha:

| Pha | Model | Reasoning | Vai trò |
|---|---|---:|---|
| Planning / story split / architecture | `gpt-5.6-sol` | `high` | Phân tích yêu cầu, chia story, kiểm tra kiến trúc |
| Implementation / coding | `gpt-5.6-luna` | `medium` | Viết code theo story nhỏ |
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
  web/
  api/
  worker/

apps/api/src/
  prisma/
  generated/prisma/
  modules/

stories/
  ready/
  in-progress/
  review/
  done/
  blocked/

docs/
ai-skills/
.agents/skills/
scripts/
```

---

## 4. Nguyên tắc nhánh Git

Mỗi story phải chạy trên một branch riêng, tách từ `dev`.

Đúng:

```txt
dev
├── story/ep0-st001
├── story/ep0-st002
└── story/ep1-st001
```

Sai:

```txt
dev
└── story/ep0-st001
    └── story/ep0-st002
```

Không chạy story mới khi đang đứng trên branch story cũ.

Trước khi chạy loop:

```powershell
git checkout dev
git status --short
```

`git status --short` phải sạch. Nếu có file chưa commit hoặc stash thì không chạy loop. `dev` cũng phải đồng bộ với upstream tracking branch trước khi tạo story branch.

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

Story mới được đặt trong `stories/ready/<story-id>-<short-title>.md` và phải được commit trước khi chạy loop.

### 5.2. in-progress

Khi loop chạy, story được chuyển sang `stories/in-progress/` và frontmatter status phải đồng bộ với lifecycle folder.

### 5.3. review

Khi code, test, build, verify đều pass, chuyển story sang `stories/review/` rồi commit:

```powershell
git add -A
git commit -m "<STORY-ID>: <summary>"
```

### 5.4. done

Sau khi human review approve, chuyển story sang `stories/done/`:

```powershell
git mv stories/review/<file>.md stories/done/<file>.md
git commit -m "chore: approve <STORY-ID>"
```

Promotion từ `dev` lên `main` là bước production và phải do human kiểm soát. Automation không được tự checkout hoặc merge vào `main`.

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
```

Agent không được tự ý sửa file nằm trong `forbidden_paths`.

---

## 7. Cách chạy loop

Lệnh chính:

```powershell
pnpm story:loop
```

Loop chuẩn gồm các pha:

1. Pick story trong `stories/ready`
2. Confirm đang ở `dev`, worktree sạch, và `dev` đồng bộ upstream
3. Tạo branch `story/<id>` từ `dev`
4. Chuyển story sang `stories/in-progress` và đồng bộ frontmatter status
5. Story doctor kiểm tra frontmatter, scope, lifecycle
6. Planning phase bằng `gpt-5.6-sol` high
7. Build phase bằng `gpt-5.6-luna` medium
8. Run checks
9. Review/test phase bằng `gpt-5.6-terra` medium
10. Run checks lần 2
11. Verify story bằng changed files từ committed, staged, unstaged, untracked
12. Chuyển story sang review hoặc blocked và đồng bộ frontmatter status
13. Commit kết quả
14. Fast-forward merge story branch về `dev`

---

## 8. Commands kiểm tra bắt buộc

```powershell
node scripts/run-checks.mjs
node scripts/verify-story.mjs stories/in-progress/<story-file>.md
pnpm story:test
```

---

## 9. Quy trình khi loop fail

Khi `pnpm story:loop` fail, kiểm tra:

```powershell
git status --short
git branch --show-current
dir stories\in-progress
dir stories\review
dir stories\blocked
```

Nếu lỗi do script loop, sửa script trên `dev` rồi chạy lại story từ `ready`. Không sửa lan sang feature ngoài scope story.

Nếu story bị blocked do business, dependency, infrastructure, security, hoặc environment decision, phải tạo file structured request dưới `notes/ai-req/`.

---

## 10. Review checklist

Trước khi story được chuyển sang `review`, Agent phải kiểm tra:

```txt
Scope:
- Có làm đúng story không?
- Có sửa file ngoài allowed_paths không?
- Có đụng forbidden_paths không?

Architecture:
- Có giữ boundary phù hợp với loại story không?
- Có hardcode logic sai chỗ không?

Tests:
- Có test cho business rule / path policy / edge case quan trọng không?
- Có bỏ test để pass không?

Security:
- Có expose secret không?
- Có commit .env không?

Commands:
- run-checks pass?
- verify-story pass?
- story:test pass?
```

---

## 11. Quick command reference

### Start new story

```powershell
git checkout dev
git status --short
git add stories/ready/<story>.md
git commit -m "chore: add <story>"
pnpm story:loop
```

### Finish story manually after checks pass

```powershell
node scripts/run-checks.mjs
node scripts/verify-story.mjs stories/in-progress/<story>.md
git mv stories\in-progress\<story>.md stories\review\<story>.md
git add -A
git commit -m "<STORY-ID>: <summary>"
```

### Approve on `dev`

Loop đã fast-forward merge commit hoàn tất của story về `dev`. Sau khi human review approve, chỉ chuyển story từ `review` sang `done` và commit approval ngay trên `dev`:

```powershell
git branch --show-current
git mv stories\review\<story>.md stories\done\<story>.md
git add -A -- stories
git commit -m "chore: approve <STORY-ID>"
```

---

## 12. Final instruction for Agent

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

---

## 13. Noninteractive phase contracts

Mỗi pha `plan`, `build`, `review`, `debug` phải tự kết thúc mà không chờ human input.

Rules:

```txt
- Không hỏi confirm, approve, checkpoint, hay "shall I continue?"
- Mỗi pha phải ghi final response artifact riêng
- Exit code 0 không đủ để xem là pass
- Final response phải là terminal result hợp lệ cho đúng phase
```

Artifact mặc định:

```txt
plan   -> .codex-plan.result.md + .codex-plan.md
build  -> .codex-build.result.md
review -> .codex-review.result.md
debug  -> .codex-debug.result.md
```

Contract theo phase:

```txt
plan:
- phải tạo .codex-plan.md mới
- plan phải chứa story id và đủ 8 section bắt buộc

build:
- final response phải có `Status: completed` hoặc `Status: blocked`

review:
- final response phải có `Status: pass` hoặc `Status: blocked`; review là read-only
  và không tự sửa code
- automation không được nạp checkpoint review skill body vào prompt review

debug:
- final response phải có `Status: fixed` hoặc `Status: blocked`
```

Timeout được cấu hình trong `scripts/codex-models.json` theo từng phase. Nếu timeout xảy ra, lỗi phải ghi rõ tên phase và thời lượng timeout, đồng thời giữ lại stdout, stderr và final response artifact để debug.

Retry flow:

```txt
- timeout hoặc incomplete result -> vào bounded debug retry flow
- blocked result hợp lệ -> dừng ngay và chuyển story sang blocked
- debug trả blocked -> không retry thêm
```
