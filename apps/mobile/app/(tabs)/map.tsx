import { ScreenStub } from '@/components/ScreenStub';

/** D-002 지도 홈 — REL-002에서 Kakao Map(WebView+JS SDK, ADR-003) 구현 */
export default function MapScreen() {
  return (
    <ScreenStub
      screenId="D-002"
      title="지도 홈"
      requirements="FR-MAP-001~005, FR-NOTE-005, FR-SEARCH-001"
      releaseSlice="REL-002 (지도/단지 데이터)"
    />
  );
}
