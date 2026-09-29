# Decision245 regression: candidate (E1 + oracle 3 / 神階 2) vs baseline (E0 + 7 / 4)

| cell | diff | policy | baseline win | baseline lost | baseline unfinished | baseline score(won) | candidate win | candidate lost | candidate unfinished | candidate score(won) | Δwin | Δscore |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| normal-mode | easy | reader | 100.0% | 0.0% | 0.0% | 844 | 100.0% | 0.0% | 0.0% | 802 | 0.0pt | -42 |
| normal-mode | easy | naive | 100.0% | 0.0% | 0.0% | 835 | 99.6% | 0.4% | 0.0% | 814 | -0.3pt | -21 |
| normal-mode | easy | greedy | 100.0% | 0.0% | 0.0% | 851 | 98.9% | 1.1% | 0.0% | 831 | -1.1pt | -20 |
| normal-mode | easy | defensive | 100.0% | 0.0% | 0.0% | 821 | 99.9% | 0.1% | 0.0% | 814 | -0.1pt | -7 |
| normal-mode | normal | reader | 99.9% | 0.0% | 0.1% | 851 | 99.8% | 0.0% | 0.2% | 812 | -0.1pt | -39 |
| normal-mode | normal | naive | 97.4% | 2.6% | 0.0% | 853 | 86.2% | 13.8% | 0.0% | 827 | -11.2pt | -26 |
| normal-mode | normal | greedy | 94.5% | 5.5% | 0.0% | 861 | 73.8% | 26.2% | 0.0% | 836 | -20.7pt | -26 |
| normal-mode | normal | defensive | 100.0% | 0.0% | 0.0% | 837 | 97.4% | 2.6% | 0.0% | 822 | -2.6pt | -15 |
| normal-mode | hard | reader | 99.6% | 0.0% | 0.4% | 877 | 96.6% | 0.3% | 3.1% | 840 | -3.0pt | -37 |
| normal-mode | hard | naive | 81.9% | 18.1% | 0.0% | 885 | 48.3% | 51.4% | 0.2% | 850 | -33.6pt | -35 |
| normal-mode | hard | greedy | 67.9% | 32.1% | 0.0% | 886 | 32.5% | 67.4% | 0.0% | 848 | -35.4pt | -37 |
| normal-mode | hard | defensive | 97.5% | 0.0% | 2.5% | 862 | 78.9% | 19.3% | 1.8% | 844 | -18.6pt | -18 |
| daily(神域強化) | normal | reader | 98.6% | 0.0% | 1.4% | 830 | 90.5% | 0.1% | 9.4% | 802 | -8.1pt | -28 |
| daily(神域強化) | normal | naive | 86.3% | 13.7% | 0.0% | 843 | 53.3% | 45.1% | 1.6% | 807 | -33.0pt | -36 |
| daily(神域強化) | normal | greedy | 74.8% | 25.1% | 0.0% | 846 | 38.6% | 60.9% | 0.5% | 806 | -36.2pt | -40 |
| daily(神域強化) | normal | defensive | 91.2% | 0.0% | 8.8% | 823 | 79.5% | 13.2% | 7.3% | 804 | -11.7pt | -19 |
| 神階1 | normal | reader | 99.9% | 0.0% | 0.1% | 888 | 99.3% | 0.5% | 0.2% | 874 | -0.6pt | -14 |
| 神階1 | normal | naive | 88.8% | 11.2% | 0.0% | 909 | 55.2% | 44.8% | 0.0% | 884 | -33.6pt | -24 |
| 神階1 | normal | defensive | 96.7% | 3.3% | 0.0% | 895 | 66.3% | 33.6% | 0.0% | 884 | -30.3pt | -11 |
| 神階3 | normal | reader | 96.1% | 0.3% | 3.6% | 986 | 88.5% | 2.6% | 8.9% | 975 | -7.7pt | -11 |
| 神階3 | normal | naive | 78.7% | 21.1% | 0.1% | 1024 | 38.5% | 60.3% | 1.1% | 989 | -40.2pt | -35 |
| 神階3 | normal | defensive | 85.9% | 10.3% | 3.9% | 995 | 48.2% | 48.7% | 3.1% | 976 | -37.7pt | -19 |
| 神階5 | normal | reader | 95.4% | 1.3% | 3.4% | 1106 | 78.3% | 12.1% | 9.6% | 1095 | -17.0pt | -11 |
| 神階5 | normal | naive | 66.5% | 33.5% | 0.1% | 1149 | 23.9% | 75.4% | 0.6% | 1098 | -42.5pt | -51 |
| 神階5 | normal | defensive | 80.3% | 17.4% | 2.3% | 1113 | 28.6% | 69.3% | 2.1% | 1091 | -51.7pt | -22 |
| 神階7(pressure) | normal | reader | 89.6% | 7.6% | 2.9% | 1225 | 53.0% | 39.1% | 7.9% | 1209 | -36.6pt | -16 |
| 神階7(pressure) | normal | naive | 44.9% | 55.0% | 0.1% | 1279 | 10.6% | 89.1% | 0.2% | 1236 | -34.3pt | -43 |
| 神階7(pressure) | normal | defensive | 63.8% | 35.2% | 1.0% | 1242 | 11.1% | 88.1% | 0.8% | 1219 | -52.7pt | -23 |

## 決定58／DAILY-01 型チェック：god×enemy で最善方策の勝率 < 50% のセル

- baseline: 0 cells
- candidate: 0 cells

## 神階Ⅶ(pressure) reader win per enemy

| enemy | baseline | candidate |
|---|---|---|
| 試練の影 | 94.3% | 51.7% |
| 業斧の鬼将 | 92.9% | 36.2% |
| 藍花の怨霊 | 96.7% | 51.0% |
| 銀甲の機工師 | 87.4% | 78.6% |
| 双牙の魔獣 | 64.8% | 19.3% |
| 蒼海の龍神 | 92.6% | 46.2% |
| 乱舞の道化 | 98.3% | 88.1% |