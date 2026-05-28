# Era 1 Summary (Cycles 1–25)

## 통계
- 총 커밋: 25 cycles × 2 (impl + docs) = ~50 commits
- 테스트: 1593 → 1652 (+59)
- Persist 버전: v25 → v27
- Visual maturity: 3/30 → 10/30

## 카테고리 분포
| Category | Count | % |
|----------|-------|-----|
| Visual | 6 | 24% |
| Balance | 5 | 20% |
| System | 5 | 20% |
| Narrative | 5 | 20% |
| Sound | 4 | 16% |

## 주요 성과

### Visual (6)
- 캐릭터 스프라이트 해시 매핑 (Cycle 1)
- 히트 이펙트 flash + scale (Cycle 4)
- 한글 픽셀 폰트 Galmuri (Cycle 9)
- 영역별 UI 색상 accent (Cycle 13)
- HP 바 애니메이션 (Cycle 15)
- 적 처치 파티클 burst (Cycle 21)

### System (5)
- BP 시스템 밸런스 조정 (Cycle 3)
- 패시브 스킬 전체 구현 (Cycle 8)
- 도감 화면 (Cycle 14)
- 킬 카운터 HUD (Cycle 18)
- 자동저장 인디케이터 (Cycle 23)

### Narrative (5)
- 전투 로그 메시지 (Cycle 5)
- 몬스터 도감 엔트리 (Cycle 10)
- 보스 승리 연출 (Cycle 16)
- 영역 분위기 텍스트 (Cycle 20)
- 캐릭터 전투 대사 (Cycle 25)

### Sound (4)
- SFX 인프라 + 기본 12종 (Cycle 6)
- 전투 SFX 확장 (Cycle 11)
- BGM 크로스페이드 (Cycle 17)
- 연속 레벨업 피치 상승 (Cycle 22)

### Balance (5)
- 경험치 곡선 튜닝 (Cycle 2)
- 장비 티어 검증 (Cycle 7)
- 골드 경제 검증 (Cycle 12)
- 스킬 DPS 밸런스 (Cycle 19)
- 몬스터 HP 스케일링 (Cycle 24)

## 비주얼 성숙도 변화
- 이펙트: 0 → 3 (hit flash, HP tween, death particles)
- 캐릭터: 0 → 1 (sprite hash)
- 몬스터: 0 → 1 (frame mapping)
- 배경: 0 → 1 (zone rectangles)
- 색상: 0 → 1 (realm accents)
- 폰트: 0 → 1 (Galmuri bitmap)
- 아이콘: 0 → 1 (Kenney UI)
- 전환: 0 → 1 (opacity fade)

## Era 2 방향성
- Visual 성숙도 더 끌어올리기 (배경 2+, 전환 2+)
- Sound: SFX/BGM 품질 업그레이드
- System: 통계/업적 화면 추가
- Balance: 후반 콘텐츠 난이도 곡선 검증
- Narrative: NPC/대화/이벤트 텍스트 확장
