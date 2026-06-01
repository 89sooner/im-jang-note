-- 임장노트 REL-003: 사진 Storage 버킷 + RLS (FR-MEDIA-001, NFR-002)
-- 비공개 버킷 + 서명 URL 접근. 경로 규약: <workspace_id>/<note_id>/<photo_id>.jpg
-- 멤버만 접근하도록 storage.objects 정책으로 워크스페이스 격리(data_model §5).

-- 비공개 버킷 생성
insert into storage.buckets (id, name, public)
values ('note-photos', 'note-photos', false)
on conflict (id) do nothing;

-- 경로 첫 세그먼트(workspace_id)가 내 멤버십에 속할 때만 접근
-- storage.foldername(name): 폴더 세그먼트 배열, [1] = workspace_id
drop policy if exists note_photos_select on storage.objects;
create policy note_photos_select on storage.objects
  for select to authenticated
  using (
    bucket_id = 'note-photos'
    and (storage.foldername(name))[1] in (
      select workspace_id::text
      from public.workspace_member
      where user_id = auth.uid()
    )
  );

drop policy if exists note_photos_insert on storage.objects;
create policy note_photos_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'note-photos'
    and (storage.foldername(name))[1] in (
      select workspace_id::text
      from public.workspace_member
      where user_id = auth.uid()
    )
  );

drop policy if exists note_photos_delete on storage.objects;
create policy note_photos_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'note-photos'
    and (storage.foldername(name))[1] in (
      select workspace_id::text
      from public.workspace_member
      where user_id = auth.uid()
    )
  );
