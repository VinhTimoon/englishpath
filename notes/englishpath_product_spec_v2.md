# EnglishPath — Tài liệu mô tả nghiệp vụ, kiến trúc và stack triển khai End-to-End

**Phiên bản:** 2.0
**Ngày tạo:** 2026-06-21
**Cập nhật định hướng:** 2026-07-17
**Định hướng:** Nền tảng học tiếng Anh toàn diện cho người Việt, miễn phí là trọng tâm; TOEIC 2 kỹ năng và TOEIC 4 kỹ năng là các learning track chính; có lộ trình cá nhân hóa, kho nội dung được cấp quyền, AI, game hóa, SEO và khả năng mở rộng sang mobile app.
**Mục tiêu kỹ thuật ban đầu:** phục vụ ổn định khoảng 300–500 người dùng đồng thời, có khả năng mở rộng theo traffic thật.

---

## Nhật ký cập nhật phiên bản 2.0

- Giữ nguyên định hướng nền tảng học tiếng Anh toàn diện.
- Xác định TOEIC 2 kỹ năng và TOEIC 4 kỹ năng là nghiệp vụ chính.
- Bổ sung TOEIC Speaking & Writing.
- Bổ sung Vocabulary Mindmap/Knowledge Graph.
- Bổ sung kho nội dung được cấp quyền và Google Drive Content Pipeline.
- Bổ sung learning tracks, route map và trải nghiệm guest.
- Điều chỉnh thứ tự phase để TOEIC xuất hiện sớm hơn.
- Bổ sung Product Scope Guard cho Agent.
- Không triển khai một IELTS exam platform riêng trong phạm vi hiện tại.

---


## 1. Tóm tắt sản phẩm

EnglishPath là nền tảng học tiếng Anh toàn diện dành cho người Việt, giúp người học ở nhiều trình độ đi theo một lộ trình rõ ràng và đạt tiến bộ đo được trong khoảng 30–120 ngày. Sản phẩm không chỉ là kho bài học hoặc website giải đề, mà là một hệ sinh thái học tập kết nối nội dung, luyện tập, sửa lỗi, đánh giá và cá nhân hóa.

TOEIC là một trục nghiệp vụ chính của sản phẩm, bao gồm:

- TOEIC Listening & Reading (2 kỹ năng).
- TOEIC Speaking & Writing.
- Lộ trình TOEIC 4 kỹ năng.
- Luyện theo Part, chủ đề, kỹ năng yếu, mini test và full test.
- Phân tích điểm, thời gian làm bài, lỗi lặp lại và gợi ý cải thiện.

Bên cạnh TOEIC, EnglishPath vẫn giữ định hướng ban đầu là hỗ trợ học tiếng Anh nền tảng, giao tiếp, tiếng Anh công việc, từ vựng, ngữ pháp và luyện nghe–nói–đọc–viết. Các tài liệu IELTS, tiếng Anh học thuật hoặc nguồn tiếng Anh khác có thể được sử dụng như nội dung học được cấp quyền hoặc nguồn tham khảo, nhưng không làm thay đổi trọng tâm sản phẩm thành một nền tảng luyện thi IELTS.

Hệ sinh thái gồm:

- Từ vựng tổng thể chia theo trình độ, chủ đề, độ thông dụng và mục tiêu học.
- Quiz card/game hóa tương tự Duolingo để học hằng ngày.
- Lộ trình học tự động theo mục tiêu, không quá 30/60/90/120 ngày.
- Luyện nghe với audio do hệ thống quản trị cung cấp, có transcript, phân loại và nhiều dạng luyện nghe.
- Luyện nói với AI teacher trong phòng nói ảo.
- Luyện viết với AI Writing Coach, dùng RAG/Graph-RAG để chấm điểm và phản hồi cá nhân hóa.
- Luyện đề TOEIC, mini test, full test, exam mode có timer và cơ chế giảm gian lận.
- Rèn luyện câu nói hằng ngày để người học dùng được tiếng Anh trong đời sống.
- Error Notebook lưu lỗi sai và đưa lỗi quay lại lịch ôn tập.
- News/Blog/SEO để kéo traffic tự nhiên, đồng thời biến tin tức thành bài học tương tác.
- Free-first community, ưu tiên trải nghiệm miễn phí đủ dùng thật sự.

Triết lý sản phẩm:

> Học ít nhưng đúng hướng mỗi ngày. Dễ bắt đầu, khó bỏ cuộc, có tiến bộ đo được.

### 1.1. Định vị sản phẩm đã chốt

> EnglishPath là nền tảng học tiếng Anh toàn diện cho người Việt, trong đó TOEIC 2 kỹ năng và TOEIC 4 kỹ năng là các learning track được đầu tư chuyên sâu.

EnglishPath không bị giới hạn thành một website luyện đề TOEIC, đồng thời cũng không triển khai dàn trải thành nền tảng luyện mọi kỳ thi quốc tế. Sản phẩm phục vụ các mục tiêu:

1. Học lại nền tảng tiếng Anh.
2. Cải thiện giao tiếp và phản xạ.
3. Cải thiện toàn diện bốn kỹ năng.
4. Ôn TOEIC Listening & Reading.
5. Ôn TOEIC Speaking & Writing.
6. Ôn TOEIC 4 kỹ năng.
7. Học tiếng Anh phục vụ công việc.

Các chức năng dùng chung như từ vựng, ngữ pháp, listening, speaking, writing, error notebook và spaced repetition phải được tái sử dụng giữa các learning track thay vì xây thành các hệ thống tách rời.

### 1.2. Điểm khác biệt cốt lõi

- Free-first: người dùng miễn phí vẫn có thể học và tạo tiến bộ thật.
- TOEIC chuyên sâu nhưng không bỏ học tiếng Anh tổng quát.
- Roadmap 30/60/90/120 ngày, ưu tiên kết quả đo được sau 1–3 tháng.
- Mindmap từ vựng theo topic, subtopic, collocation và kỹ năng liên quan.
- Một nội dung có thể liên kết với vocabulary, listening, speaking, writing và TOEIC Part.
- Error-driven learning: lỗi sai phải quay lại lịch học.
- Kho tài liệu và video đã được cấp quyền, được chuẩn hóa thành lesson, quiz và learning asset.
- AI là lớp hỗ trợ giải thích, phản hồi và cá nhân hóa; không thay thế rule engine, đáp án chuẩn hoặc quy trình duyệt nội dung.

---

## 2. Phạm vi sản phẩm

### 2.1. In-scope

Các phần cần nằm trong sản phẩm end-to-end:

1. Website public có SEO.
2. Trang tin tức/blog tiếng Anh.
3. Hệ thống đăng ký/đăng nhập.
4. Onboarding xác định mục tiêu và trình độ.
5. Placement test đầu vào.
6. Lộ trình học cá nhân hóa tối đa 4 tháng.
7. Từ vựng tổng thể.
8. Quiz card/game hóa.
9. Luyện nghe.
10. Luyện nói AI.
11. Luyện viết AI.
12. TOEIC Listening & Reading: luyện Part 1–7, mini test, half test và full test.
13. TOEIC Speaking & Writing và lộ trình TOEIC 4 kỹ năng.
14. Exam mode chống gian lận tương đối.
15. Daily English sentences.
16. Error notebook.
17. Dashboard tiến độ.
18. Leaderboard/streak/XP/badge.
19. CMS quản trị nội dung.
20. Kho tài liệu/video/audio được cấp quyền.
21. Pipeline nhập nội dung từ Google Drive.
22. Quản lý người dùng.
23. Quản lý gói miễn phí/premium sau này.
24. Tích hợp analytics, monitoring, logging.
25. Bảo mật API key và third-party services.
26. Cơ sở hạ tầng production.
27. Lộ trình mở rộng sang mobile.

### 2.2. Out-of-scope giai đoạn đầu

Những phần không nên làm ngay trong MVP đầu tiên:

- Livestream class thật.
- Mentor người thật review bài không giới hạn.
- Marketplace bán khóa học.
- App mobile native ngay từ ngày đầu.
- Proctoring chuyên nghiệp bằng camera, screen recording.
- Clone đầy đủ Duolingo ở mức animation/game phức tạp.
- Tự động crawl đề thi/khóa học bản quyền.

### 2.3. Quản trị quyền sử dụng nội dung

Dự án đã có quyền sử dụng đối với một số tài liệu và video lưu trên Google Drive. Các nội dung này có thể được dùng để cung cấp bài học, video, audio, transcript, quiz hoặc tài liệu luyện tập trong phạm vi quyền đã được cấp.

Tuy vậy, mỗi tài nguyên vẫn phải được quản trị bằng metadata để tránh sử dụng vượt phạm vi:

```text
source_type
source_name
source_file_id
content_owner
license_status
usage_scope
allowed_actions
access_tier
review_status
publish_status
license_expiration
```

Các trạng thái đề xuất:

```text
SELF_CREATED
PUBLIC_DOMAIN
OPEN_LICENSE
LICENSED
REFERENCE_ONLY
UNKNOWN
RESTRICTED
```

`LICENSED` cần ghi rõ các quyền cụ thể:

- Có được phát trực tuyến hay không.
- Có được cho tải xuống hay không.
- Có được cắt thành lesson nhỏ hay không.
- Có được tạo transcript, bản dịch và quiz hay không.
- Có giới hạn số người dùng, thời gian hoặc phạm vi thương mại hay không.
- Có được dùng cho AI retrieval, embedding hoặc tạo nội dung phái sinh hay không.

Quy tắc xuất bản:

- Nội dung chỉ được publish khi `review_status = APPROVED`.
- Nội dung `REFERENCE_ONLY`, `UNKNOWN` hoặc `RESTRICTED` không được hiển thị công khai.
- Tài liệu IELTS hoặc kỳ thi khác có thể được dùng làm nội dung học tiếng Anh đã cấp quyền, nhưng không tự động biến EnglishPath thành nền tảng luyện thi kỳ thi đó.

---

## 3. Đối tượng người dùng

### 3.1. Guest

Người chưa đăng nhập.

Có thể:

- Xem trang chủ.
- Đọc blog/news.
- Làm quiz demo.
- Xem roadmap mẫu.
- Học thử một số từ vựng/câu hằng ngày.
- Xem bảng giá nếu có.

Không thể:

- Lưu tiến độ.
- Làm full test.
- Dùng AI nhiều lượt.
- Truy cập error notebook.

### 3.1.1. Mục tiêu học được chọn khi onboarding

Người dùng có thể chọn một mục tiêu chính:

```text
ENGLISH_FOUNDATION
DAILY_COMMUNICATION
FOUR_SKILL_ENGLISH
WORKPLACE_ENGLISH
TOEIC_LISTENING_READING
TOEIC_SPEAKING_WRITING
TOEIC_FOUR_SKILLS
```

Có thể chọn thêm mục tiêu phụ, nhưng roadmap phải luôn có một mục tiêu chính để tránh dàn trải.

### 3.2. Free User

Người dùng đăng ký miễn phí.

Có thể:

- Làm onboarding.
- Có dashboard cá nhân.
- Học daily vocabulary.
- Làm quiz card giới hạn hợp lý.
- Học câu nói hằng ngày.
- Luyện nghe cơ bản.
- Làm mini test.
- Lưu lỗi sai giới hạn.
- Dùng AI writing/speaking quota thấp.
- Đọc toàn bộ blog/news miễn phí.
- Tham gia leaderboard/community.

### 3.3. Premium User sau này

Không phải trọng tâm ban đầu, nhưng cần thiết kế sẵn.

Có thể:

- AI speaking nhiều hơn.
- AI writing nhiều hơn.
- Graph-RAG feedback nâng cao.
- Full mock test nhiều đề hơn.
- Analytics chi tiết.
- Lưu lỗi sai không giới hạn.
- Roadmap cá nhân hóa sâu hơn.
- Mobile offline learning.
- Gói ôn thi TOEIC chuyên sâu.

### 3.4. Content Editor

Có thể:

- Tạo/sửa bài học.
- Tạo/sửa từ vựng.
- Tạo/sửa quiz.
- Tạo/sửa bài blog/news.
- Upload audio.
- Gắn transcript.
- Gắn level/topic/skill.

Không thể:

- Xem thông tin nhạy cảm người dùng.
- Quản lý billing.
- Sửa quyền admin.

### 3.5. Admin

Có toàn quyền quản trị:

- Quản lý user.
- Quản lý role/permission.
- Quản lý content.
- Quản lý question bank.
- Quản lý AI quota.
- Quản lý report vi phạm.
- Quản lý payment/subscription.
- Xem system metrics.
- Xem audit logs.

---

## 4. Hệ thống lộ trình học

### 4.1. Nguyên tắc roadmap

Mỗi roadmap chính không được vượt quá 4 tháng.

Các template chuẩn:

| Roadmap | Thời lượng | Dành cho |
|---|---:|---|
| Sprint 30 ngày | 30 ngày | Người có nền, ôn gấp |
| Standard 60 ngày | 60 ngày | Muốn tăng điểm nhanh hoặc học mục tiêu nhỏ |
| Core 90 ngày | 90 ngày | Phần lớn người học |
| Foundation 120 ngày | 120 ngày | Mất gốc hoặc học toàn diện |

### 4.2. Đầu vào để tạo roadmap

- Mục tiêu học: TOEIC, giao tiếp, nghe nói, viết, mất gốc.
- Trình độ hiện tại.
- Điểm placement test.
- Thời gian học mỗi ngày.
- Deadline.
- Skill yếu.
- Skill ưu tiên.
- Tần suất học mong muốn.
- Tài nguyên hệ thống có sẵn.

### 4.3. Cấu trúc roadmap

Một roadmap gồm nhiều phase:

1. Foundation.
2. Skill Building.
3. Practice & Correction.
4. Simulation & Final Review.

Ví dụ roadmap 90 ngày cho TOEIC 650:

```text
Ngày 1-15:
- TOEIC Core Vocabulary
- Grammar Part 5 cơ bản
- Listening Part 1, Part 2
- Daily English sentences

Ngày 16-35:
- Listening Part 3
- Reading Part 6
- Vocabulary chủ đề Office/Business
- Mini test 2 lần/tuần

Ngày 36-60:
- Listening Part 4
- Reading Part 7
- Paraphrase
- Error notebook
- Timed practice

Ngày 61-80:
- Full test
- Chữa đề
- Tập trung skill yếu
- Tăng tốc làm bài

Ngày 81-90:
- Review lỗi sai
- Full test mô phỏng
- Ôn từ vựng
- Chiến thuật phòng thi
```

### 4.3.1. Roadmap theo learning track

Các template chính:

- English Foundation 60/90/120 ngày.
- Daily Communication 30/60/90 ngày.
- Workplace English 60/90 ngày.
- TOEIC Listening & Reading 30/60/90 ngày.
- TOEIC Speaking & Writing 60/90 ngày.
- TOEIC Four Skills 60/90/120 ngày.

Mục tiêu 1–3 tháng được xem là khoảng thời gian tạo tiến bộ đo được, không phải cam kết một mức điểm cố định cho mọi người dùng.

### 4.4. Quy tắc điều chỉnh roadmap

- Nếu người học bỏ học 2 ngày: ngày tiếp theo ưu tiên review nhẹ, không nhồi thêm bài mới.
- Nếu accuracy một skill dưới 60%: tăng tần suất skill đó trong tuần sau.
- Nếu user đạt accuracy trên 85% trong 3 buổi liên tiếp: mở level hoặc topic tiếp theo.
- Nếu deadline ngắn: giảm nội dung phụ, giữ nội dung cốt lõi.
- Nếu user học dưới 30 phút/ngày: mỗi ngày tối đa 3 task.
- Nếu user học 60 phút/ngày: mỗi ngày 4–5 task.
- Nếu mục tiêu TOEIC: roadmap phải map Part 1–7.
- Nếu mục tiêu giao tiếp: roadmap phải có speaking room + daily sentences.
- Nếu mục tiêu TOEIC Speaking & Writing: roadmap phải có rubric practice và feedback định kỳ.
- Nếu mục tiêu TOEIC 4 kỹ năng: không được bỏ trống một kỹ năng quá số ngày cấu hình.
- Nội dung được cấp quyền trong library phải được ưu tiên nếu phù hợp với level, topic và learning goal.

Các tín hiệu điều chỉnh:

```text
accuracy_by_part
accuracy_by_topic
average_response_time
vocabulary_mastery
review_overdue_count
streak_consistency
listening_replay_count
speaking_rubric_trend
writing_rubric_trend
frequent_mistakes
mock_test_score_trend
```


---

## 5. Từ vựng tổng thể

### 5.1. Mục tiêu

Xây dựng kho từ vựng có thể phục vụ:

- Người mất gốc.
- Người học giao tiếp.
- Người luyện TOEIC.
- Người học workplace English.
- Người học nâng cao.

### 5.2. Phân tầng từ vựng

| Level | Tên | Mô tả |
|---|---|---|
| 1 | Daily Basic | Từ cực kỳ phổ biến trong đời sống |
| 2 | Common Communication | Từ dùng trong giao tiếp cơ bản |
| 3 | TOEIC Core | Từ thường gặp trong TOEIC |
| 4 | Workplace English | Từ môi trường công việc |
| 5 | Advanced TOEIC | Từ khó hơn, paraphrase, business nâng cao |
| 6 | Academic/Professional | Từ học thuật hoặc chuyên môn |

### 5.3. Chủ đề từ vựng

- Daily Life
- Family
- Food
- Shopping
- Travel
- Transportation
- Health
- Education
- Work
- Office
- Meeting
- Email
- Recruitment
- Finance
- Banking
- Marketing
- Shipping
- Customer Service
- Technology
- Environment
- News & Current Affairs

### 5.4. Vocabulary Mindmap và Knowledge Graph

Từ vựng phải được tổ chức theo cây kiến thức, không chỉ dưới dạng danh sách hoặc folder:

```text
Domain
→ Topic
→ Subtopic
→ Vocabulary
→ Collocation
→ Sentence Pattern
→ Related Lesson
→ Related TOEIC Part
→ User Mistake
```

Ví dụ:

```text
Workplace
└── Meetings
    ├── Scheduling
    ├── Presentations
    ├── Decisions
    └── Vocabulary
        ├── agenda
        ├── attendee
        ├── postpone
        └── availability
```

Mỗi node mindmap cần hỗ trợ:

- Số từ đã học và tổng số từ.
- Mastery score.
- Số từ đến hạn ôn.
- Nội dung đã mở khóa.
- TOEIC Part liên quan.
- Listening, speaking, writing và quiz liên quan.
- Các lỗi người dùng thường mắc.
- Collocation và sentence pattern quan trọng.

Mindmap là taxonomy dùng chung cho toàn hệ thống, không phải một trang minh họa độc lập.

### 5.5. Dữ liệu cho mỗi từ

```text
word
meaning_vi
meaning_en
phonetic
audio_url
part_of_speech
topic
level
frequency_rank
toeic_relevance_score
example_sentence
example_vi
synonyms
antonyms
collocations
common_mistakes
source
license_status
created_at
updated_at
```

### 5.6. Spaced repetition

Trạng thái từ:

- New
- Learning
- Familiar
- Mastered
- Forgotten

Lịch ôn mặc định:

- Lần 1: sau 1 ngày.
- Lần 2: sau 3 ngày.
- Lần 3: sau 7 ngày.
- Lần 4: sau 14 ngày.
- Lần 5: sau 30 ngày.

Quy tắc:

- Từ sai nhiều lần quay lại trạng thái Learning.
- Từ đúng liên tục được tăng mastery_score.
- Từ xuất hiện trong lỗi sai được ưu tiên ôn lại.
- Không thêm quá nhiều từ mới khi user có nhiều từ đến hạn review.

---

## 6. Quiz Card / Duolingo-like Practice

### 6.1. Mục tiêu

Tạo trải nghiệm học ngắn, vui, dễ duy trì mỗi ngày.

### 6.2. Các dạng quiz card

1. Chọn nghĩa đúng.
2. Nghe audio chọn từ.
3. Nhìn nghĩa chọn từ.
4. Điền từ vào câu.
5. Sắp xếp câu.
6. Ghép từ với nghĩa.
7. Ghép collocation.
8. Chọn synonym.
9. Chọn part of speech.
10. Flashcard nhớ/chưa nhớ.
11. Chọn câu đúng ngữ pháp.
12. Dịch Việt → Anh dạng ngắn.
13. Dịch Anh → Việt dạng ngắn.
14. Shadowing câu ngắn.

### 6.3. Luồng quiz

```text
User mở Daily Practice
→ Hệ thống lấy task theo roadmap
→ Load 5-15 quiz card
→ User trả lời từng card
→ Chấm ngay
→ Hiện feedback ngắn
→ Cập nhật XP/mastery/error notebook
→ Tổng kết cuối session
```

### 6.4. Quy tắc game hóa quiz

- Đúng liên tiếp tạo combo.
- Sai không phạt nặng, chỉ đưa vào review.
- Hoàn thành daily practice tăng streak.
- Không dùng thiết kế gây nghiện cực đoan.
- Ưu tiên cảm giác “mình học được thật”.

---

## 7. Luyện nghe

### 7.1. Nguồn audio

Audio do admin/content team cung cấp hoặc tự sản xuất.

Mỗi audio cần metadata:

```text
title
transcript
translation_vi
level
speed
accent
topic
skill
toeic_part
duration_seconds
audio_url
license_status
```

### 7.2. Phân loại audio

Theo level:

- Beginner
- Elementary
- Intermediate
- Advanced

Theo speed:

- Slow
- Normal
- Fast

Theo accent:

- US
- UK
- Australia
- Mixed

Theo dạng:

- Daily conversation
- Announcement
- Meeting
- Interview
- Travel
- Office
- TOEIC Part 1
- TOEIC Part 2
- TOEIC Part 3
- TOEIC Part 4

### 7.3. Hình thức luyện nghe

1. Listen & Choose.
2. Dictation.
3. Fill in the blanks.
4. Shadowing.
5. Listen without transcript.
6. Listen with transcript highlight.
7. Listen sentence-by-sentence.
8. Slow → Normal → Fast mode.
9. Listen and arrange sentences.
10. Listen and answer TOEIC-style questions.

### 7.4. Luồng bài nghe

```text
Preview từ vựng
→ Nghe lần 1 không transcript
→ Trả lời câu hỏi
→ Nghe lần 2 có transcript
→ Highlight phần không nghe được
→ Shadowing
→ Lưu lỗi nghe
→ Gợi ý bài nghe tiếp theo
```

---

## 8. Luyện nói với AI Teacher

### 8.1. Mục tiêu

Tạo phòng luyện nói ảo để người học có môi trường phản xạ tiếng Anh mà không ngại sai.

### 8.2. Mode luyện nói

- Free Talk
- Daily Conversation
- Travel Role-play
- Workplace Role-play
- Interview Practice
- TOEIC Speaking Practice
- Pronunciation Practice
- Shadowing with AI
- Picture Description
- Opinion Practice

### 8.3. Luồng speaking room

```text
User chọn mode/chủ đề
→ AI Teacher mở tình huống
→ User nói qua microphone
→ Speech-to-text
→ AI phân tích nội dung
→ AI phản hồi tự nhiên
→ AI sửa lỗi phát âm/ngữ pháp/từ vựng
→ AI gợi ý câu tốt hơn
→ Lưu speaking report
```

### 8.4. Tiêu chí chấm speaking

- Pronunciation
- Fluency
- Grammar
- Vocabulary
- Coherence
- Relevance
- Confidence

### 8.5. Quota miễn phí

Gợi ý:

- Free: 3–5 phút AI speaking/ngày.
- Premium: 30–60 phút/ngày hoặc theo credit.

---

## 9. Luyện viết với AI + RAG/Graph-RAG

### 9.1. Mục tiêu

Chấm bài viết và phản hồi cá nhân hóa dựa trên:

- Rubric.
- Grammar rules.
- Common mistakes.
- Sample answers.
- Lịch sử lỗi của user.
- Chủ đề đang học.
- Mục tiêu TOEIC/giao tiếp.

### 9.2. Dạng bài viết

1. Viết câu theo từ vựng.
2. Viết lại câu.
3. Dịch Việt → Anh.
4. Viết email ngắn.
5. Viết đoạn opinion.
6. TOEIC Writing response.
7. Describe a picture.
8. Respond to request.

### 9.3. Knowledge base cho Writing Coach

Dữ liệu cần lưu:

- Grammar rules.
- Writing rubrics.
- Sample answers.
- Common mistakes.
- Sentence patterns.
- Topic vocabulary.
- User error history.

### 9.4. Graph-RAG model

Graph node gợi ý:

```text
User
WritingSubmission
Mistake
GrammarRule
VocabularyTopic
RubricCriterion
SampleAnswer
SentencePattern
TaskType
```

Graph relation gợi ý:

```text
User MADE Mistake
Mistake RELATED_TO GrammarRule
WritingSubmission BELONGS_TO TaskType
TaskType USES RubricCriterion
SampleAnswer MATCHES TaskType
VocabularyTopic SUPPORTS TaskType
```

### 9.5. Luồng chấm viết

```text
User nộp bài
→ Backend lưu submission
→ Queue tạo AI grading job
→ Retrieval lấy rubric/rule/sample/error history
→ Graph-RAG lấy quan hệ lỗi liên quan
→ AI chấm bài
→ Chuẩn hóa feedback JSON
→ Lưu feedback
→ Cập nhật error notebook
→ Cập nhật roadmap nếu lỗi lặp lại
```

### 9.6. Output feedback

```text
Score: 72/100

Grammar:
- Sai giới từ: depend of → depend on
- Sai thì: I have went → I have gone

Vocabulary:
- Từ đúng nhưng còn đơn giản
- Gợi ý: good → helpful/effective/beneficial

Better version:
...

Personal reminder:
Bạn đã sai “depend on” 4 lần. App sẽ đưa cụm này vào review ngày mai.
```

---

## 10. TOEIC 2 kỹ năng, TOEIC 4 kỹ năng và Exam Mode

### 10.1. Learning tracks TOEIC

EnglishPath hỗ trợ ba hướng học:

1. **TOEIC Listening & Reading**
   Phục vụ kỳ thi 2 kỹ năng với Listening Part 1–4 và Reading Part 5–7.

2. **TOEIC Speaking & Writing**
   Luyện nói và viết theo dạng nhiệm vụ TOEIC, có rubric và AI feedback.

3. **TOEIC Four Skills**
   Kết hợp Listening, Reading, Speaking và Writing trong cùng roadmap.

### 10.2. TOEIC Listening & Reading

Listening:

- Part 1: Photographs.
- Part 2: Question–Response.
- Part 3: Conversations.
- Part 4: Talks.

Reading:

- Part 5: Incomplete Sentences.
- Part 6: Text Completion.
- Part 7: Reading Comprehension.

Hình thức luyện:

- Practice by Part.
- Practice by Topic.
- Practice by Difficulty.
- Vocabulary-focused practice.
- Grammar-focused practice.
- Weakness Test.
- Mini Test.
- Half Test.
- Full Test.
- Exam Simulation.

### 10.3. TOEIC Speaking

Các nhóm nhiệm vụ cần hỗ trợ:

- Read a text aloud.
- Describe a picture.
- Respond to questions.
- Respond using provided information.
- Express an opinion.

Tiêu chí đánh giá:

- Pronunciation.
- Intonation and stress.
- Fluency.
- Grammar.
- Vocabulary.
- Relevance.
- Task completion.

Hệ thống phải lưu audio, transcript, rubric result, lỗi lặp lại và phiên bản câu trả lời được gợi ý.

### 10.4. TOEIC Writing

Các nhóm nhiệm vụ cần hỗ trợ:

- Write a sentence based on a picture.
- Respond to a written request.
- Write an opinion essay.

Tiêu chí đánh giá:

- Task completion.
- Grammar.
- Vocabulary.
- Organization.
- Coherence.
- Supporting details.
- Appropriateness of tone.

AI feedback không được coi là điểm thi chính thức. Kết quả phải ghi rõ là estimated/practice score.

### 10.5. Roadmap TOEIC 4 kỹ năng

Roadmap phải phân bổ bốn kỹ năng theo trình độ, mục tiêu và thời gian học:

```text
Foundation
→ Vocabulary & Grammar Core
→ Listening/Reading Skill Building
→ Speaking/Writing Task Practice
→ Timed Practice
→ Mock Test
→ Error Review
```

Người học có thể chọn trọng số kỹ năng, nhưng hệ thống phải cảnh báo nếu một kỹ năng bị bỏ qua quá lâu.

### 10.6. Exam mode

Tính năng:

- Timer server-side.
- Auto submit khi hết giờ.
- Không cho pause trong strict mode.
- Không cho xem answer key trước submit.
- Disable copy/paste/right click ở mức hợp lý.
- Detect tab switch và window blur.
- Random thứ tự câu hỏi/đáp án khi không phá logic.
- Watermark user id hoặc session id.
- Log hành vi bất thường.
- Resume policy phải được cấu hình theo loại test.
- Speaking/Writing phải lưu trạng thái upload an toàn để tránh mất bài.

Giới hạn:

- Web không thể chống gian lận tuyệt đối.
- Không thể ngăn hoàn toàn việc chụp màn hình hoặc dùng thiết bị ngoài.
- Exam mode là môi trường mô phỏng, không phải hệ thống proctoring chuyên nghiệp.

### 10.7. Phân tích sau bài test

Hệ thống trả về:

- Estimated score.
- Accuracy by skill.
- Accuracy by TOEIC Part.
- Time per question/task.
- Mistake types.
- Weak topics.
- Vocabulary gaps.
- Grammar gaps.
- Speaking/Writing rubric breakdown.
- Questions/tasks to review.
- Suggested learning plan.
- Score trend theo thời gian.

### 10.8. Quy tắc chất lượng question bank

- Mỗi câu có source/license rõ ràng.
- Đáp án và explanation phải qua review.
- Không để AI tự xác nhận đáp án cuối cùng.
- Câu hỏi có trạng thái Draft → Reviewed → Approved → Published → Archived.
- Cần versioning để không làm sai dữ liệu lịch sử của các bài test đã hoàn thành.

---

## 11. Daily English Sentences

### 11.1. Mục tiêu

Giúp người học dùng tiếng Anh trong đời sống thật, không chỉ luyện đề.

### 11.2. Chủ đề

- Greeting
- Self-introduction
- Asking for help
- Ordering food
- Shopping
- Travel
- Workplace
- Meeting
- Email phrases
- Apologizing
- Giving opinions
- Making plans
- Small talk

### 11.3. Cấu trúc mỗi câu

```text
sentence_en
meaning_vi
audio_url
pronunciation_note
usage_context
alternative_expressions
mini_roleplay_prompt
level
topic
```

### 11.4. Dạng luyện

- Nghe và lặp lại.
- Chọn nghĩa.
- Điền từ thiếu.
- Role-play với AI.
- Ghi âm và so sánh.
- Dùng câu trong đoạn hội thoại.

---

## 12. Error Notebook

### 12.1. Mục tiêu

Không để người học sai rồi quên. Mọi lỗi quan trọng phải quay lại lịch ôn.

### 12.2. Loại lỗi

- Vocabulary mistake.
- Grammar mistake.
- Listening mistake.
- Reading mistake.
- Pronunciation mistake.
- Writing mistake.
- Speaking mistake.
- Time management mistake.

### 12.3. Dữ liệu lỗi

```text
user_id
source_type
source_id
skill
topic
mistake_type
user_answer
correct_answer
explanation
next_review_at
review_count
status
```

### 12.4. Quy tắc review

- Sai lần 1: review sau 1 ngày.
- Sai lần 2: review sau 3 ngày.
- Sai lần 3: review sau 7 ngày.
- Đúng liên tiếp: giảm tần suất review.
- Sai nhiều lần: đưa vào roadmap tuần sau.

---

## 13. Game hóa

### 13.1. Thành phần

- XP
- Level
- Streak
- Daily quest
- Weekly quest
- Badge
- Leaderboard
- Avatar
- Pet companion optional
- Skill tree
- Treasure chest nhẹ

### 13.2. Quy tắc XP

Ví dụ:

```text
Hoàn thành daily quiz: +10 XP
Học 10 từ mới: +15 XP
Review lỗi sai: +10 XP
Luyện nghe 1 bài: +15 XP
Nói với AI 3 phút: +20 XP
Làm mini test: +30 XP
Full test: +100 XP
```

### 13.3. Badge

- 7-day streak.
- 30-day streak.
- Vocabulary Starter.
- Listening Beginner.
- TOEIC Part 5 Master.
- First Speaking Session.
- First Writing Submission.

### 13.4. Nguyên tắc nhân văn

- Không tạo áp lực quá mức.
- Không làm người học thấy tội lỗi khi mất streak.
- Có “streak freeze” miễn phí giới hạn.
- Ưu tiên động viên hơn trừng phạt.

---

## 14. News / SEO / Content Marketing

### 14.1. Mục tiêu

- Kéo traffic tự nhiên.
- Xây authority về học tiếng Anh/TOEIC.
- Biến bài viết thành bài học tương tác.
- Cập nhật tin tức thời sự liên quan đến tiếng Anh, giáo dục, TOEIC, học tập.

### 14.2. Chuyên mục

- TOEIC Updates
- English Learning Tips
- Vocabulary from News
- Daily English
- TOEIC Strategy
- Grammar Guide
- Listening Practice
- Speaking Practice
- Writing Practice
- Roadmap học tiếng Anh

### 14.3. Cấu trúc bài viết SEO

```text
title
slug
seo_title
meta_description
excerpt
thumbnail
category
tags
content
faq_schema
related_lessons
quiz_id
published_at
updated_at
```

### 14.4. Biến news thành bài học

Luồng:

```text
Admin viết bài tin tức
→ Gắn từ vựng quan trọng
→ Tạo quiz 5 câu
→ Tạo writing prompt
→ Tạo speaking discussion prompt
→ Gợi ý bài học liên quan
```

Ví dụ:

```text
Bài news: “5 workplace trends in 2026”
→ Từ vựng: workplace, remote, productivity, collaboration
→ Quiz vocab
→ Writing prompt: What is your opinion about remote work?
→ Speaking room: Discuss your ideal workplace
```

---

## 14A. Kho nội dung được cấp quyền và Google Drive Content Pipeline

### 14A.1. Mục tiêu

Biến kho tài liệu, video, audio và course asset trên Google Drive thành một thư viện học tập có cấu trúc, tìm kiếm được và gắn với roadmap.

Google Drive là nguồn nội dung, không phải database nghiệp vụ chính.

### 14A.2. Pipeline nhập nội dung

```text
Google Drive
→ Content Inventory
→ Metadata Extraction
→ License Validation
→ Content Classification
→ Segmentation
→ Human Review
→ CMS Import
→ Publish
```

### 14A.3. Loại nội dung

- Document/PDF.
- Video.
- Audio.
- Slide.
- Spreadsheet/question bank.
- Transcript.
- Image.
- Course folder.
- External link.

### 14A.4. Metadata bắt buộc

```text
title
source_file_id
source_url
content_type
exam_type
skill
toeic_part
topic
subtopic
level
language
duration
license_status
usage_scope
access_tier
review_status
publish_status
checksum
version
```

### 14A.5. Phân loại `exam_type`

```text
GENERAL_ENGLISH
TOEIC_LISTENING_READING
TOEIC_SPEAKING_WRITING
TOEIC_FOUR_SKILLS
BUSINESS_ENGLISH
COMMUNICATION
IELTS_CONTENT
ACADEMIC_ENGLISH
OTHER
```

`IELTS_CONTENT` hoặc `OTHER` vẫn có thể xuất hiện trong thư viện nếu được cấp quyền và hữu ích cho học tiếng Anh, nhưng không tự động tạo một IELTS exam track.

### 14A.6. Trải nghiệm người học

Kho nội dung phải hỗ trợ:

- Tìm kiếm và lọc theo level, skill, topic, track và loại tài nguyên.
- Resume video/audio.
- Theo dõi tiến độ.
- Bookmark.
- Gắn note cá nhân.
- Liên kết lesson với quiz và vocabulary.
- Đề xuất nội dung tiếp theo.
- Hiển thị quyền truy cập rõ ràng.

### 14A.7. Quy tắc đồng bộ Drive

- Không phụ thuộc vào URL Drive công khai trong runtime production.
- File đã publish cần được đồng bộ sang storage phù hợp hoặc sử dụng cơ chế truy cập có kiểm soát.
- Dùng checksum/version để nhận biết file thay đổi.
- Không tự động publish khi file trên Drive thay đổi.
- Mọi cập nhật phải qua review lại nếu ảnh hưởng nội dung học.

---

## 15. Admin CMS

### 15.1. Dashboard admin

Hiển thị:

- Tổng user.
- User active hôm nay.
- Số bài học.
- Số quiz.
- Số AI requests.
- Chi phí AI ước tính.
- Bài viết mới.
- Báo cáo vi phạm.
- Lỗi hệ thống gần đây.

### 15.2. Quản lý vocabulary

- CRUD từ vựng.
- Import CSV/Excel.
- Export CSV.
- Gắn level/topic.
- Upload/generate audio.
- Gắn example.
- Mark common/advanced.
- Kiểm tra duplicate.

### 15.3. Quản lý question bank

- CRUD câu hỏi.
- Skill.
- TOEIC Part.
- Topic.
- Difficulty.
- Audio/Image/Passage.
- Correct answer.
- Explanation.
- Source/license.
- Review status.

### 15.4. Quản lý audio

- Upload audio.
- Transcript.
- Translation.
- Accent.
- Speed.
- Topic.
- Level.
- Gắn question set.

### 15.5. Quản lý writing AI

- Rubric.
- Prompt template.
- Feedback schema.
- Sample answers.
- Common mistakes.
- Grammar rules.

### 15.6. Quản lý speaking AI

- Conversation scenario.
- AI teacher persona.
- Role-play scripts.
- Rubric.
- Safety instruction.

### 15.7. Quản lý news/blog

- CRUD post.
- Draft/publish/schedule.
- SEO meta.
- Category/tag.
- Related lessons.
- Quiz cuối bài.

### 15.8. Quản lý game

- XP rules.
- Badge rules.
- Quest rules.
- Leaderboard config.
- Streak freeze config.

---

## 15A. Information Architecture và route map đề xuất

### 15A.1. Public routes

```text
/
/foundation
/vocabulary
/vocabulary/mindmap
/listening
/speaking
/writing
/toeic
/toeic/listening-reading
/toeic/speaking-writing
/toeic/four-skills
/library
/blog
/pricing
```

### 15A.2. Authenticated learner routes

```text
/dashboard
/onboarding
/placement-test
/roadmap
/daily-practice
/vocabulary/topics
/vocabulary/review
/listening/lessons
/speaking/room
/writing/practice
/toeic/practice
/toeic/mock-tests
/error-notebook
/progress
/library/my-learning
/bookmarks
```

### 15A.3. Admin routes

```text
/admin
/admin/content
/admin/library
/admin/vocabulary
/admin/questions
/admin/tests
/admin/audio
/admin/video
/admin/roadmaps
/admin/rubrics
/admin/users
/admin/licenses
/admin/analytics
/admin/ai-usage
```

### 15A.4. Nguyên tắc UX

- Trang chủ định hướng theo mục tiêu học, không chỉ liệt kê tính năng.
- Guest phải được học thử trước khi đăng ký.
- Dashboard tập trung vào “Hôm nay học gì?”.
- Roadmap là trung tâm kết nối toàn bộ module.
- Một nội dung chỉ nên có một nguồn chuẩn nhưng có thể xuất hiện trong nhiều learning track.
- Navigation không được làm người dùng cảm giác đang dùng nhiều ứng dụng rời rạc.

---

## 16. Stack triển khai đề xuất

### 16.1. Stack chính giai đoạn production web

| Layer | Công nghệ/Dịch vụ | Lý do chọn |
|---|---|---|
| Web Frontend | Next.js App Router + TypeScript | SEO tốt, SSR/SSG, phù hợp web cộng đồng và app học |
| UI | Tailwind CSS + shadcn/ui + Framer Motion | Làm UI nhanh, đẹp, dễ tùy biến, animation mượt |
| Backend API | NestJS + TypeScript | Kiến trúc module rõ ràng, hợp app lớn |
| Database | PostgreSQL | Dữ liệu quan hệ phức tạp, ổn định |
| ORM | Prisma | Type-safe, migration tốt, dev nhanh |
| Auth | Supabase Auth hoặc Auth.js | Nhanh cho MVP, hỗ trợ OAuth/email |
| Storage | Cloudflare R2 | Lưu audio/image/file, S3-compatible, tối ưu chi phí bandwidth |
| Cache/Queue | Redis + BullMQ | Queue AI/audio/import, cache session/rate limit |
| Search | Meilisearch | Search từ vựng/bài viết nhanh, typo tolerance |
| Vector DB | Qdrant hoặc pgvector | Semantic search/RAG |
| Graph DB | Neo4j hoặc PostgreSQL graph-style MVP | Graph-RAG writing feedback |
| AI Gateway | NestJS service riêng | Bảo vệ API key, quota, logging |
| AI Provider | OpenAI API/Gemini/Claude tùy chi phí | Writing/speaking/explanation/generation |
| Speech-to-text | OpenAI transcription hoặc Google Speech-to-Text | Chuyển giọng nói thành text |
| Text-to-speech | OpenAI TTS hoặc Google TTS/ElevenLabs | Audio câu/từ/AI teacher |
| Realtime voice | OpenAI Realtime/WebRTC hoặc WebSocket riêng | Speaking room mượt |
| Analytics | PostHog | Product analytics, feature flags, session replay |
| Error monitoring | Sentry | Theo dõi lỗi frontend/backend |
| Notification | Firebase Cloud Messaging | Push notification web/mobile |
| CAPTCHA | Cloudflare Turnstile | Giảm bot/spam đăng ký/login |
| CDN/WAF/DNS | Cloudflare | CDN, cache, WAF, DDoS protection |
| Payment later | Stripe | Subscription, checkout, customer portal |
| Deployment FE | Vercel hoặc Cloudflare Pages | Deploy Next.js nhanh |
| Deployment BE | Railway/Fly.io/Render/AWS ECS | Chạy NestJS worker/API ổn định |
| CI/CD | GitHub Actions | Test/build/deploy tự động |
| Docs | GitHub + Notion/Docs site | Quản lý tài liệu sản phẩm |

### 16.2. Stack tối ưu cho MVP tiết kiệm

Nếu muốn ra sản phẩm nhanh và tiết kiệm:

```text
Frontend: Next.js + TypeScript + Tailwind + shadcn/ui
Backend: Next.js API Routes hoặc NestJS nhỏ
Database/Auth: Supabase
Storage: Supabase Storage hoặc Cloudflare R2
Search: PostgreSQL full-text trước, Meilisearch sau
Queue: Upstash Redis + BullMQ hoặc Supabase Edge Function nhẹ
AI: OpenAI API qua backend proxy
Analytics: PostHog free tier
Monitoring: Sentry
Deploy: Vercel
```

### 16.3. Stack khuyến nghị nghiêm túc cho sản phẩm thật

```text
Monorepo: Turborepo
apps/web: Next.js
apps/admin: Next.js admin dashboard
apps/mobile: Expo sau này
apps/api: NestJS
apps/worker: NestJS worker hoặc Node worker
packages/ui: shared UI
packages/types: shared types
packages/db: Prisma schema/client
packages/config: eslint/tsconfig
```

---

## 17. Kiến trúc hệ thống

### 17.1. Kiến trúc tổng quan

```text
User Browser / Mobile
        |
        v
Cloudflare CDN/WAF/Turnstile
        |
        v
Next.js Web App  <---->  NestJS API Gateway
        |                         |
        |                         v
        |                  PostgreSQL / Supabase
        |                         |
        |                         v
        |                  Redis / BullMQ Queue
        |                         |
        |                         v
        |                  Worker Services
        |                    |     |      |
        |                    |     |      v
        |                    |     |   AI Providers
        |                    |     v
        |                    |  R2 Storage
        |                    v
        |              Qdrant / Neo4j / Meilisearch
        |
        v
PostHog / Sentry / Logs
```

### 17.2. Tách service

API chính:

- Auth module.
- User module.
- Roadmap module.
- Vocabulary module.
- Quiz module.
- Listening module.
- Speaking module.
- Writing module.
- TOEIC module.
- Error notebook module.
- Gamification module.
- News module.
- Admin module.
- Payment module.
- Notification module.
- AI gateway module.

Worker:

- AI grading worker.
- Audio transcription worker.
- Embedding worker.
- Graph indexing worker.
- Import content worker.
- Notification worker.
- Report/export worker.

---

## 18. Third-party services cần dùng

### 18.1. Bắt buộc cho MVP

| Nhu cầu | Dịch vụ đề xuất |
|---|---|
| Domain/DNS/CDN | Cloudflare |
| Hosting frontend | Vercel |
| Database/Auth | Supabase hoặc Neon + Auth.js |
| File storage | Cloudflare R2 |
| Email transactional | Resend hoặc SendGrid |
| Analytics | PostHog |
| Error monitoring | Sentry |
| AI writing/explanation | OpenAI API hoặc Gemini |
| CAPTCHA | Cloudflare Turnstile |
| Git/CI | GitHub + GitHub Actions |

### 18.2. Cần cho bản AI nâng cao

| Nhu cầu | Dịch vụ đề xuất |
|---|---|
| Speech-to-text | OpenAI / Google Speech-to-Text |
| Text-to-speech | OpenAI / Google TTS / ElevenLabs |
| Realtime voice | OpenAI Realtime API / WebRTC service |
| Vector search | Qdrant Cloud / Supabase pgvector |
| Graph database | Neo4j AuraDB / self-host Neo4j |
| Queue/Redis | Upstash Redis / Redis Cloud |
| Moderation | OpenAI Moderation hoặc rule-based moderation |

### 18.3. Cần cho mobile/premium

| Nhu cầu | Dịch vụ đề xuất |
|---|---|
| Mobile app | Expo React Native |
| Push notification | Firebase Cloud Messaging |
| Payment | Stripe web, app store payment nếu bán digital trong app |
| Deep link | Expo Linking / Firebase Dynamic Links alternative |
| Crash reporting mobile | Sentry |

---

## 19. Database schema đề xuất

### 19.1. Users

```sql
users
- id uuid primary key
- email text unique
- name text
- avatar_url text
- role text
- status text
- created_at timestamptz
- updated_at timestamptz

user_profiles
- user_id uuid primary key
- current_level text
- learning_goal text
- target_score int
- daily_study_minutes int
- timezone text
- preferred_skills text[]
```

### 19.2. Roadmap

```sql
learning_goals
- id uuid primary key
- user_id uuid
- goal_type text
- target_score int
- current_score int
- deadline date
- max_duration_days int
- status text

roadmaps
- id uuid primary key
- user_id uuid
- goal_id uuid
- title text
- duration_days int
- current_day int
- status text

roadmap_items
- id uuid primary key
- roadmap_id uuid
- day_number int
- item_type text
- skill text
- lesson_id uuid
- quiz_id uuid
- test_id uuid
- estimated_minutes int
- status text
```

### 19.3. Vocabulary

```sql
vocabularies
- id uuid primary key
- word text
- meaning_vi text
- meaning_en text
- phonetic text
- audio_url text
- part_of_speech text
- topic text
- level text
- frequency_rank int
- toeic_relevance_score int
- example_sentence text
- example_vi text
- synonyms text[]
- antonyms text[]
- collocations text[]
- common_mistakes text[]
- source text
- license_status text

user_vocabularies
- id uuid primary key
- user_id uuid
- vocabulary_id uuid
- status text
- mastery_score int
- next_review_at timestamptz
- review_count int
```

### 19.4. Lessons & content

```sql
courses
- id uuid primary key
- title text
- description text
- source_type text
- level text
- skill text
- status text

lessons
- id uuid primary key
- course_id uuid
- title text
- content_type text
- content_body text
- audio_url text
- video_url text
- transcript text
- skill text
- topic text
- level text
- order_index int
```

### 19.5. Questions & tests

```sql
questions
- id uuid primary key
- skill text
- toeic_part text
- topic text
- difficulty text
- question_text text
- audio_url text
- image_url text
- passage_text text
- options jsonb
- correct_answer text
- explanation text
- source_type text
- license_status text

practice_sessions
- id uuid primary key
- user_id uuid
- mode text
- skill text
- started_at timestamptz
- submitted_at timestamptz
- duration_seconds int
- score int
- accuracy numeric

user_answers
- id uuid primary key
- session_id uuid
- user_id uuid
- question_id uuid
- selected_answer text
- is_correct boolean
- time_spent int
```

### 19.6. Error notebook

```sql
error_items
- id uuid primary key
- user_id uuid
- source_type text
- source_id uuid
- skill text
- topic text
- mistake_type text
- user_answer text
- correct_answer text
- explanation text
- next_review_at timestamptz
- review_count int
- status text
```

### 19.7. Writing & speaking

```sql
writing_prompts
- id uuid primary key
- title text
- prompt text
- task_type text
- level text
- rubric_id uuid

writing_submissions
- id uuid primary key
- user_id uuid
- prompt_id uuid
- content text
- ai_score int
- feedback_json jsonb
- created_at timestamptz

speaking_scenarios
- id uuid primary key
- title text
- mode text
- topic text
- level text
- system_prompt text

speaking_sessions
- id uuid primary key
- user_id uuid
- scenario_id uuid
- transcript text
- ai_feedback_json jsonb
- duration_seconds int
- created_at timestamptz
```

### 19.8. Gamification

```sql
user_xp
- user_id uuid primary key
- total_xp int
- level int
- current_streak int
- longest_streak int
- last_active_date date

badges
- id uuid primary key
- code text
- name text
- description text
- icon_url text

user_badges
- id uuid primary key
- user_id uuid
- badge_id uuid
- earned_at timestamptz
```

### 19.9. News/blog

```sql
posts
- id uuid primary key
- title text
- slug text unique
- excerpt text
- content text
- category text
- tags text[]
- seo_title text
- meta_description text
- thumbnail_url text
- status text
- author_id uuid
- published_at timestamptz
- updated_at timestamptz
```

---

## 20. API modules đề xuất

### 20.1. Auth

```http
POST /auth/register
POST /auth/login
POST /auth/logout
POST /auth/refresh
POST /auth/forgot-password
POST /auth/reset-password
GET  /auth/me
```

### 20.2. Onboarding

```http
POST /onboarding/start
POST /onboarding/submit
GET  /onboarding/result
```

### 20.3. Roadmap

```http
POST /roadmaps/generate
GET  /roadmaps/current
GET  /roadmaps/:id
PATCH /roadmaps/items/:id/status
POST /roadmaps/recalculate
```

### 20.4. Vocabulary

```http
GET  /vocabularies/daily
GET  /vocabularies/topics
POST /vocabularies/:id/review
GET  /vocabularies/review-due
```

### 20.5. Quiz

```http
POST /quiz/session
POST /quiz/session/:id/answer
POST /quiz/session/:id/submit
GET  /quiz/session/:id/result
```

### 20.6. Listening

```http
GET  /listening/lessons
GET  /listening/lessons/:id
POST /listening/lessons/:id/submit
POST /listening/lessons/:id/shadowing
```

### 20.7. Speaking AI

```http
POST /speaking/session
POST /speaking/session/:id/audio
POST /speaking/session/:id/message
POST /speaking/session/:id/finish
GET  /speaking/session/:id/report
```

### 20.8. Writing AI

```http
GET  /writing/prompts
POST /writing/submissions
GET  /writing/submissions/:id/feedback
POST /writing/submissions/:id/retry
```

### 20.9. TOEIC

```http
GET  /toeic/parts
GET  /toeic/tests
POST /toeic/tests/:id/start
POST /toeic/sessions/:id/answer
POST /toeic/sessions/:id/submit
GET  /toeic/sessions/:id/result
```

### 20.10. Admin

```http
GET    /admin/dashboard
CRUD   /admin/vocabularies
CRUD   /admin/questions
CRUD   /admin/audio
CRUD   /admin/posts
CRUD   /admin/roadmap-templates
CRUD   /admin/rubrics
GET    /admin/users
PATCH  /admin/users/:id/status
```

---

## 21. AI Gateway

### 21.1. Mục tiêu

AI Gateway là lớp backend trung gian để:

- Không expose API key ra frontend.
- Quản lý quota theo user.
- Ghi log chi phí.
- Chọn model phù hợp từng tác vụ.
- Retry/fallback provider.
- Chặn prompt injection cơ bản.
- Chuẩn hóa output JSON.

### 21.2. Tác vụ AI

| Tác vụ | Model/Service |
|---|---|
| Giải thích câu sai | LLM text |
| Chấm writing | LLM + RAG/Graph-RAG |
| Speaking conversation | Realtime/voice LLM |
| Speech-to-text | Audio transcription |
| Text-to-speech | TTS |
| Sinh quiz | LLM + content rules |
| Phân loại audio/tài liệu | LLM/worker |
| Tạo roadmap | rule engine + LLM optional |

### 21.3. Quota AI

```text
Free user:
- Writing feedback: 3 lượt/ngày
- Speaking AI: 3-5 phút/ngày
- AI explanation: 10 lượt/ngày

Premium:
- Writing feedback: 50 lượt/tháng hoặc theo gói
- Speaking AI: 30-60 phút/ngày
- Explanation: cao hơn
```

### 21.4. Chống lạm dụng AI

- Rate limit theo user/IP.
- Daily quota.
- Monthly budget per user.
- Content moderation.
- Prompt template cố định.
- Không cho user truyền system prompt.
- Log token/cost.
- Spend alert.

---

## 22. Bảo mật

### 22.1. Nguyên tắc

- Không đặt API key ở frontend.
- Không gửi answer key đề thi xuống client trước submit.
- Không log password/token/API key.
- Validate tất cả input.
- RBAC nghiêm ngặt.
- Audit log cho admin.
- Rate limit endpoint nhạy cảm.
- HTTPS toàn hệ thống.
- Backup định kỳ.

### 22.2. Auth security

- Password hash bằng Argon2/bcrypt.
- Email verification.
- Refresh token rotation.
- Session expiration.
- Optional OAuth Google.
- Optional 2FA cho admin.
- CAPTCHA khi login/register bất thường.

### 22.3. Authorization

Role:

- guest
- free_user
- premium_user
- content_editor
- admin
- super_admin

Kiểm tra quyền ở backend, không dựa vào frontend.

### 22.4. File upload security

- Giới hạn file type.
- Giới hạn file size.
- Scan virus nếu có điều kiện.
- Store private by default.
- Signed URL có thời hạn.
- Không cho upload executable.
- Kiểm tra metadata.

### 22.5. API security

- Rate limit.
- Request validation schema.
- CSRF protection nếu dùng cookie.
- CORS whitelist.
- Helmet/security headers.
- Audit logs.
- Object-level authorization.
- Avoid mass assignment.

---

## 23. Hiệu năng và chịu tải 300–500 concurrent users

### 23.1. Giả định tải

300–500 concurrent users không có nghĩa là 500 requests/giây liên tục. Nhưng cần chuẩn bị:

- Quiz requests nhiều.
- Audio streaming/download.
- AI requests nặng.
- Full test submit đồng thời.
- News/blog traffic từ SEO.

### 23.2. Chiến lược hiệu năng

- CDN cache static assets.
- ISR/SSG cho blog/news.
- Pagination tất cả list.
- Redis cache cho dữ liệu hot.
- Queue cho AI/audio/import.
- Signed URL/CDN cho audio.
- Index database đầy đủ.
- Không query N+1.
- Background jobs cho tác vụ nặng.
- Rate limit AI endpoints.

### 23.3. Database indexes cần có

- users.email
- posts.slug
- posts.category/status/published_at
- vocabularies.topic/level/frequency_rank
- questions.skill/toeic_part/topic/difficulty
- practice_sessions.user_id/created_at
- error_items.user_id/next_review_at/status
- roadmap_items.roadmap_id/day_number/status

### 23.4. Load testing

Dùng:

- k6 hoặc Artillery.

Kịch bản test:

1. 500 user đọc blog.
2. 300 user làm quiz.
3. 100 user làm mini test.
4. 50 user nộp writing cùng lúc.
5. 20 user speaking AI cùng lúc.
6. Admin upload audio/question bank.

---

## 24. SEO và web growth

### 24.1. SEO kỹ thuật

- Server-side rendering cho trang public.
- Sitemap.xml.
- Robots.txt.
- Canonical URL.
- Open Graph.
- JSON-LD FAQ/Article nếu phù hợp.
- Tối ưu Core Web Vitals.
- Image optimization.
- Slug rõ ràng.
- Internal linking.
- Breadcrumb.

### 24.2. SEO content strategy

Các cụm bài nên xây:

- Lộ trình TOEIC 450/650/750.
- Từ vựng TOEIC theo chủ đề.
- Ngữ pháp TOEIC Part 5.
- Cách luyện nghe TOEIC Part 2/3/4.
- Cách luyện Reading Part 7.
- Câu giao tiếp hằng ngày.
- Từ vựng tiếng Anh qua tin tức.
- Lỗi sai phổ biến của người Việt.

### 24.3. Content loop

```text
Blog article
→ Related vocabulary
→ Mini quiz
→ CTA đăng ký roadmap
→ User học thử
→ Dashboard cá nhân
→ Retention bằng daily practice
```

---

## 25. Mobile app roadmap

### 25.1. Vì sao chưa làm mobile ngay

Web trước giúp:

- SEO.
- Ra mắt nhanh.
- Thu user cộng đồng.
- Test nghiệp vụ.
- Giảm chi phí.

Mobile sau giúp:

- Push notification.
- Học mọi lúc.
- Offline vocabulary/listening.
- Retention tốt hơn.

### 25.2. Stack mobile

- Expo React Native.
- TypeScript.
- NativeWind hoặc Tamagui.
- Expo Router.
- Firebase Cloud Messaging.
- Sentry mobile.
- Shared API client từ monorepo.

### 25.3. Tính năng mobile ưu tiên

- Daily vocab.
- Quiz card.
- Streak.
- Listening offline.
- Speaking AI.
- Push reminder.
- Error notebook.
- Roadmap daily tasks.

---

## 26. DevOps / CI/CD

### 26.1. Environments

- Local.
- Development.
- Staging.
- Production.

### 26.2. Git branches

```text
main: production
staging: staging
feature/*: feature branches
hotfix/*: urgent fixes
```

### 26.3. CI pipeline

Mỗi pull request chạy:

- Install.
- Lint.
- Type check.
- Unit test.
- Build.
- Prisma migration check.

### 26.4. CD pipeline

- Merge staging → deploy staging.
- Merge main → deploy production.
- Migration cần review.
- Có rollback plan.

### 26.5. Observability

Cần theo dõi:

- API latency.
- Error rate.
- AI cost.
- Queue length.
- DB CPU/RAM.
- Slow queries.
- Cache hit rate.
- Audio bandwidth.
- Active users.
- Conversion from guest to signup.
- Daily active learners.

---

## 27. Monetization nhưng vẫn free-first

### 27.1. Free nên đủ mạnh

Free user nên học được thật:

- Daily vocab.
- Daily sentences.
- Basic quiz.
- Basic listening.
- Roadmap cơ bản.
- Mini test giới hạn.
- Error notebook giới hạn.
- AI quota nhỏ.

### 27.2. Premium sau này

Premium chỉ nên mở rộng năng lực:

- AI nhiều hơn.
- Full test nhiều hơn.
- Analytics sâu hơn.
- Speaking room dài hơn.
- Writing feedback nâng cao.
- Mobile offline.
- Personalized roadmap nâng cao.

### 27.3. Không nên

- Khóa toàn bộ kiến thức cơ bản.
- Bắt trả tiền mới xem được tiến độ.
- Bắt trả tiền mới học được daily vocab.
- Tạo cảm giác app chỉ là paywall.

---

## 28. Roadmap triển khai sản phẩm

### Phase 0 — Foundation & Governance

- Chốt product scope.
- Story loop và Agent workflow.
- Auth foundation.
- Health check, logging và monitoring.
- Content taxonomy.
- Source/license model.
- Google Drive content inventory design.
- Database và API conventions.

### Phase 1 — Learning Core

- Landing/public experience.
- Auth và onboarding.
- Placement test cơ bản.
- Dashboard.
- Roadmap 30/60/90/120 ngày.
- Vocabulary topic mindmap.
- Spaced repetition.
- Daily practice.
- Error notebook cơ bản.
- CMS vocabulary/content.

### Phase 2 — TOEIC Listening & Reading

- Question bank.
- Part 1–7 practice.
- Practice by topic/difficulty.
- Mini test và half test.
- Timed practice.
- Score and weakness analysis.
- Vocabulary/grammar remediation.

### Phase 3 — Licensed Content Library & Listening

- Google Drive inventory/import workflow.
- Video/audio/document library.
- Transcript.
- Listening drills.
- Shadowing.
- Progress/resume/bookmark.
- Link content to roadmap and vocabulary.

### Phase 4 — TOEIC Speaking, Writing & Four Skills

- TOEIC Speaking task types.
- TOEIC Writing task types.
- Rubrics.
- Audio/submission storage.
- AI-assisted feedback.
- TOEIC Four Skills roadmap.
- Four-skill progress dashboard.

### Phase 5 — Full Test, AI Personalization & Community

- Full mock tests.
- Exam simulation.
- Advanced error notebook.
- Adaptive roadmap.
- AI explanation.
- AI Speaking room.
- AI Writing Coach.
- Community sharing with moderation.

### Phase 6 — Mobile & Premium Expansion

- Expo mobile app.
- Push notifications.
- Offline vocabulary/listening.
- Premium quota and subscription.
- Advanced analytics.

---

## 29. Thứ tự ưu tiên backlog

### Must-have foundation

1. Agent/story workflow.
2. Auth.
3. Content taxonomy.
4. Source/license governance.
5. Onboarding.
6. Placement test cơ bản.
7. Dashboard.
8. Roadmap.
9. Vocabulary mindmap.
10. Spaced repetition.
11. Daily practice.
12. Error notebook.
13. CMS cơ bản.
14. Analytics và monitoring.

### Must-have TOEIC core

1. TOEIC Listening & Reading Part 1–7.
2. Question bank và review workflow.
3. Mini test.
4. Timed practice.
5. Score/weakness analysis.
6. TOEIC vocabulary and grammar remediation.
7. TOEIC Speaking task framework.
8. TOEIC Writing task framework.
9. TOEIC Four Skills roadmap.

### Should-have

1. Licensed content library.
2. Google Drive import pipeline.
3. Listening practice.
4. Shadowing.
5. Full mock test.
6. AI explanation.
7. Speaking/Writing rubric feedback.
8. Gamification.
9. Blog/news SEO.

### Could-have

1. Advanced adaptive roadmap.
2. Graph-RAG.
3. Community content sharing.
4. Mobile app.
5. Premium subscription.
6. Offline learning.

### Won't-have in early MVP

1. Professional camera proctoring.
2. Marketplace.
3. Livestream class.
4. Separate full IELTS exam platform.
5. Native mobile app before web business rules stabilize.

---

## 30. Rủi ro và cách giảm thiểu

### 30.1. Rủi ro bản quyền

Rủi ro:

- Dùng lại tài liệu/đề thi không có quyền.

Giảm thiểu:

- Lưu license_status.
- Chỉ dùng nội dung tự tạo hoặc được cấp phép.
- Không public khóa học đã mua.
- Có quy trình review source.

### 30.2. Rủi ro chi phí AI

Rủi ro:

- User dùng AI quá nhiều làm tăng chi phí.

Giảm thiểu:

- Quota.
- Rate limit.
- Model routing.
- Cache feedback nếu input giống.
- Spend alert.
- Premium credit.

### 30.3. Rủi ro chất lượng AI

Rủi ro:

- AI chấm không nhất quán.
- Feedback sai.

Giảm thiểu:

- Rubric cố định.
- Output JSON schema.
- RAG/Graph-RAG.
- Human review sample.
- Eval bộ test chuẩn.

### 30.4. Rủi ro học sai hướng

Rủi ro:

- Roadmap quá nặng hoặc quá nhẹ.

Giảm thiểu:

- Placement test.
- Rule engine.
- Theo dõi accuracy.
- Recalculate roadmap.
- A/B test roadmap.

### 30.5. Rủi ro gian lận

Rủi ro:

- User copy/dịch/capture khi làm đề.

Giảm thiểu:

- Exam mode.
- Timer server-side.
- Detect tab switch.
- Không gửi answer key trước submit.
- Watermark.
- Log hành vi bất thường.

---

## 31. Checklist production trước khi launch

### Product

- [ ] Có ít nhất 1 roadmap hoàn chỉnh.
- [ ] Có ít nhất 500 từ vựng chất lượng.
- [ ] Có ít nhất 100 quiz card.
- [ ] Có ít nhất 20 daily sentences.
- [ ] Có ít nhất 10 bài SEO.
- [ ] Có admin CMS.
- [ ] Có dashboard học tập.

### Engineering

- [ ] CI/CD chạy ổn.
- [ ] Database migration ổn.
- [ ] Error monitoring.
- [ ] Analytics.
- [ ] Backup.
- [ ] Rate limit.
- [ ] Env secrets an toàn.
- [ ] HTTPS.
- [ ] CDN.

### Security

- [ ] Không expose API keys.
- [ ] RBAC admin.
- [ ] Validate input.
- [ ] CORS config.
- [ ] CAPTCHA auth endpoint.
- [ ] Audit log admin.
- [ ] Signed URL file private.

### SEO

- [ ] Sitemap.xml.
- [ ] Robots.txt.
- [ ] Meta title/description.
- [ ] Open Graph.
- [ ] Canonical.
- [ ] Internal links.
- [ ] Google Search Console.

---

## 32. Tài liệu tham khảo kỹ thuật

Các nguồn chính thức/hữu ích để đối chiếu stack:

- Next.js App Router: https://nextjs.org/docs/app
- Next.js deployment: https://nextjs.org/docs/app/getting-started/deploying
- NestJS: https://nestjs.com/
- Supabase Docs: https://supabase.com/docs
- Supabase Auth: https://supabase.com/auth
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Cloudflare R2 S3 compatibility: https://developers.cloudflare.com/r2/api/s3/api/
- Cloudflare Turnstile: https://developers.cloudflare.com/turnstile/
- OpenAI API Reference: https://platform.openai.com/docs/api-reference
- Microsoft GraphRAG: https://www.microsoft.com/en-us/research/project/graphrag/
- Qdrant: https://qdrant.tech/documentation/
- Neo4j Docs: https://neo4j.com/docs/
- Meilisearch Docs: https://meilisearch.com/docs
- Expo Docs: https://docs.expo.dev/
- Firebase Cloud Messaging: https://firebase.google.com/docs/cloud-messaging
- PostHog Docs: https://posthog.com/docs
- Sentry NestJS: https://docs.sentry.io/platforms/javascript/guides/nestjs/
- Stripe Billing: https://docs.stripe.com/billing/quickstart
- OWASP API Security Top 10: https://owasp.org/API-Security/editions/2023/en/0x00-header/
- OWASP Secrets Management: https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html
- Google Search helpful content: https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- Google Search Essentials: https://developers.google.com/search/docs/essentials
- ETS TOEIC Listening & Reading: https://www.ets.org/toeic/about/listening-reading.html

---

## 32A. Product Scope Guard dành cho Agent

Trước khi triển khai một story, Agent phải xác định story phục vụ ít nhất một mục tiêu:

1. Cải thiện năng lực tiếng Anh tổng quát.
2. Cải thiện kết quả TOEIC.
3. Cải thiện khả năng ghi nhớ từ vựng.
4. Cải thiện tính nhất quán của việc học.
5. Giúp phát hiện và sửa lỗi lặp lại.
6. Giúp người dùng truy cập và học từ nội dung được cấp quyền.
7. Cải thiện khả năng quản trị, bảo mật hoặc đo lường chất lượng học tập.

Nếu story không phục vụ mục tiêu nào, Agent phải đánh dấu cần product review.

Quy tắc bắt buộc:

- Không tự thêm một exam track mới.
- Không biến nội dung IELTS thành nghiệp vụ thi IELTS nếu chưa được phê duyệt.
- Không publish nội dung chưa qua license/review.
- Không để AI quyết định đáp án chuẩn hoặc điểm chính thức.
- Không bỏ qua Error Notebook khi nghiệp vụ phát sinh lỗi học tập.
- Không xây module độc lập nếu có thể tái sử dụng taxonomy/content chung.
- Không thay đổi business rule chỉ để test pass.
- Khi phát hiện bug nghiệp vụ, phải tạo regression test trước hoặc cùng lúc sửa.
- Mọi thay đổi liên quan score, roadmap, quyền nội dung và exam session phải có testcase cho happy path, validation, boundary và failure path.

---

## 33. Kết luận

EnglishPath được xây như một nền tảng học tiếng Anh toàn diện, không chỉ là website giải đề và cũng không bị giới hạn vào một kỳ thi duy nhất. TOEIC Listening & Reading, TOEIC Speaking & Writing và TOEIC Four Skills là các learning track trọng tâm, trong khi nền tảng tiếng Anh, giao tiếp, workplace English, vocabulary mindmap, listening, speaking, writing và nội dung được cấp quyền tiếp tục phục vụ mọi người học.

Sản phẩm cần bắt đầu bằng phần miễn phí đủ tốt: onboarding, roadmap, vocabulary mindmap, daily practice, error notebook, TOEIC core và kho nội dung có cấu trúc. AI, community, Graph-RAG và mobile được mở rộng sau khi business rule và content pipeline đã ổn định.

Cốt lõi sản phẩm là vòng lặp:

```text
Đánh giá đầu vào
→ Tạo lộ trình tối đa 4 tháng
→ Học mỗi ngày
→ Quiz/game hóa
→ Luyện kỹ năng
→ Ghi nhận lỗi sai
→ Ôn lại thông minh
→ Đo tiến bộ
→ Điều chỉnh lộ trình
```

Nếu triển khai đúng, EnglishPath có thể trở thành sản phẩm học tiếng Anh thực tế cho cộng đồng: miễn phí trước, dễ dùng, có tính người, có dữ liệu học tập cá nhân hóa và có khả năng mở rộng thành mobile app/premium platform sau này.
