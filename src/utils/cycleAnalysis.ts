import type { CycleEntry, CycleMucus } from '../types';
import type { CycleInfo } from './cycleUtils';
import { daysBetween } from './cycleUtils';

export type HealthLevel = 'normal' | 'caution' | 'concern';

export interface HealthSignal {
  id:              string;
  category:        'cycle' | 'period' | 'mucus' | 'ovulation' | 'luteal' | 'spotting';
  level:           HealthLevel;
  title:           string;
  detail:          string;
  recommendation?: string;
}

export interface CyclePhase {
  name:      string;
  startDate: string;
  endDate:   string;
  type:      'menstruation' | 'pre-ovulatory' | 'peak' | 'luteal';
  color:     string;
  days:      number;
}

export interface CycleAnalysisResult {
  cycle:             CycleInfo;
  ovulationDay:      number | null;  // 1-based cycle day of peak
  luteaPhaseLength:  number | null;  // days from peak to next period start
  preOvulatoryDays:  number | null;  // days from period end to peak
  bestMucus:         CycleMucus;
  hasFertileMucus:   boolean;
  peakQuality:       'confirmed' | 'auto' | 'none';
  phases:            CyclePhase[];
  signals:           HealthSignal[];
  overallLevel:      HealthLevel;
}

const MUCUS_RANK: Record<string, number> = {
  none: 0, sticky: 1, creamy: 2, watery: 3, egg_white: 4,
};

export function analyzeCycle(
  cycle:      CycleInfo,
  allEntries: CycleEntry[],
  nextCycle?: CycleInfo,
): CycleAnalysisResult {
  const rangeEnd = nextCycle?.startDate ?? '9999-99-99';
  const sorted   = allEntries
    .filter(e => e.date >= cycle.startDate && e.date < rangeEnd)
    .sort((a, b) => a.date.localeCompare(b.date));

  const effectivePeak = cycle.peakDate ?? cycle.autoPeakDate;

  const ovulationDay   = effectivePeak ? daysBetween(cycle.startDate, effectivePeak) + 1 : null;
  const luteaPhaseLength = effectivePeak && nextCycle
    ? daysBetween(effectivePeak, nextCycle.startDate) - 1
    : null;
  const preOvulatoryDays = effectivePeak
    ? Math.max(0, daysBetween(cycle.periodEnd, effectivePeak))
    : null;

  let bestMucus: CycleMucus = 'none';
  for (const e of sorted) {
    if (MUCUS_RANK[e.mucus] > MUCUS_RANK[bestMucus]) bestMucus = e.mucus as CycleMucus;
  }
  const hasFertileMucus = bestMucus === 'watery' || bestMucus === 'egg_white';
  const peakQuality: CycleAnalysisResult['peakQuality'] =
    cycle.peakDate ? 'confirmed' : cycle.autoPeakDate ? 'auto' : 'none';

  // ── Health signals ─────────────────────────────────────────────────────────
  const signals: HealthSignal[] = [];

  // 1. Cycle length
  if (cycle.cycleLength !== null) {
    const l = cycle.cycleLength;
    if (l >= 21 && l <= 35) {
      signals.push({ id: 'cycle', category: 'cycle', level: 'normal',
        title: `Độ dài chu kỳ bình thường (${l} ngày)`,
        detail: 'Chu kỳ nằm trong khoảng 21–35 ngày — phù hợp với tiêu chuẩn sinh lý bình thường.' });
    } else if (l < 21) {
      signals.push({ id: 'cycle', category: 'cycle', level: 'concern',
        title: `Chu kỳ ngắn bất thường (${l} ngày)`,
        detail: 'Chu kỳ dưới 21 ngày có thể do cường giáp, căng thẳng mãn tính, suy buồng trứng sớm hoặc tiền mãn kinh.',
        recommendation: 'Theo dõi thêm 2–3 chu kỳ. Nếu tiếp tục ngắn, kiểm tra hormone: TSH, T3/T4, FSH, LH.' });
    } else if (l <= 45) {
      signals.push({ id: 'cycle', category: 'cycle', level: 'caution',
        title: `Chu kỳ dài (${l} ngày)`,
        detail: 'Chu kỳ 35–45 ngày có thể do suy giáp, hội chứng buồng trứng đa nang (PCOS), căng thẳng hoặc tập luyện cường độ cao.',
        recommendation: 'Ghi lại chất nhầy mỗi ngày để xác định có phóng noãn không. Kiểm tra TSH, testosterone, DHEA-S nếu tái diễn.' });
    } else {
      signals.push({ id: 'cycle', category: 'cycle', level: 'concern',
        title: `Chu kỳ rất dài (${l} ngày)`,
        detail: 'Chu kỳ trên 45 ngày thường chỉ ra anovulation (không phóng noãn), PCOS nặng hoặc rối loạn nội tiết nghiêm trọng.',
        recommendation: 'Cần thăm khám bác sĩ: xét nghiệm FSH, LH, estradiol, AMH, testosterone và siêu âm buồng trứng.' });
    }
  }

  // 2. Period duration
  const bd = cycle.bleedingDays;
  if (bd === 1) {
    signals.push({ id: 'period', category: 'period', level: 'concern',
      title: 'Kỳ kinh rất ngắn (1 ngày)',
      detail: 'Chỉ 1 ngày ra máu có thể do nội mạc tử cung mỏng (hội chứng Asherman), thiếu estrogen, hoặc nhầm với đốm máu làm tổ (implantation bleeding) khi có thai.',
      recommendation: 'Thử thai nếu nghi ngờ. Siêu âm đo độ dày nội mạc và kiểm tra estradiol.' });
  } else if (bd < 3) {
    signals.push({ id: 'period', category: 'period', level: 'caution',
      title: `Kỳ kinh ngắn (${bd} ngày)`,
      detail: 'Kỳ kinh dưới 3 ngày có thể do nồng độ estrogen thấp, rối loạn tuyến giáp hoặc giảm cân nhanh.',
      recommendation: 'Kiểm tra estradiol vào ngày 2–3 của chu kỳ nếu liên tục ngắn.' });
  } else if (bd <= 7) {
    signals.push({ id: 'period', category: 'period', level: 'normal',
      title: `Kỳ kinh bình thường (${bd} ngày)`,
      detail: 'Thời gian kinh nguyệt 3–7 ngày là hoàn toàn bình thường.' });
  } else if (bd <= 10) {
    signals.push({ id: 'period', category: 'period', level: 'caution',
      title: `Kỳ kinh kéo dài (${bd} ngày)`,
      detail: 'Kinh nguyệt 8–10 ngày có thể do u xơ tử cung, polyp nội mạc, lạc nội mạc tử cung (endometriosis) hoặc rối loạn đông máu.',
      recommendation: 'Siêu âm tử cung để loại trừ u xơ và polyp. Kiểm tra ferritin nếu có triệu chứng mệt mỏi, thiếu máu.' });
  } else {
    signals.push({ id: 'period', category: 'period', level: 'concern',
      title: `Kỳ kinh kéo dài đáng lo ngại (${bd} ngày)`,
      detail: 'Kinh nguyệt trên 10 ngày cần được đánh giá y tế. Có thể do lạc nội mạc nặng, u xơ lớn, adenomyosis hoặc rối loạn đông máu.',
      recommendation: 'Khám phụ khoa, siêu âm và xét nghiệm đông máu, ferritin.' });
  }

  // 3. Mucus pattern
  if (!hasFertileMucus) {
    if (bestMucus === 'none') {
      signals.push({ id: 'mucus', category: 'mucus', level: 'caution',
        title: 'Không quan sát thấy chất nhầy',
        detail: 'Không có chất nhầy cổ tử cung được ghi nhận. Trong Billings, Basic Infertile Pattern (BIP — toàn ngày khô) là bình thường ở một số người, nhưng cũng có thể chỉ ra khô âm đạo bệnh lý hoặc thiếu estrogen.',
        recommendation: 'Hãy ghi lại cảm giác ở vùng âm hộ mỗi tối sau mỗi ngày, kể cả khi cảm thấy hoàn toàn khô.' });
    } else {
      signals.push({ id: 'mucus', category: 'mucus', level: 'caution',
        title: `Chất nhầy chất lượng thấp (tốt nhất quan sát được: ${bestMucus})`,
        detail: 'Không phát hiện chất nhầy dạng egg-white — loại chất nhầy màu mỡ nhất, hỗ trợ tinh trùng di chuyển tốt nhất. Chất nhầy đặc/dính không tạo điều kiện tối ưu cho thụ thai.',
        recommendation: 'Có thể do thiếu estrogen hoặc cổ tử cung giảm chức năng tiết nhầy. Kiểm tra estradiol nếu muốn thụ thai.' });
    }
  } else {
    signals.push({ id: 'mucus', category: 'mucus', level: 'normal',
      title: `Chất nhầy chất lượng tốt (${bestMucus === 'egg_white' ? 'egg-white' : 'watery'})`,
      detail: `Quan sát thấy chất nhầy dạng ${bestMucus === 'egg_white' ? 'giống lòng trắng trứng (egg-white)' : 'loãng, trong suốt (watery)'} — dấu hiệu estrogen tốt, thể trạng sinh sản thuận lợi.` });
  }

  // 4. Ovulation / peak timing
  if (peakQuality === 'none') {
    signals.push({ id: 'ovulation', category: 'ovulation', level: 'caution',
      title: 'Không xác định được ngày đỉnh',
      detail: 'Không phát hiện ngày đỉnh trong chu kỳ này. Có thể do không phóng noãn (anovulation), hoặc chưa ghi nhận đủ dữ liệu mỗi ngày trong giai đoạn giữa chu kỳ.',
      recommendation: 'Hãy ghi lại cảm giác và chất nhầy mỗi ngày, đặc biệt ngày 8–22 của chu kỳ.' });
  } else if (ovulationDay !== null) {
    if (ovulationDay >= 11 && ovulationDay <= 21) {
      signals.push({ id: 'ovulation', category: 'ovulation', level: 'normal',
        title: `Phóng noãn đúng thời điểm (ngày ${ovulationDay} của chu kỳ)`,
        detail: `Ngày đỉnh vào ngày ${ovulationDay} — nằm trong khoảng bình thường (ngày 11–21). ${peakQuality === 'auto' ? '(Phát hiện tự động)' : '(Đã xác nhận)'}` });
    } else if (ovulationDay < 11) {
      signals.push({ id: 'ovulation', category: 'ovulation', level: 'caution',
        title: `Phóng noãn sớm (ngày ${ovulationDay} của chu kỳ)`,
        detail: `Phóng noãn trước ngày 11 có thể do chu kỳ ngắn tự nhiên hoặc estrogen tăng sớm. Pha hoàng thể sau đỉnh có thể ngắn.`,
        recommendation: 'Tính pha hoàng thể. Nếu dưới 10 ngày, xét nghiệm progesterone vào ngày 7 sau đỉnh.' });
    } else {
      signals.push({ id: 'ovulation', category: 'ovulation', level: 'caution',
        title: `Phóng noãn muộn (ngày ${ovulationDay} của chu kỳ)`,
        detail: `Phóng noãn sau ngày 21 thường gặp ở chu kỳ dài, PCOS, hoặc căng thẳng kéo dài. ${peakQuality === 'auto' ? '(Phát hiện tự động)' : ''}`,
        recommendation: 'Quan sát xem có các dấu hiệu PCOS: da dầu, mụn, tóc rụng, cân nặng tăng.' });
    }
  }

  // 5. Luteal phase
  if (luteaPhaseLength !== null) {
    if (luteaPhaseLength >= 10 && luteaPhaseLength <= 16) {
      signals.push({ id: 'luteal', category: 'luteal', level: 'normal',
        title: `Pha hoàng thể bình thường (${luteaPhaseLength} ngày)`,
        detail: `Pha sau đỉnh kéo dài ${luteaPhaseLength} ngày — trong khoảng bình thường (10–16 ngày). Progesterone đủ để duy trì niêm mạc tử cung.` });
    } else if (luteaPhaseLength < 10) {
      signals.push({ id: 'luteal', category: 'luteal', level: 'concern',
        title: `Pha hoàng thể ngắn — Luteal Phase Defect (${luteaPhaseLength} ngày)`,
        detail: `Pha hoàng thể dưới 10 ngày gợi ý thiếu hụt progesterone. Điều này có thể gây khó thụ thai, kinh nguyệt sớm, hoặc sảy thai sớm tái phát.`,
        recommendation: 'Xét nghiệm progesterone vào ngày 7 sau đỉnh (mid-luteal). Tham khảo bác sĩ về liệu pháp progesterone nếu cần.' });
    } else {
      signals.push({ id: 'luteal', category: 'luteal', level: 'caution',
        title: `Pha hoàng thể dài (${luteaPhaseLength} ngày)`,
        detail: `Pha hoàng thể trên 16 ngày có thể chỉ ra thai kỳ sớm, nang hoàng thể kéo dài, hoặc ngày đỉnh được xác định chưa chính xác.`,
        recommendation: `Làm test thai nếu trên 17 ngày mà chưa có kinh.` });
    }
  }

  // 6. Mid-cycle spotting
  const midSpotting = sorted.filter(e =>
    e.bleeding === 'spotting' &&
    e.date > cycle.periodEnd &&
    (nextCycle ? e.date < nextCycle.startDate : true),
  );
  if (midSpotting.length > 0) {
    const nearPeak = effectivePeak &&
      midSpotting.some(e => Math.abs(daysBetween(e.date, effectivePeak!)) <= 2);
    if (nearPeak) {
      signals.push({ id: 'spotting', category: 'spotting', level: 'normal',
        title: 'Ra máu nhẹ quanh ngày phóng noãn',
        detail: 'Đốm máu quanh ngày đỉnh là hiện tượng bình thường (ovulation spotting / Mittelschmerz) — do nang noãn vỡ làm estrogen giảm thoáng qua.' });
    } else {
      signals.push({ id: 'spotting', category: 'spotting', level: 'caution',
        title: `Ra máu giữa chu kỳ (${midSpotting.length} ngày)`,
        detail: 'Đốm máu giữa chu kỳ không liên quan đến phóng noãn có thể do polyp cổ tử cung, lạc nội mạc tử cung, rối loạn hormone hoặc viêm nhiễm.',
        recommendation: 'Nếu xảy ra nhiều chu kỳ liên tiếp, nên soi cổ tử cung và siêu âm để loại trừ polyp và lạc nội mạc.' });
    }
  }

  // Overall severity
  const overallLevel: HealthLevel = signals.some(s => s.level === 'concern')
    ? 'concern'
    : signals.some(s => s.level === 'caution')
      ? 'caution'
      : 'normal';

  // ── Phase timeline ──────────────────────────────────────────────────────────
  const phases: CyclePhase[] = [];
  phases.push({
    name: 'Kỳ kinh',
    startDate: cycle.startDate,
    endDate:   cycle.periodEnd,
    type:      'menstruation',
    color:     '#FCA5A5',
    days:      cycle.bleedingDays,
  });

  const postPeriodStart = cycle.periodEnd;
  const peakOrEnd       = effectivePeak ?? (nextCycle?.startDate ?? null);
  if (peakOrEnd && daysBetween(postPeriodStart, peakOrEnd) > 0) {
    phases.push({
      name:      'Giai đoạn trước phóng noãn',
      startDate: postPeriodStart,
      endDate:   effectivePeak ?? peakOrEnd,
      type:      'pre-ovulatory',
      color:     '#FDE68A',
      days:      daysBetween(postPeriodStart, peakOrEnd),
    });
  }

  if (effectivePeak) {
    phases.push({
      name:      'Ngày đỉnh',
      startDate: effectivePeak,
      endDate:   effectivePeak,
      type:      'peak',
      color:     '#34D399',
      days:      1,
    });
    if (nextCycle && daysBetween(effectivePeak, nextCycle.startDate) > 1) {
      phases.push({
        name:      'Pha hoàng thể',
        startDate: effectivePeak,
        endDate:   nextCycle.startDate,
        type:      'luteal',
        color:     '#BAE6FD',
        days:      daysBetween(effectivePeak, nextCycle.startDate) - 1,
      });
    }
  }

  return {
    cycle, ovulationDay, luteaPhaseLength, preOvulatoryDays,
    bestMucus, hasFertileMucus, peakQuality,
    phases, signals, overallLevel,
  };
}
