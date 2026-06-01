import { ScreenStub } from '@/components/ScreenStub';

/** D-005 노트 목록/피드 — REL-003/004에서 구현 */
export default function FeedScreen() {
  return (
    <ScreenStub
      screenId="D-005"
      title="노트 목록 / 피드"
      requirements="FR-NOTE-005, FR-WS-003, FR-SYNC-002"
      releaseSlice="REL-003 / REL-004"
    />
  );
}
