const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function pad(value) {
  return String(value).padStart(2, "0");
}

function getKstParts(date) {
  const kstDate = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    year: kstDate.getUTCFullYear(),
    month: pad(kstDate.getUTCMonth() + 1),
    day: pad(kstDate.getUTCDate()),
    hour: pad(kstDate.getUTCHours()),
    minute: pad(kstDate.getUTCMinutes()),
    second: pad(kstDate.getUTCSeconds())
  };
}

function formatTime(date) {
  const parts = getKstParts(date);
  return `${parts.hour}:${parts.minute}:${parts.second}`;
}

function formatDateTime(date) {
  const parts = getKstParts(date);
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}`;
}

function formatHour(date) {
  const parts = getKstParts(date);
  return `${parts.hour}:00`;
}

export function classifyClicks(rawClicks) {
  const ascending = [...rawClicks].sort((a, b) => a.createdAt - b.createdAt);
  const history = new Map();

  const classified = ascending.map((click) => {
    const key = `${click.advertiser}|${click.campaign}|${click.ip}`;
    const windowStart = click.createdAt.getTime() - 10 * 60 * 1000;
    const recent = (history.get(key) || []).filter((item) => item.createdAt.getTime() >= windowStart);
    const clickCountIn10Min = recent.length + 1;
    let riskScore = clickCountIn10Min >= 5 ? 90 : clickCountIn10Min >= 3 ? 64 : 18;
    const reasons = [];

    if (clickCountIn10Min >= 5) {
      reasons.push("10분 내 5회 이상 반복 클릭");
    } else if (clickCountIn10Min >= 3) {
      reasons.push("10분 내 3회 이상 반복 클릭");
    }

    if (click.dwellSeconds <= 3) {
      riskScore += 12;
      reasons.push("체류시간 3초 이하");
    }

    if (click.pageViews === 0) {
      riskScore += 10;
      reasons.push("페이지 이동 없음");
    }

    riskScore = Math.min(riskScore, 100);
    const status = clickCountIn10Min >= 5 || riskScore >= 88 ? "차단" : clickCountIn10Min >= 3 || riskScore >= 58 ? "의심" : "정상";

    history.set(key, [...recent, click]);

    return {
      ...click,
      time: formatTime(click.createdAt),
      dateTime: formatDateTime(click.createdAt),
      hour: formatHour(click.createdAt),
      clickCountIn10Min,
      riskScore,
      status,
      reason: reasons.length ? reasons.join(", ") : "정상 패턴"
    };
  });

  return classified.sort((a, b) => b.createdAt - a.createdAt);
}
