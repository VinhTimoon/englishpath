import Link from "next/link";
import { GuestTrial } from "./guest-trial";

const paths = [
  ["30", "Tăng tốc", "Đã có nền, cần một mục tiêu gấp"],
  ["60", "Tập trung", "Cải thiện một kỹ năng hoặc mốc điểm"],
  ["90", "Cốt lõi", "Nhịp học phù hợp với phần lớn người học"],
  ["120", "Xây nền", "Bắt đầu lại chắc chắn và toàn diện"],
] as const;

export function PublicHeader() {
  return (
    <header className="public-header" data-widget="PublicHeader">
      <a className="skip-link" href="#main-content">
        Bỏ qua đến nội dung
      </a>
      <nav className="site-container nav-row" aria-label="Điều hướng chính">
        <a className="brand" href="#top" aria-label="EnglishPath, về đầu trang">
          English<span>Path</span>
        </a>
        <div className="nav-links">
          <a href="#lo-trinh">Lộ trình</a>
          <a href="#cach-hoc">Cách học</a>
          <Link href="/vocabulary">Từ vựng</Link>
          <Link href="/blog">Blog</Link>
        </div>
        <a className="button button-small" href="#guest-trial">
          Học thử miễn phí
        </a>
      </nav>
    </header>
  );
}

export function Hero() {
  return (
    <>
      <section className="hero" id="top" data-widget="Hero">
        <div className="site-container hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">Một bước nhỏ, mỗi ngày</p>
            <h1>
              Đừng học nhiều hơn.
              <br className="hero-break" /> Hãy học đúng đường.
            </h1>
            <p className="hero-lead">
              EnglishPath biến mục tiêu tiếng Anh của bạn thành một nhịp học
              ngắn, rõ việc và đủ bền để tiến bộ thật.
            </p>
            <div className="hero-actions">
              <a className="button" href="#guest-trial">
                Bắt đầu bài học mẫu
              </a>
              <a className="text-link" href="#lo-trinh">
                Xem lộ trình 30–120 ngày
              </a>
            </div>
            <p className="quiet-note">
              Miễn phí để bắt đầu · Không cần thẻ thanh toán
            </p>
          </div>
          <div
            className="lesson-preview"
            aria-label="Bản xem trước nhịp học hôm nay"
          >
            <p className="eyebrow">Hôm nay · 15 phút</p>
            <p className="preview-word" lang="en">
              consistency
            </p>
            <p className="preview-meaning">/kənˈsɪstənsi/ · sự đều đặn</p>
            <div className="preview-progress">
              <span />
            </div>
            <p>1 từ mới · 1 quiz · 1 câu dùng ngay</p>
          </div>
        </div>
      </section>
      <GuestTrial />
    </>
  );
}

export function LearningLoop() {
  return (
    <section
      className="learning-loop"
      data-widget="LearningLoop"
      aria-labelledby="loop-title"
    >
      <div className="site-container">
        <div className="section-heading">
          <p className="eyebrow">Nhịp học mỗi ngày</p>
          <h2 id="loop-title">Ít bước hơn, mỗi bước có lý do</h2>
        </div>
        <ol className="loop-grid">
          <li>
            <span>01</span>
            <h3>Gặp từ mới</h3>
            <p>Học theo chủ đề và ngữ cảnh, không học danh sách rời rạc.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Kiểm tra nhanh</h3>
            <p>Một quiz ngắn giúp bạn biết mình hiểu thật hay chỉ thấy quen.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Dùng thành câu</h3>
            <p>Chuyển kiến thức thành một câu có thể nói hoặc viết ngay.</p>
          </li>
          <li>
            <span>04</span>
            <h3>Ôn đúng lỗi</h3>
            <p>Quay lại điểm yếu thay vì lặp lại mọi thứ từ đầu.</p>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function PathPreview() {
  return (
    <section
      className="path-section"
      id="lo-trinh"
      data-widget="PathPreview"
      aria-labelledby="path-title"
    >
      <div className="site-container">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Lộ trình có giới hạn</p>
            <h2 id="path-title">Chọn một đích đến đủ rõ</h2>
          </div>
          <p>
            Không có lộ trình chính nào dài quá bốn tháng. Bạn luôn biết mình
            đang ở đâu và bước tiếp theo là gì.
          </p>
        </div>
        <div className="path-grid">
          {paths.map(([days, title, description]) => (
            <article className={`path-card path-${days}`} key={days}>
              <p>
                <strong>{days}</strong> ngày
              </p>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function OutcomeProof() {
  return (
    <section
      className="proof-section"
      data-widget="OutcomeProof"
      aria-labelledby="proof-title"
    >
      <div className="site-container proof-grid">
        <div>
          <p className="eyebrow">Tiến bộ nhìn thấy được</p>
          <h2 id="proof-title">Đo bằng việc bạn làm được hôm nay</h2>
        </div>
        <blockquote>
          “Một ngày tốt không cần dài. Nó cần đủ rõ để bạn muốn quay lại vào
          ngày mai.”
        </blockquote>
        <dl className="proof-stats">
          <div>
            <dt>15 phút</dt>
            <dd>một phiên học mẫu</dd>
          </div>
          <div>
            <dt>3 việc</dt>
            <dd>nếu bạn có dưới 30 phút</dd>
          </div>
          <div>
            <dt>0 áp lực</dt>
            <dd>để bắt đầu miễn phí</dd>
          </div>
        </dl>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section
      className="how-section"
      id="cach-hoc"
      data-widget="HowItWorks"
      aria-labelledby="how-title"
    >
      <div className="site-container">
        <div className="section-heading">
          <p className="eyebrow">Cách EnglishPath đồng hành</p>
          <h2 id="how-title">Bốn bước, một nhịp học liền mạch</h2>
        </div>
        <ol className="how-grid">
          <li>
            <span>1</span>
            <h3>Chọn mục tiêu</h3>
            <p>Một mục tiêu chính để không dàn trải.</p>
          </li>
          <li>
            <span>2</span>
            <h3>Nhận đường đi</h3>
            <p>Lộ trình 30, 60, 90 hoặc 120 ngày.</p>
          </li>
          <li>
            <span>3</span>
            <h3>Luyện mỗi ngày</h3>
            <p>Học, làm, nhận phản hồi trong phiên ngắn.</p>
          </li>
          <li>
            <span>4</span>
            <h3>Ôn điểm yếu</h3>
            <p>Lỗi sai trở thành việc cần ôn tiếp theo.</p>
          </li>
        </ol>
      </div>
    </section>
  );
}

export function ContentPreview() {
  return (
    <section
      className="content-section"
      data-widget="ContentPreview"
      aria-labelledby="content-title"
    >
      <div className="site-container">
        <div className="section-heading split-heading">
          <div>
            <p className="eyebrow">Đọc để học tốt hơn</p>
            <h2 id="content-title">Ghi chú từ EnglishPath</h2>
          </div>
          <Link className="text-link" href="/blog">
            Xem tất cả bài viết
          </Link>
        </div>
        <div className="content-grid">
          <article>
            <p className="content-tag">Thói quen học</p>
            <h3>10 phút tiếng Anh mỗi ngày có thể thay đổi điều gì?</h3>
            <p>
              Một cách thiết kế nhịp học đủ nhỏ để bắt đầu và đủ thật để duy
              trì.
            </p>
            <Link href="/blog/lo-trinh-10-phut-hoc-tieng-anh">
              Đọc bài viết
            </Link>
          </article>
          <article>
            <p className="content-tag">Giao tiếp</p>
            <h3>Say, tell, speak, talk khác nhau thế nào?</h3>
            <p>
              Phân biệt qua tình huống thay vì ghi nhớ bốn định nghĩa rời rạc.
            </p>
            <Link href="/blog/say-tell-speak-talk-khac-nhau">Đọc bài viết</Link>
          </article>
        </div>
      </div>
    </section>
  );
}

export function FinalCallToAction() {
  return (
    <section
      className="final-cta"
      data-widget="FinalCallToAction"
      aria-labelledby="cta-title"
    >
      <div className="site-container">
        <p className="eyebrow">Bạn không cần chờ thứ Hai</p>
        <h2 id="cta-title">Bắt đầu bằng một ngày học mẫu.</h2>
        <p>
          Chọn mục tiêu, xem đúng loại bài bạn sẽ gặp và quyết định theo nhịp
          của mình.
        </p>
        <a className="button button-light" href="#guest-trial">
          Thử ngay trên trang
        </a>
      </div>
    </section>
  );
}

export function PublicFooter() {
  return (
    <footer className="public-footer" data-widget="PublicFooter">
      <div className="site-container footer-row">
        <div>
          <a className="brand" href="#top">
            English<span>Path</span>
          </a>
          <p>Học tiếng Anh miễn phí, có đường đi.</p>
        </div>
        <nav aria-label="Điều hướng chân trang">
          <a href="#lo-trinh">Lộ trình</a>
          <Link href="/vocabulary">Từ vựng</Link>
          <Link href="/blog">Blog</Link>
          <a href="mailto:hello@englishpath.local">Liên hệ</a>
        </nav>
        <p>© 2026 EnglishPath</p>
      </div>
    </footer>
  );
}
