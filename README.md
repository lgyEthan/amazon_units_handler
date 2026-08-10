# 아마존 재고 관리 시스템

## 바로가기

[아마존 재고 관리 시스템 열기](https://lgyethan.github.io/amazon_units_handler/)

Units, Pairs, Dozen 중 원하는 입력 단위와 Hybrid Box 또는 대박스 기준을 선택하면 필요한 box 수량과 단위별 환산 결과를 바로 계산할 수 있습니다.

## 사용 방법

1. 위 링크를 엽니다.
2. `Units`, `Pairs`, `Dozen` 중 입력 단위를 선택합니다.
3. `Hybrid Box (12 units)` 또는 `대박스 (18 units)` 기준을 선택합니다.
4. 0 이상의 수량을 입력합니다. 안전하게 계산할 수 없는 극단적으로 큰 값이나 작은 값은 오류로 표시됩니다.
5. `Full boxes`와 `Excess box`를 확인합니다.
6. 필요한 경우 `결과 복사` 버튼을 눌러 계산 결과를 복사합니다.

입력 단위를 바꿔도 입력창의 숫자는 바뀌지 않습니다. 예를 들어 `1 Units`에서 `Pairs`를 선택하면 입력값은 `1`로 유지되고, 결과는 `1 Pair` 기준으로 다시 계산됩니다.

Pairs는 0 이상의 정수로 입력합니다. Pairs 모드의 Units와 Dozen 결과는 소수 대신 `몫 + 남는 Pairs`로 표시되며, Dozen 몫은 0.5 단위까지만 표시됩니다. 예: `7 Pairs = 1 Unit + 1 Pair = 0.5 Dozen + 1 Pair`.

## 계산 기준

- Hybrid Box: 12 units = 72 pairs = 6 dozen = 1 box
- 대박스: 18 units = 108 pairs = 9 dozen = 1 box
- Excess box = 선택한 박스와 입력 단위 기준으로 채우고 남은 수량
- Dozen = units / 2
- Pair = units * 6
