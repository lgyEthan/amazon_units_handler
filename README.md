# 아마존 재고 관리 시스템

Unit 수량을 입력하면 box 수량, excess units, dozen, pair를 즉시 계산하는 정적 웹 계산기입니다.

## 계산 기준

- `# Box = QUOTIENT(Units, 12)`
- `Excess units = MOD(Units, 12)`
- `# Dozen = Units / 2`
- `# Pair = Units * 6`

## 로컬 실행

별도 서버나 설치 과정 없이 `index.html` 파일을 브라우저에서 열면 됩니다.

## GitHub Pages 배포

1. Repository의 `Settings > Pages`로 이동합니다.
2. `Build and deployment`에서 `Deploy from a branch`를 선택합니다.
3. Branch는 `main`, folder는 `/root`를 선택하고 저장합니다.
4. 몇 분 뒤 아래 주소에서 접속합니다.

https://lgyethan.github.io/amazon_units_handler/
