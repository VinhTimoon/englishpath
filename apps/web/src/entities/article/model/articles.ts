export type ArticleSection = {
  heading: string;
  paragraphs: string[];
  example?: { label: string; english: string; vietnamese: string };
};

export type ArticleFaq = { question: string; answer: string };

export type Article = {
  title: string;
  slug: string;
  seoTitle: string;
  metaDescription: string;
  excerpt: string;
  category: string;
  tags: string[];
  publishedAt: string;
  updatedAt: string;
  readingMinutes: number;
  sections: ArticleSection[];
  faq: ArticleFaq[];
  relatedSlugs: string[];
};

export const articles: Article[] = [
  {
    title: "7 cụm tiếng Anh giúp cuộc trò chuyện tự nhiên hơn",
    slug: "7-cum-tieng-anh-giao-tiep-tu-nhien",
    seoTitle: "7 cụm tiếng Anh giao tiếp tự nhiên, dễ dùng mỗi ngày",
    metaDescription:
      "Học 7 cụm tiếng Anh ngắn, có ngữ cảnh và ví dụ để phản xạ tự nhiên hơn trong hội thoại hằng ngày.",
    excerpt:
      "Thay những câu trả lời ngắn, cứng bằng các cụm từ người học có thể dùng ngay trong đời sống.",
    category: "Daily English",
    tags: ["Giao tiếp", "Cụm từ", "A2-B1"],
    publishedAt: "2026-07-10",
    updatedAt: "2026-07-10",
    readingMinutes: 6,
    sections: [
      {
        heading: "Học theo cả cụm, không ghép từng từ",
        paragraphs: [
          "Một cụm từ luôn đi cùng tình huống. Khi ghi nhớ cả câu mẫu, bạn giảm thời gian dịch trong đầu và phản hồi tự nhiên hơn.",
          "Hãy chọn hai cụm phù hợp với đời sống của bạn, đặt câu riêng rồi nói thành tiếng ba lần.",
        ],
        example: {
          label: "Khi đồng ý tham gia",
          english: "I'm up for it. What time should we meet?",
          vietnamese: "Mình tham gia nhé. Mấy giờ chúng ta gặp?",
        },
      },
      {
        heading: "Ba cụm để giữ nhịp hội thoại",
        paragraphs: [
          "That makes sense thể hiện bạn hiểu ý đối phương. Let me think giúp bạn có thêm thời gian. It depends mở đầu cho một câu trả lời có điều kiện.",
          "Đừng cố dùng tất cả trong một lần. Một cụm được dùng đúng ngữ cảnh có giá trị hơn một danh sách dài chỉ đọc qua.",
        ],
        example: {
          label: "Khi cần suy nghĩ",
          english: "Let me think. I might be free on Friday.",
          vietnamese: "Để mình nghĩ xem. Có thể thứ Sáu mình rảnh.",
        },
      },
      {
        heading: "Bốn cụm để phản hồi thân thiện",
        paragraphs: [
          "Sounds good, no worries, good point và I get what you mean đều ngắn nhưng giúp câu trả lời có sắc thái. Luyện chúng với người, thời gian và chủ đề khác nhau.",
        ],
      },
    ],
    faq: [
      {
        question: "Có nên học thuộc cả câu mẫu không?",
        answer:
          "Có, nhưng hãy thay một vài chi tiết để câu gắn với chính bạn thay vì lặp máy móc.",
      },
      {
        question: "Mỗi ngày nên học bao nhiêu cụm?",
        answer:
          "Hai đến ba cụm có luyện nói và ôn lại thường hiệu quả hơn một danh sách dài.",
      },
    ],
    relatedSlugs: [
      "lo-trinh-10-phut-hoc-tieng-anh",
      "say-tell-speak-talk-khac-nhau",
    ],
  },
  {
    title: "Lộ trình 10 phút học tiếng Anh mỗi ngày",
    slug: "lo-trinh-10-phut-hoc-tieng-anh",
    seoTitle: "Lộ trình học tiếng Anh 10 phút mỗi ngày cho người bận rộn",
    metaDescription:
      "Thiết kế một phiên học tiếng Anh 10 phút gồm ôn, học, luyện và ghi lại bước tiếp theo để duy trì lâu dài.",
    excerpt:
      "Một khung học ngắn, đủ rõ để bắt đầu ngay và đủ nhẹ để duy trì trong những ngày bận rộn.",
    category: "Roadmap học tiếng Anh",
    tags: ["Lộ trình", "Thói quen", "Tự học"],
    publishedAt: "2026-07-08",
    updatedAt: "2026-07-12",
    readingMinutes: 5,
    sections: [
      {
        heading: "Hai phút ôn lại",
        paragraphs: [
          "Bắt đầu bằng ba từ hoặc một mẫu câu của hôm trước. Tự nhớ trước khi mở ghi chú để kiểm tra điều gì đã thực sự ở lại.",
        ],
      },
      {
        heading: "Năm phút học một mục tiêu",
        paragraphs: [
          "Chỉ chọn một mục tiêu: một cụm từ, một điểm ngữ pháp hoặc một đoạn nghe ngắn. Giới hạn này giúp bạn hoàn thành thay vì liên tục đổi tài liệu.",
        ],
        example: {
          label: "Mục tiêu hôm nay",
          english: "Use 'It depends' in two personal examples.",
          vietnamese: "Dùng 'It depends' trong hai ví dụ của riêng mình.",
        },
      },
      {
        heading: "Ba phút tạo đầu ra",
        paragraphs: [
          "Nói hoặc viết hai câu không nhìn mẫu. Cuối phiên, ghi một dòng về nội dung cần ôn vào ngày mai.",
          "Nếu bỏ lỡ một ngày, hãy quay lại với phiên ôn nhẹ. Không cần học bù gấp đôi.",
        ],
      },
    ],
    faq: [
      {
        question: "Mười phút có đủ để tiến bộ không?",
        answer:
          "Mười phút không thay thế mọi hình thức luyện tập, nhưng là nền tảng thực tế để duy trì tiếp xúc và tích lũy kỹ năng.",
      },
      {
        question: "Nên học kỹ năng nào trước?",
        answer:
          "Chọn kỹ năng gần mục tiêu nhất và giữ một trọng tâm trong ít nhất một tuần trước khi điều chỉnh.",
      },
    ],
    relatedSlugs: [
      "7-cum-tieng-anh-giao-tiep-tu-nhien",
      "say-tell-speak-talk-khac-nhau",
    ],
  },
  {
    title: "Say, tell, speak và talk khác nhau thế nào?",
    slug: "say-tell-speak-talk-khac-nhau",
    seoTitle: "Phân biệt say, tell, speak và talk bằng ví dụ dễ nhớ",
    metaDescription:
      "Phân biệt say, tell, speak và talk theo cấu trúc, tình huống và ví dụ tiếng Anh thực tế dành cho người Việt.",
    excerpt:
      "Bốn động từ đều liên quan đến nói, nhưng cấu trúc theo sau và trọng tâm của câu không giống nhau.",
    category: "Grammar Guide",
    tags: ["Ngữ pháp", "Từ dễ nhầm", "A2"],
    publishedAt: "2026-07-05",
    updatedAt: "2026-07-05",
    readingMinutes: 7,
    sections: [
      {
        heading: "Say tập trung vào lời được nói",
        paragraphs: [
          "Say thường đi với nội dung lời nói. Khi thêm người nghe, dùng say something to someone.",
        ],
        example: {
          label: "Cấu trúc",
          english: "She said hello to the new student.",
          vietnamese: "Cô ấy chào bạn học sinh mới.",
        },
      },
      {
        heading: "Tell thường cần người nhận",
        paragraphs: [
          "Tell thường theo sau bởi người nghe: tell me, tell us, tell your teacher. Một số cụm quen thuộc là tell a story và tell the truth.",
        ],
        example: {
          label: "Cấu trúc",
          english: "Can you tell me the answer?",
          vietnamese: "Bạn có thể cho mình biết câu trả lời không?",
        },
      },
      {
        heading: "Speak và talk nhấn vào hoạt động giao tiếp",
        paragraphs: [
          "Speak thường trang trọng hơn hoặc nói về khả năng ngôn ngữ. Talk tự nhiên trong hội thoại và thường gợi một cuộc trao đổi hai chiều.",
          "Dùng speak to hoặc talk to khi đề cập người đối thoại; talk about khi nêu chủ đề.",
        ],
        example: {
          label: "So sánh",
          english: "I speak English at work, and I talk to clients every day.",
          vietnamese:
            "Tôi dùng tiếng Anh ở nơi làm việc và trò chuyện với khách hàng mỗi ngày.",
        },
      },
    ],
    faq: [
      {
        question: "Có thể nói tell to me không?",
        answer:
          "Không trong cấu trúc thông thường. Dùng tell me, nhưng dùng say something to me.",
      },
      {
        question: "Speak và talk có luôn thay thế nhau được không?",
        answer:
          "Không. Một số ngữ cảnh chấp nhận cả hai, nhưng speak phù hợp hơn với ngôn ngữ và tình huống trang trọng.",
      },
    ],
    relatedSlugs: [
      "7-cum-tieng-anh-giao-tiep-tu-nhien",
      "lo-trinh-10-phut-hoc-tieng-anh",
    ],
  },
];

export function getArticle(slug: string) {
  return articles.find((article) => article.slug === slug);
}
