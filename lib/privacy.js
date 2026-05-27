import crypto from "crypto";

export function maskIp(ip = "") {
  if (ip.includes(":")) return ip.split(":").slice(0, 4).join(":") + "::";
  const parts = ip.split(".");
  if (parts.length !== 4) return "";
  return `${parts[0]}.${parts[1]}.${parts[2]}.0`;
}

export function hashIp(ip = "") {
  const salt = process.env.IP_HASH_SALT || "";
  if (!ip || !salt) return "";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

export function getRequestIp(request) {
  const forwarded = request.headers.get("x-forwarded-for") || "";
  return forwarded.split(",")[0].trim() || request.headers.get("x-real-ip") || "";
}
