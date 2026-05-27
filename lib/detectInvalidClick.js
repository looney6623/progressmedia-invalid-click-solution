function pad(value) {
  return String(value).padStart(2, "0");
}

function formatTime(date) {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
      hour: `${pad(click.createdAt.getHours())}:00`,
      clickCountIn10Min,
      riskScore,
      status,
      reason: reasons.length ? reasons.join(", ") : "정상 패턴"
    };
  });

  return classified.sort((a, b) => b.createdAt - a.createdAt);
}
