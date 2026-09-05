# Cycle 1044 Planner Roadmap (C1045–C1050)

## 목표: 승천의 시련 UI & 속성 룬 인챈트 (Ascension Trials UI & Elemental Runes)

### C1045 [ui]: 승천의 시련(Ascension Trials) 전용 모달 UI
- `AscensionTrialsModal.tsx` 구현:
  - 1층부터 10층까지의 보스 목록, 보스 속성 뱃지, 체력/공격력 정보 표시
  - 층별 클리어 상태 및 첫 클리어 보상(강화석, 골드, JP) 수령 인디케이터
  - '시련 도전' 버튼을 통한 전투 시뮬레이션 및 결과(승리/패배, 턴 수, 남은 체력) 연출
  - 컴포넌트 테스트 작성 (`AscensionTrialsModal.test.tsx`)

### C1046 [system]: 대장간 속성 룬 인챈트(Elemental Rune Enchanting) 엔진
- `enchantSystem.ts` 구현:
  - 4대 룬(화염의 룬, 빙결의 룬, 뇌전의 룬, 암흑의 룬) 정의
  - 무기에 룬을 각인하여 속성(element) 부여 및 변경
  - 각인 시 추가 속성 공격력(+10% elemental damage) 부여
  - 단위 테스트 작성 (`enchantSystem.test.ts`)

### C1047 [ui]: 대장간 인챈트 탭 및 룬 각인 연출 UI
- `ReforgeModal.tsx`에 '속성 각인(인챈트)' 세 번째 탭 추가
- 무기 선택 및 룬 선택 슬롯, 각인 예상 속성 및 보너스 프리뷰
- 각인 성공 시 화려한 속성 이펙트 피드백

### C1048 [balance]: 룬 인챈트 경제 & 시련 10층 정복 시뮬레이션
- `enchantBalance.test.ts`:
  - 룬 각인 무기로 10층 종언의 패왕을 공략하는 엔드게임 스탯 시뮬레이션
  - 무속성 대비 속성 카운터 착용 시의 승률 및 클리어 스펙 마진 검증

### C1049 [narrative]: 승천 칭호(Titles) 및 대장장이 룬 각인 플레이버
- `ascensionTitles.ts`:
  - 시련 클리어 층수에 따른 칭호 (시련의 도전자, 원소의 인도자, 패왕을 꺾은 자 등)
  - 칭호 장착 시 소폭의 명예 스탯 보너스 부여
  - 대장장이 룬 각인 대사 추가 및 단위 테스트

### C1050 [critic+collab]: C1050 대망의 마일스톤 종합 비평 및 총괄 회고
- C1050 종합 비평 보고서 발행 및 C1001~C1050 대장정의 완성도 평가
- `RESUME.md` v13 최종 업데이트
