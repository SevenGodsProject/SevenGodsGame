# Cost-Short Marking v1 Gate 1：measure-hand Before/After 箱比較

runs: docs/evidence/cost-short-marking-v1/05-measure-hand/runs（Before＝v1.0.5 dist／After＝csm1 dist・大耀 × 蒼海の龍神・seed d266-hand）

| VP | 手札 | arena hash B/A | dock hash B/A | hand hash B/A | cards hash B/A | 最大差 px（arena/dock/hand/cards） | 当たり B→A | 文字切れ B→A | 横スク B→A | 判定 |
|---|---|---|---|---|---|---|---|---|---|---|
| pc660 | 5→5 | 7f5c335f74b9/7f5c335f74b9 | 65abea9d4984/65abea9d4984 | 3aab974b7452/3aab974b7452 | 71d71a21f0f6/71d71a21f0f6 | 0/0/0/0 | 5/5→5/5 | 0→0 | 0→0 | PASS |
| pc660 | 7→7 | 7f5c335f74b9/7f5c335f74b9 | 65abea9d4984/65abea9d4984 | 3aab974b7452/3aab974b7452 | 9d3c9fdd4e9a/9d3c9fdd4e9a | 0/0/0/0 | 7/7→7/7 | 0→0 | 0→0 | PASS |
| pc660 | 9→9 | 7f5c335f74b9/7f5c335f74b9 | 65abea9d4984/65abea9d4984 | 3aab974b7452/3aab974b7452 | b5b19fa41dd6/b5b19fa41dd6 | 0/0/0/0 | 9/9→9/9 | 0→0 | 0→0 | PASS |
| pc660 | 10→10 | 7f5c335f74b9/7f5c335f74b9 | 65abea9d4984/65abea9d4984 | 3aab974b7452/3aab974b7452 | b8955cf80dc2/b8955cf80dc2 | 0/0/0/0 | 10/10→10/10 | 0→0 | 0→0 | PASS |
| pc660 | click | B {"idx":0,"before":10,"after":9,"reacted":true} | A {"idx":0,"before":10,"after":9,"reacted":true} | | | | | | console B 0／A 0 | PASS |
| pc800 | 5→5 | 396e1cb6cf01/396e1cb6cf01 | ba892974c57c/ba892974c57c | 76606cad1b0d/76606cad1b0d | 5d876886dc2f/5d876886dc2f | 0/0/0/0 | 5/5→5/5 | 0→0 | 0→0 | PASS |
| pc800 | 7→7 | 396e1cb6cf01/396e1cb6cf01 | ba892974c57c/ba892974c57c | 76606cad1b0d/76606cad1b0d | c83719916803/c83719916803 | 0/0/0/0 | 7/7→7/7 | 0→0 | 0→0 | PASS |
| pc800 | 9→9 | 396e1cb6cf01/396e1cb6cf01 | ba892974c57c/ba892974c57c | 76606cad1b0d/76606cad1b0d | d8d9448ffc90/d8d9448ffc90 | 0/0/0/0 | 9/9→9/9 | 0→0 | 0→0 | PASS |
| pc800 | 10→10 | 396e1cb6cf01/396e1cb6cf01 | ba892974c57c/ba892974c57c | 76606cad1b0d/76606cad1b0d | 4536b2fd7e98/4536b2fd7e98 | 0/0/0/0 | 10/10→10/10 | 0→0 | 0→0 | PASS |
| pc800 | click | B {"idx":0,"before":10,"after":9,"reacted":true} | A {"idx":0,"before":10,"after":9,"reacted":true} | | | | | | console B 0／A 0 | PASS |
| sp660 | 5→5 | 2b9f858939e5/2b9f858939e5 | 4161ba81cf1c/4161ba81cf1c | 0cf3befc3779/0cf3befc3779 | f67617024c9f/f67617024c9f | 0/0/0/0 | 5/5→5/5 | 0→0 | 0→0 | PASS |
| sp660 | 7→7 | 2b9f858939e5/2b9f858939e5 | 4161ba81cf1c/4161ba81cf1c | 0cf3befc3779/0cf3befc3779 | 90674aada74d/90674aada74d | 0/0/0/0 | 7/7→7/7 | 0→0 | 0→0 | PASS |
| sp660 | 9→9 | 2b9f858939e5/2b9f858939e5 | 4161ba81cf1c/4161ba81cf1c | 0cf3befc3779/0cf3befc3779 | 99159619ce07/99159619ce07 | 0/0/0/0 | 9/9→9/9 | 0→0 | 0→0 | PASS |
| sp660 | 10→10 | 2b9f858939e5/2b9f858939e5 | 4161ba81cf1c/4161ba81cf1c | 0cf3befc3779/0cf3befc3779 | 304dc08be733/304dc08be733 | 0/0/0/0 | 10/10→10/10 | 0→0 | 0→0 | PASS |
| sp660 | click | B {"idx":0,"before":10,"after":9,"reacted":true} | A {"idx":0,"before":10,"after":9,"reacted":true} | | | | | | console B 0／A 0 | PASS |
| sp844 | 5→5 | 9c2718045709/9c2718045709 | 0417b7e7e198/0417b7e7e198 | 68ef7c7efcff/68ef7c7efcff | ce828af21aac/ce828af21aac | 0/0/0/0 | 5/5→5/5 | 0→0 | 0→0 | PASS |
| sp844 | 7→7 | 9c2718045709/9c2718045709 | 0417b7e7e198/0417b7e7e198 | 68ef7c7efcff/68ef7c7efcff | 1d1104809f73/1d1104809f73 | 0/0/0/0 | 7/7→7/7 | 0→0 | 0→0 | PASS |
| sp844 | 9→9 | 9c2718045709/9c2718045709 | 0417b7e7e198/0417b7e7e198 | 68ef7c7efcff/68ef7c7efcff | 617234cab4ff/617234cab4ff | 0/0/0/0 | 9/9→9/9 | 0→0 | 0→0 | PASS |
| sp844 | 10→10 | 9c2718045709/9c2718045709 | 0417b7e7e198/0417b7e7e198 | 68ef7c7efcff/68ef7c7efcff | cebe473f9835/cebe473f9835 | 0/0/0/0 | 10/10→10/10 | 0→0 | 0→0 | PASS |
| sp844 | click | B {"idx":0,"before":10,"after":9,"reacted":true} | A {"idx":0,"before":10,"after":9,"reacted":true} | | | | | | console B 0／A 0 | PASS |

rows: 16・FAIL 0・判定 PASS
