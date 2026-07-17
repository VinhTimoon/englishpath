"use client";

import { useState } from "react";
import { guestGoals, type GuestGoalId } from "./guest-trial-data";

export function GuestTrial() {
  const [selectedId, setSelectedId] = useState<GuestGoalId>(guestGoals[0].id);
  const selected =
    guestGoals.find((goal) => goal.id === selectedId) ?? guestGoals[0];

  return (
    <section
      className="guest-trial"
      id="guest-trial"
      aria-labelledby="trial-title"
    >
      <div className="section-heading">
        <p className="eyebrow">Học thử không cần tài khoản</p>
        <h2 id="trial-title">Chọn mục tiêu, xem một ngày học mẫu</h2>
        <p>
          Nội dung thay đổi ngay trên thiết bị của bạn. Không gửi dữ liệu và
          không tạo tiến độ giả.
        </p>
      </div>

      <div className="trial-layout">
        <fieldset className="goal-picker">
          <legend>Mục tiêu chính của bạn</legend>
          {guestGoals.map((goal) => (
            <label key={goal.id} className="goal-option">
              <input
                type="radio"
                name="guest-goal"
                value={goal.id}
                checked={selectedId === goal.id}
                onChange={() => setSelectedId(goal.id)}
              />
              <span>{goal.label}</span>
            </label>
          ))}
        </fieldset>

        <div className="sample-day" aria-live="polite" data-testid="sample-day">
          <div className="sample-title">
            <div>
              <p className="eyebrow">Ngày học mẫu · {selected.duration}</p>
              <h3>{selected.label}</h3>
            </div>
            <span>15 phút</span>
          </div>
          <p className="sample-focus">Trọng tâm: {selected.focus}</p>
          <dl className="sample-list">
            <div>
              <dt>Từ vựng</dt>
              <dd>{selected.vocabulary}</dd>
            </div>
            <div>
              <dt>Quiz nhanh</dt>
              <dd>{selected.quiz}</dd>
            </div>
            <div>
              <dt>Câu hôm nay</dt>
              <dd lang="en">{selected.sentence}</dd>
            </div>
          </dl>
          <p className="trial-disclosure" role="note">
            Đây là bản xem trước dành cho khách. Kết quả không được lưu; full
            test, lộ trình cá nhân hóa và sổ lỗi riêng chỉ mở khi các tính năng
            tài khoản sẵn sàng.
          </p>
        </div>
      </div>
    </section>
  );
}
