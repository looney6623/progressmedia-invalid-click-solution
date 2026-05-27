export function number(value) {
  return new Intl.NumberFormat("ko-KR").format(value);
}

export function percent(value) {
  return `${value.toFixed(1)}%`;
}
