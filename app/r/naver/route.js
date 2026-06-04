import { handleNaverTrackingRequest } from "@/lib/naverTrackingRoute";

export async function GET(request) {
  return handleNaverTrackingRequest(request);
}
