import { handleNaverTrackingRequest } from "@/lib/naverTrackingRoute";

export async function GET(request, context) {
  return handleNaverTrackingRequest(request, { channel: context?.params?.channel });
}
