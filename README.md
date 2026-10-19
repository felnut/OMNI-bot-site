# OMNI 소개 사이트

Discord 봇 OMNI의 소개 사이트입니다. Jekyll(GitHub Pages)로 게시하는 정적 사이트이고, 봇 코드는 옆 폴더 `01_DanBungBot`(저장소 `felnut/OMNI-Bot`)에 있습니다.

| 주소 | 내용 | 파일 |
|---|---|---|
| `/` | 홈: 슬래시 명령어 데모, 기능 목록, 자주 묻는 질문 | `index.html` |
| `/commands` | 명령어 목록(검색·분류 필터) | `commands.html` |
| `/updates` | 업데이트 내역 | `updates.md` |
| `/terms`, `/privacy` | 이용약관, 개인정보 처리방침(현행본) | `terms.md`, `privacy.md` |
| `/terms-2026-10-26`, `/privacy-2026-10-26` | 2026-10-26 시행 예정 개정본 | `*-2026-10-26.md` |
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
npm run preview      # http://127.0.0.1:4173/OMNI-Bot/
npm run build:check  # 렌더링 오류만 확인
```

실제 게시는 Jekyll(kramdown)이 만들기 때문에 표나 중첩 목록 같은 마크다운 표현은 미리보기와 조금 다를 수 있습니다. 게시한 뒤 약관·방침 페이지가 정상인지 한 번 확인하세요.

## 게시

1. 이 폴더를 GitHub 저장소로 올립니다(예: `felnut/OMNI-Bot-site`).
2. 저장소 Settings → Pages에서 `main` 브랜치, `/ (root)`를 선택합니다.
3. `_config.yml`의 `baseurl`을 게시 주소에 맞춥니다.
   - 프로젝트 사이트(`felnut.github.io/OMNI-Bot-site`)라면 `"/OMNI-Bot-site"`
   - 저장소 이름이 `felnut.github.io`이거나 사용자 지정 도메인을 연결하면 `""`
4. 게시 주소가 정해지면 봇 쪽의 안내 주소도 바꿔야 합니다(아래).

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
2. 새 `terms.md`, `privacy.md` 안의 "시행 예정 개정본입니다" 안내와 문서 사이 링크(`terms-2026-10-26` → `terms`)를 고칩니다.
3. `_data/legal.json`의 버전 목록(현행 ↔ 이전 버전), `changelog.md`의 적용 기간 표, 홈·업데이트의 안내 문구를 바꿉니다.
