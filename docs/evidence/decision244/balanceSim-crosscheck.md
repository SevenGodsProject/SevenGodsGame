# balanceSim.test.ts cross-check (Production d1e3b30 engine copy, existing Planner simulator, unchanged)

Command: `npx vitest run src/core/engine/balanceSim.test.ts --reporter=verbose` on a `git archive d1e3b30` copy (scratch). Extracted lines:

```
stdout | src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 恵比寿：複数戦略×複数シードで難易度傾向を出力する
--- 恵比寿 / 戦略: balanced (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 恵比寿 / 戦略: aggressive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 恵比寿 / 戦略: defensive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
 ✓ src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 恵比寿：複数戦略×複数シードで難易度傾向を出力する 117ms
stdout | src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 他6神：おすすめデッキで複数戦略×複数シードの難易度傾向を出力する（決定26）
--- 大耀 / 戦略: balanced (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 大耀 / 戦略: aggressive (40回) ---
勝利: 39(98%) / 敗北: 1 / 未撃破: 0
--- 大耀 / 戦略: defensive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 蒼毘 / 戦略: balanced (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 蒼毘 / 戦略: aggressive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 蒼毘 / 戦略: defensive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 才華 / 戦略: balanced (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 才華 / 戦略: aggressive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 才華 / 戦略: defensive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 寿楽 / 戦略: balanced (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 寿楽 / 戦略: aggressive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 寿楽 / 戦略: defensive (40回) ---
勝利: 39(98%) / 敗北: 0 / 未撃破: 1
--- 福永 / 戦略: balanced (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 福永 / 戦略: aggressive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 福永 / 戦略: defensive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 笑蓮 / 戦略: balanced (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 笑蓮 / 戦略: aggressive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
--- 笑蓮 / 戦略: defensive (40回) ---
勝利: 40(100%) / 敗北: 0 / 未撃破: 0
 ✓ src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 他6神：おすすめデッキで複数戦略×複数シードの難易度傾向を出力する（決定26） 473ms
stdout | src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 新6敵（決定32）：7神×3戦略で勝率を出力し、0%/97.5%以上の組み合わせを検出する（決定36）
=== 敵: 業斧の鬼将 (HP100) ===
  恵比寿: balanced=100%(R5.0) / aggressive=100%(R4.8) / defensive=100%(R5.4)
  大耀: balanced=100%(R5.2) / aggressive=75%(R4.8) / defensive=100%(R5.8)
  蒼毘: balanced=100%(R4.9) / aggressive=100%(R5.3) / defensive=100%(R5.0)
  才華: balanced=100%(R5.0) / aggressive=73%(R4.6) / defensive=100%(R5.6)
  寿楽: balanced=100%(R5.3) / aggressive=100%(R5.3) / defensive=100%(R6.0)
  福永: balanced=100%(R5.5) / aggressive=95%(R5.1) / defensive=100%(R6.3)
  笑蓮: balanced=100%(R5.0) / aggressive=98%(R4.9) / defensive=100%(R5.3)
=== 敵: 藍花の怨霊 (HP95) ===
  恵比寿: balanced=100%(R4.9) / aggressive=100%(R4.6) / defensive=100%(R5.3)
  大耀: balanced=100%(R4.9) / aggressive=100%(R4.8) / defensive=100%(R5.7)
  蒼毘: balanced=100%(R5.0) / aggressive=100%(R5.2) / defensive=100%(R4.8)
  才華: balanced=100%(R4.8) / aggressive=100%(R4.6) / defensive=100%(R5.4)
  寿楽: balanced=100%(R5.2) / aggressive=100%(R5.3) / defensive=100%(R5.7)
  福永: balanced=100%(R5.3) / aggressive=100%(R5.1) / defensive=100%(R6.2)
  笑蓮: balanced=100%(R4.5) / aggressive=100%(R4.7) / defensive=100%(R5.0)
=== 敵: 銀甲の機工師 (HP100) ===
  恵比寿: balanced=100%(R5.1) / aggressive=100%(R4.8) / defensive=100%(R5.4)
  大耀: balanced=100%(R5.3) / aggressive=53%(R4.9) / defensive=100%(R5.8)
  蒼毘: balanced=100%(R5.5) / aggressive=100%(R5.3) / defensive=100%(R5.3)
  才華: balanced=100%(R5.2) / aggressive=100%(R4.7) / defensive=100%(R5.8)
  寿楽: balanced=100%(R5.5) / aggressive=98%(R5.4) / defensive=100%(R6.0)
  福永: balanced=100%(R5.8) / aggressive=70%(R5.2) / defensive=100%(R6.3)
  笑蓮: balanced=100%(R5.0) / aggressive=88%(R4.9) / defensive=100%(R5.3)
=== 敵: 双牙の魔獣 (HP85) ===
  恵比寿: balanced=100%(R4.9) / aggressive=88%(R4.2) / defensive=100%(R5.2)
  大耀: balanced=100%(R5.0) / aggressive=25%(R4.1) / defensive=100%(R5.4)
  蒼毘: balanced=100%(R4.6) / aggressive=98%(R4.7) / defensive=100%(R4.8)
  才華: balanced=100%(R4.6) / aggressive=57%(R4.0) / defensive=100%(R5.2)
  寿楽: balanced=100%(R4.8) / aggressive=100%(R4.7) / defensive=100%(R5.4)
  福永: balanced=100%(R5.2) / aggressive=68%(R4.1) / defensive=100%(R5.8)
  笑蓮: balanced=100%(R4.9) / aggressive=68%(R4.8) / defensive=100%(R4.8)
=== 敵: 蒼海の龍神 (HP103) ===
  恵比寿: balanced=100%(R5.1) / aggressive=100%(R4.9) / defensive=100%(R5.5)
  大耀: balanced=100%(R5.2) / aggressive=100%(R5.0) / defensive=100%(R5.7)
  蒼毘: balanced=100%(R5.2) / aggressive=100%(R5.4) / defensive=100%(R5.0)
  才華: balanced=100%(R5.0) / aggressive=100%(R4.8) / defensive=100%(R5.6)
  寿楽: balanced=100%(R5.3) / aggressive=100%(R5.5) / defensive=100%(R6.1)
  福永: balanced=100%(R5.7) / aggressive=100%(R5.4) / defensive=100%(R6.3)
  笑蓮: balanced=100%(R4.9) / aggressive=100%(R5.0) / defensive=100%(R5.3)
=== 敵: 乱舞の道化 (HP92) ===
  恵比寿: balanced=100%(R4.9) / aggressive=100%(R4.4) / defensive=100%(R5.2)
  大耀: balanced=100%(R5.0) / aggressive=95%(R4.6) / defensive=100%(R5.7)
  蒼毘: balanced=100%(R4.9) / aggressive=100%(R5.0) / defensive=100%(R4.8)
  才華: balanced=100%(R4.8) / aggressive=100%(R4.5) / defensive=100%(R5.2)
  寿楽: balanced=100%(R5.0) / aggressive=100%(R5.1) / defensive=100%(R5.5)
  福永: balanced=100%(R5.4) / aggressive=100%(R5.0) / defensive=100%(R6.2)
  笑蓮: balanced=100%(R4.6) / aggressive=100%(R4.5) / defensive=100%(R5.2)
 ✓ src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 新6敵（決定32）：7神×3戦略で勝率を出力し、0%/97.5%以上の組み合わせを検出する（決定36） 1915ms
stdout | src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 力の絆（決定44）：7神×3戦略で勝率を出力し、0%/97.5%以上の組み合わせを検出する（決定47）
  恵比寿（力の絆）: balanced=100%(R5.1) / aggressive=100%(R4.8) / defensive=100%(R5.5)
  大耀（力の絆）: balanced=100%(R5.3) / aggressive=95%(R4.9) / defensive=100%(R6.0)
  蒼毘（力の絆）: balanced=100%(R5.2) / aggressive=100%(R5.3) / defensive=100%(R5.2)
  才華（力の絆）: balanced=100%(R5.0) / aggressive=100%(R4.8) / defensive=100%(R5.7)
  寿楽（力の絆）: balanced=100%(R5.4) / aggressive=100%(R5.4) / defensive=100%(R5.9)
  福永（力の絆）: balanced=100%(R5.7) / aggressive=100%(R5.2) / defensive=100%(R6.3)
  笑蓮（力の絆）: balanced=100%(R5.1) / aggressive=100%(R5.0) / defensive=100%(R5.5)
 ✓ src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 力の絆（決定44）：7神×3戦略で勝率を出力し、0%/97.5%以上の組み合わせを検出する（決定47） 266ms
=== 難易度: normal ===
  恵比寿: balanced=勝100%/敗0%/未0% / aggressive=勝100%/敗0%/未0% / defensive=勝100%/敗0%/未0%
  大耀: balanced=勝100%/敗0%/未0% / aggressive=勝100%/敗0%/未0% / defensive=勝100%/敗0%/未0%
  蒼毘: balanced=勝100%/敗0%/未0% / aggressive=勝100%/敗0%/未0% / defensive=勝100%/敗0%/未0%
  才華: balanced=勝100%/敗0%/未0% / aggressive=勝100%/敗0%/未0% / defensive=勝100%/敗0%/未0%
  寿楽: balanced=勝100%/敗0%/未0% / aggressive=勝100%/敗0%/未0% / defensive=勝100%/敗0%/未0%
  福永: balanced=勝100%/敗0%/未0% / aggressive=勝100%/敗0%/未0% / defensive=勝100%/敗0%/未0%
  笑蓮: balanced=勝100%/敗0%/未0% / aggressive=勝98%/敗3%/未0% / defensive=勝100%/敗0%/未0%
=== 難易度: hard ===
  恵比寿: balanced=勝100%/敗0%/未0% / aggressive=勝85%/敗15%/未0% / defensive=勝100%/敗0%/未0%
  大耀: balanced=勝100%/敗0%/未0% / aggressive=勝70%/敗30%/未0% / defensive=勝100%/敗0%/未0%
  蒼毘: balanced=勝100%/敗0%/未0% / aggressive=勝100%/敗0%/未0% / defensive=勝100%/敗0%/未0%
  才華: balanced=勝100%/敗0%/未0% / aggressive=勝28%/敗73%/未0% / defensive=勝100%/敗0%/未0%
  寿楽: balanced=勝100%/敗0%/未0% / aggressive=勝100%/敗0%/未0% / defensive=勝100%/敗0%/未0%
  福永: balanced=勝100%/敗0%/未0% / aggressive=勝85%/敗15%/未0% / defensive=勝63%/敗0%/未38%
  笑蓮: balanced=勝100%/敗0%/未0% / aggressive=勝90%/敗10%/未0% / defensive=勝100%/敗0%/未0%
 ✓ src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 決定58：hard×全神×全敵で、少なくとも1戦略が50%以上の勝率を保つことを保証する（再現防止） 1202ms
stdout | src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > DAILY-01：神域強化×全神×全敵で、少なくとも1戦略が50%以上の勝率を保つ（Daily詰み防止）
試練の影 × 恵比寿: balanced=100%（勝利時score avg873/min808/max954） / aggressive=85%（勝利時score avg880/min786/max934） / defensive=100%（勝利時score avg834/min734/max927）
試練の影 × 大耀: balanced=100%（勝利時score avg849/min742/max929） / aggressive=75%（勝利時score avg877/min730/max986） / defensive=100%（勝利時score avg820/min736/max934）
試練の影 × 蒼毘: balanced=100%（勝利時score avg866/min755/max934） / aggressive=100%（勝利時score avg848/min734/max942） / defensive=100%（勝利時score avg873/min755/max966）
試練の影 × 才華: balanced=100%（勝利時score avg881/min767/max953） / aggressive=60%（勝利時score avg919/min892/max949） / defensive=100%（勝利時score avg847/min763/max924）
試練の影 × 寿楽: balanced=100%（勝利時score avg799/min729/max898） / aggressive=100%（勝利時score avg789/min716/max906） / defensive=80%（勝利時score avg773/min733/max846）
試練の影 × 福永: balanced=100%（勝利時score avg840/min746/max897） / aggressive=95%（勝利時score avg854/min741/max944） / defensive=20%（勝利時score avg785/min767/max801）
試練の影 × 笑蓮: balanced=100%（勝利時score avg827/min738/max960） / aggressive=100%（勝利時score avg840/min746/max955） / defensive=100%（勝利時score avg814/min739/max882）
業斧の鬼将 × 恵比寿: balanced=100%（勝利時score avg846/min802/max937） / aggressive=80%（勝利時score avg859/min800/max948） / defensive=100%（勝利時score avg830/min763/max859）
業斧の鬼将 × 大耀: balanced=100%（勝利時score avg860/min727/max936） / aggressive=55%（勝利時score avg900/min823/max1019） / defensive=100%（勝利時score avg822/min733/max930）
業斧の鬼将 × 蒼毘: balanced=100%（勝利時score avg840/min727/max902） / aggressive=100%（勝利時score avg822/min697/max914） / defensive=100%（勝利時score avg866/min712/max1014）
業斧の鬼将 × 才華: balanced=100%（勝利時score avg883/min846/max970） / aggressive=20%（勝利時score avg931/min915/max954） / defensive=100%（勝利時score avg858/min759/max913）
業斧の鬼将 × 寿楽: balanced=100%（勝利時score avg817/min727/max918） / aggressive=100%（勝利時score avg820/min719/max874） / defensive=100%（勝利時score avg766/min728/max840）
業斧の鬼将 × 福永: balanced=100%（勝利時score avg836/min735/max941） / aggressive=70%（勝利時score avg845/min725/max952） / defensive=45%（勝利時score avg779/min755/max800）
業斧の鬼将 × 笑蓮: balanced=100%（勝利時score avg820/min719/max924） / aggressive=75%（勝利時score avg806/min723/max913） / defensive=100%（勝利時score avg819/min742/max902）
藍花の怨霊 × 恵比寿: balanced=100%（勝利時score avg846/min736/max925） / aggressive=100%（勝利時score avg874/min769/max934） / defensive=100%（勝利時score avg829/min728/max940）
藍花の怨霊 × 大耀: balanced=100%（勝利時score avg853/min708/max925） / aggressive=100%（勝利時score avg886/min795/max999） / defensive=100%（勝利時score avg828/min742/max903）
藍花の怨霊 × 蒼毘: balanced=100%（勝利時score avg859/min794/max921） / aggressive=100%（勝利時score avg848/min810/max924） / defensive=100%（勝利時score avg898/min750/max999）
藍花の怨霊 × 才華: balanced=100%（勝利時score avg897/min830/max953） / aggressive=95%（勝利時score avg916/min881/max953） / defensive=100%（勝利時score avg878/min762/max964）
藍花の怨霊 × 寿楽: balanced=100%（勝利時score avg811/min708/max903） / aggressive=100%（勝利時score avg829/min769/max890） / defensive=100%（勝利時score avg785/min698/max898）
藍花の怨霊 × 福永: balanced=100%（勝利時score avg827/min733/max921） / aggressive=100%（勝利時score avg848/min752/max927） / defensive=75%（勝利時score avg757/min743/max791）
藍花の怨霊 × 笑蓮: balanced=100%（勝利時score avg880/min808/max934） / aggressive=100%（勝利時score avg858/min750/max934） / defensive=95%（勝利時score avg801/min726/max924）
銀甲の機工師 × 恵比寿: balanced=100%（勝利時score avg866/min738/max940） / aggressive=50%（勝利時score avg887/min814/max917） / defensive=100%（勝利時score avg809/min737/max862）
銀甲の機工師 × 大耀: balanced=100%（勝利時score avg840/min748/max939） / aggressive=20%（勝利時score avg876/min828/max897） / defensive=100%（勝利時score avg806/min719/max932）
銀甲の機工師 × 蒼毘: balanced=100%（勝利時score avg773/min715/max866） / aggressive=55%（勝利時score avg802/min714/max837） / defensive=100%（勝利時score avg829/min738/max940）
銀甲の機工師 × 才華: balanced=100%（勝利時score avg870/min745/max954） / aggressive=55%（勝利時score avg929/min888/max962） / defensive=100%（勝利時score avg872/min764/max911）
銀甲の機工師 × 寿楽: balanced=100%（勝利時score avg774/min703/max840） / aggressive=40%（勝利時score avg841/min775/max897） / defensive=85%（勝利時score avg743/min711/max828）
銀甲の機工師 × 福永: balanced=100%（勝利時score avg845/min755/max897） / aggressive=35%（勝利時score avg876/min815/max937） / defensive=55%（勝利時score avg777/min762/max792）
銀甲の機工師 × 笑蓮: balanced=100%（勝利時score avg812/min729/max944） / aggressive=60%（勝利時score avg822/min742/max915） / defensive=95%（勝利時score avg835/min744/max944）
双牙の魔獣 × 恵比寿: balanced=100%（勝利時score avg869/min772/max918） / aggressive=20%（勝利時score avg896/min852/max952） / defensive=100%（勝利時score avg835/min718/max895）
双牙の魔獣 × 大耀: balanced=100%（勝利時score avg813/min697/max906） / aggressive=0%（勝利時score avg0/min0/max0） / defensive=100%（勝利時score avg821/min701/max964）
双牙の魔獣 × 蒼毘: balanced=100%（勝利時score avg841/min774/max901） / aggressive=80%（勝利時score avg814/min750/max884） / defensive=100%（勝利時score avg860/min771/max984）
双牙の魔獣 × 才華: balanced=100%（勝利時score avg855/min808/max943） / aggressive=0%（勝利時score avg0/min0/max0） / defensive=100%（勝利時score avg854/min776/max956）
双牙の魔獣 × 寿楽: balanced=100%（勝利時score avg815/min694/max897） / aggressive=95%（勝利時score avg813/min754/max880） / defensive=100%（勝利時score avg780/min697/max857）
双牙の魔獣 × 福永: balanced=100%（勝利時score avg838/min719/max925） / aggressive=10%（勝利時score avg858/min849/max867） / defensive=100%（勝利時score avg796/min720/max913）
双牙の魔獣 × 笑蓮: balanced=100%（勝利時score avg834/min704/max915） / aggressive=50%（勝利時score avg864/min778/max936） / defensive=100%（勝利時score avg826/min720/max919）
蒼海の龍神 × 恵比寿: balanced=100%（勝利時score avg870/min724/max938） / aggressive=85%（勝利時score avg857/min746/max932） / defensive=100%（勝利時score avg831/min737/max945）
蒼海の龍神 × 大耀: balanced=100%（勝利時score avg870/min730/max962） / aggressive=80%（勝利時score avg887/min828/max1007） / defensive=100%（勝利時score avg826/min751/max942）
蒼海の龍神 × 蒼毘: balanced=100%（勝利時score avg852/min816/max940） / aggressive=100%（勝利時score avg850/min815/max927） / defensive=100%（勝利時score avg880/min750/max1010）
蒼海の龍神 × 才華: balanced=100%（勝利時score avg885/min846/max973） / aggressive=70%（勝利時score avg932/min907/max954） / defensive=100%（勝利時score avg870/min786/max925）
蒼海の龍神 × 寿楽: balanced=100%（勝利時score avg794/min711/max841） / aggressive=100%（勝利時score avg798/min728/max890） / defensive=85%（勝利時score avg743/min724/max760）
蒼海の龍神 × 福永: balanced=100%（勝利時score avg826/min742/max898） / aggressive=95%（勝利時score avg860/min756/max944） / defensive=40%（勝利時score avg775/min749/max795）
蒼海の龍神 × 笑蓮: balanced=100%（勝利時score avg853/min743/max955） / aggressive=95%（勝利時score avg852/min745/max945） / defensive=100%（勝利時score avg820/min738/max940）
乱舞の道化 × 恵比寿: balanced=100%（勝利時score avg869/min800/max937） / aggressive=95%（勝利時score avg875/min767/max971） / defensive=100%（勝利時score avg835/min758/max928）
乱舞の道化 × 大耀: balanced=100%（勝利時score avg875/min783/max991） / aggressive=55%（勝利時score avg891/min787/max966） / defensive=100%（勝利時score avg810/min711/max906）
乱舞の道化 × 蒼毘: balanced=100%（勝利時score avg831/min724/max915） / aggressive=100%（勝利時score avg826/min788/max902） / defensive=100%（勝利時score avg822/min709/max913）
乱舞の道化 × 才華: balanced=100%（勝利時score avg857/min803/max953） / aggressive=60%（勝利時score avg906/min885/max922） / defensive=100%（勝利時score avg843/min761/max935）
乱舞の道化 × 寿楽: balanced=100%（勝利時score avg826/min770/max902） / aggressive=100%（勝利時score avg806/min723/max879） / defensive=95%（勝利時score avg760/min707/max871）
乱舞の道化 × 福永: balanced=100%（勝利時score avg842/min751/max937） / aggressive=80%（勝利時score avg873/min776/max939） / defensive=60%（勝利時score avg790/min750/max862）
乱舞の道化 × 笑蓮: balanced=100%（勝利時score avg854/min742/max922） / aggressive=75%（勝利時score avg881/min776/max957） / defensive=100%（勝利時score avg788/min728/max918）
 ✓ src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > DAILY-01：神域強化×全神×全敵で、少なくとも1戦略が50%以上の勝率を保つ（Daily詰み防止） 819ms
--- 決定98計測：撃破ラウンド別の平均スコア（全神・全戦略・全難易度、勝利試合のみ） ---
--- 決定98計測：戦略別の平均スコア（勝利試合のみ、全神・全難易度） ---
 ✓ src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 決定59：aggressive戦略の「勝率は低いが勝利時スコアは高い」ハイリスク・ハイリターン性を保証する（再現防止） 89ms
stdout | src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 決定126 STAKE-01：神階Ⅰ〜Ⅶ×7神×7敵で、各神に少なくとも1戦略が段別の下限勝率を満たす（神の公平性ゲート）
--- STAKE-01 神階Ⅰ〜Ⅶ（7敵×6seeds×3戦略、Ⅶは3択の最良） ---
 ✓ src/core/engine/balanceSim.test.ts > バランスシミュレーション（Planner用・アサーションなし） > 決定126 STAKE-01：神階Ⅰ〜Ⅶ×7神×7敵で、各神に少なくとも1戦略が段別の下限勝率を満たす（神の公平性ゲート） 1926ms
```
