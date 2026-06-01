import { ScreenStub } from '@/components/ScreenStub';

/** D-010 알림 센터 — REL-005에서 구현 */
export default function NotificationsScreen() {
  return (
    <ScreenStub
      screenId="D-010"
      title="알림 센터"
      requirements="FR-NOTIFY-001, FR-NOTIFY-002"
      releaseSlice="REL-005 (검색·비교·즐겨찾기·알림)"
    />
  );
}
