# OMNI 소개 사이트

Discord 봇 OMNI의 소개 사이트입니다. Vercel로 게시하는 정적 사이트이고, 봇 코드는 옆 폴더 `01_DanBungBot`(저장소 `felnut/OMNI-Bot`)에 있습니다.

| 주소 | 내용 | 파일 |
|---|---|---|
| `/` | 홈: 기능 소개, 초대·권한 안내, 자주 묻는 질문 | `index.html` |
| `/commands` | 접이식 명령어 목록(검색·분류 필터, 직접 링크 자동 펼침) | `commands.html` |
| `/updates` | 업데이트 내역 | `updates.md` |
| `/terms`, `/privacy` | 이용약관, 개인정보 처리방침(현행본) | `terms.md`, `privacy.md` |
| `/pre-terms`, `/pre-privacy` | 2026-10-26 시행 예정 개정본 | `*-2026-10-26.md` |
| `/changelog` | 약관·방침 변경 내역 | `changelog.md` |

## 구조

- `_layouts/default.html`: 글 페이지(약관·방침·업데이트) 틀, `_layouts/wide.html`: 홈·명령어 페이지 틀
- `_includes/`: 머리글·바닥글·`<head>`
- `assets/site.css`: 스타일(분류 색은 `--c` 변수 하나로 정함), `assets/site.js`: 홈 데모와 명령어 검색
- `_data/commands.json`, `_data/bot.json`: **자동 생성** 파일. 직접 고치지 마세요

## 명령어·초대 주소 갱신

봇에 명령어를 추가하거나 설명을 바꾼 뒤, 봇 폴더에서 한 번 실행합니다. DB와 Discord에는 접속하지 않습니다.

```bash
node ../01_DanBungBot/scripts/build-site-data.js     # 사이트 폴더에서
# 또는 npm run update-data
```

`_data`가 바뀌면 커밋해서 게시하세요. 초대 주소는 봇 `.env`의 `CLIENT_ID`로 만들어지고, 다른 사람이 초대하려면 Discord 개발자 포털에서 봇을 **공개(Public Bot)** 로 설정해야 합니다.

## 미리보기

Ruby/Jekyll이 없어도 볼 수 있게 Liquid·Markdown으로 같은 구조를 렌더링하는 도구를 넣어 두었습니다.

```bash
npm install          # 처음 한 번
npm run preview      # http://127.0.0.1:4173/
npm run build:check  # 렌더링 오류만 확인
```

Vercel 배포도 같은 렌더러를 사용합니다. `npm run preview`는 파일 변경을 감지하지 않으므로 수정 후 서버를 다시 실행하세요. 배포한 뒤 약관·방침 페이지가 정상인지 한 번 확인하세요.

## 게시 (Vercel)

사이트 주소는 `https://omni.felnut.com`입니다. `vercel.json`에 설치·빌드·출력 경로를 지정했습니다.

- 설치: `npm ci --include=dev`
- 빌드: `npm run build:check`
- 정적 파일 출력: `.preview`
- `cleanUrls: true`로 `/commands`, `/terms` 같은 확장자 없는 주소를 제공합니다.
- `_config.yml`: `url`은 배포 도메인, `baseurl`은 빈 문자열입니다.

빌드할 때 `/robots.txt`와 `/sitemap.xml`을 자동 생성합니다. 사이트맵에는 홈·명령어 상세·약관 등 공개 페이지가 들어가며, 로그인 페이지 `/me`와 API는 제외합니다. 새 페이지와 배포 도메인 변경도 다음 빌드에 반영됩니다. 배포 후 Google Search Console의 Sitemaps에 `https://omni.felnut.com/sitemap.xml`을 제출하세요.

Vercel 프로젝트를 이 저장소의 `main`에 연결하면 푸시할 때 자동 배포합니다. 배포 성공은 Vercel의 Deployments에서 확인하세요. Vercel은 저장소의 Liquid/Markdown 렌더러를 사용하며 Jekyll을 실행하지 않습니다.

### 디자인

배너·프로필의 파랑, 하늘색, 검정과 곡선 심볼을 바탕으로, 비대칭 타이포그래피와 번호형 기능 목록을 사용합니다. 홈의 다섯 방향 탐색은 실제 기능 설명으로 이동하며 사용 예시 화면은 포함하지 않습니다. `assets/omni-mark.svg`는 프로필 심볼을 참고해 만든 벡터이며, `assets/favicon.svg`에도 같은 형태를 사용합니다. 한글·영문은 Pretendard Variable 1.3.9를 자체 호스팅합니다. UI 아이콘은 Lucide 1.59.0의 필요한 SVG만 `assets/icons.svg`에 포함했습니다. 원본 패키지는 npm의 `pretendard@1.3.9`, `lucide-static@1.59.0`이며 라이선스는 `assets/licenses/`에 보관합니다. 두 자산 모두 외부 CDN 요청 없이 제공됩니다. 스크롤 등장 효과는 한 번만 실행되며 모션 줄이기 설정에서는 효과를 끕니다. 명령어는 데스크톱 2열·모바일 1열의 네이티브 아코디언이며 JavaScript 없이도 사용법을 펼칠 수 있습니다.

### 새 주소로 옮길 때 (봇 쪽 작업)

지금 봇은 기본값으로 `https://felnut.github.io/OMNI-Bot/...` 주소를 안내합니다. 새 사이트를 게시하고 주소가 정해지면 다음 순서로 옮기세요.

1. 봇 `.env`에 `SITE_URL=새주소`(끝의 `/` 없이)를 넣고 봇을 재시작합니다. 이메일 등록 동의 안내(`admin_contact.js`)와 도움말의 약관·방침 버튼(`help.js`)이 이 값을 씁니다.
2. 봇 저장소 `README.md`와 `SECURITY.md`의 약관·방침·공식 문서 링크를 새 주소로 바꿉니다(문서 안의 링크라 `.env`로는 바뀌지 않습니다).
3. 새 주소에서 `/terms`, `/privacy`가 열리는 것을 확인한 뒤, 봇 저장소의 `docs/`(약관·방침 복사본)를 정리합니다. 이전 주소로 들어오는 사람을 위해 새 사이트로 안내하는 짧은 페이지만 남기는 것을 권합니다.

## 약관·방침 문서

이 사이트가 약관·방침의 **원본**입니다. 문서마다 쪽 설정(`layout: legal`, `legal`, `permalink`, `title`)이 맨 위에 있고, 본문은 원래 문서 그대로입니다. 페이지에는 버전 안내와 목차가 자동으로 붙습니다.

- 버전 목록은 `_data/legal.json`에서 관리합니다(현행, 개정본, 이전 버전 링크).
- 봇 저장소 `docs/`의 같은 문서는 주소를 옮기기 전까지 유지되는 **복사본**입니다. 옮기기 전에 문서를 고치게 되면 두 곳을 같이 고치세요.

### 시행일에 개정본으로 교체하기 (2026-10-26)

1. `terms.md`를 `terms-2026-10-15.md`로 보관하고(쪽 설정의 `permalink`를 `/terms-2026-10-15`로, `title`을 `이용약관 이전 버전`으로), `terms-2026-10-26.md`를 `terms.md`로 바꿉니다(`permalink: /terms`, `title: 이용약관`). 방침도 같은 방식으로 합니다.
2. 새 `terms.md`, `privacy.md` 안의 "시행 예정 개정본입니다" 안내와 문서 사이 링크(`pre-terms` → `terms`)를 고칩니다.
3. `_data/legal.json`의 버전 목록(현행 ↔ 이전 버전), `changelog.md`의 적용 기간 표, 홈·업데이트의 안내 문구를 바꿉니다.
"# OMNI-bot-site" 

내비게이션은 스크롤 시 로고·메뉴·초대 버튼으로 축소되고, 오른쪽 아래 버튼으로 맨 위에 돌아갈 수 있습니다. 약관·개인정보처리방침 버전 목록은 기본적으로 닫힌 드롭다운이며 키보드와 JavaScript 없는 환경에서도 열 수 있습니다.
