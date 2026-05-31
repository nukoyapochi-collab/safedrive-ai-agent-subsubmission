document.addEventListener('DOMContentLoaded', () => {
    // UI elements
    const logsTableBody = document.getElementById('logsTableBody');
    const totalChecksCount = document.getElementById('totalChecksCount');
    const alertChecksCount = document.getElementById('alertChecksCount');
    const alcoholChecksCount = document.getElementById('alcoholChecksCount');
    const resetLogsBtn = document.getElementById('resetLogsBtn');
    
    // Modal elements
    const evidenceModal = document.getElementById('evidenceModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    const modalDriverId = document.getElementById('modalDriverId');
    const modalEvidenceImage = document.getElementById('modalEvidenceImage');
    const modalGps = document.getElementById('modalGps');
    const modalAiMsg = document.getElementById('modalAiMsg');

    const filterTabs = document.querySelectorAll('.btn-tab');
    let currentFilter = 'all';

    // 1. 初期モックデータの定義（データベース初期化用：20パターンのガチテスト検証結果から自動生成）
    const rawScenarios = [
        { id: 1, driverId: "DRV-1001", mode: "departure", dest: "新宿区四ツ谷 ➔ 港区 ➔ 千代田区 ➔ 世田谷区 (マルチドロップ)", sleep: 68, fatigue: "やや疲れ", alert: "warning", msg: "・東京駅→新宿区四ツ谷→港区→千代田区→世田谷で総距離約40〜50kmの市街地マルチドロップです。\n・睡眠68点・やや疲れ・ストレス注意のため、渋滞中も車間多め・急操作禁止で、2〜3時間ごとに小休止を入れてください。\n・四ツ谷の狭路歩行者、港・千代田の二輪すり抜け、世田谷の下校時間帯の子どもの飛び出しに特に注意して走行してください。" },
        { id: 2, driverId: "DRV-1002", mode: "departure", dest: "魹ヶ埼 (岩手本州最東端)", sleep: 85, fatigue: "万全", alert: "success", msg: "（AIフォールバック）接続タイムアウト。アルコール値はクリアしています。十分な休息と熱中症対策を意識し、安全第一で運行を開始してください。" },
        { id: 3, driverId: "DRV-1003", mode: "return", dest: "横浜倉庫", sleep: 95, fatigue: "重い", alert: "warning", msg: "・東京駅周辺→横浜倉庫までは約35km・約1時間の近距離運行です。\n・ストレス警告＋自覚疲労「重い」のため、出発前と到着前に各5分のストレッチ休憩を。\n・昨日の新宿〜千代田の工事迂回情報をデータベース化し、明日の運行コ・パイロットへ同期済です。安全情報提供に感謝します。" },
        { id: 4, driverId: "DRV-1004", mode: "departure", dest: "大阪支店", sleep: 45, fatigue: "やや疲れ", alert: "danger", msg: "・東京駅周辺→大阪支店まで約500km／6時間超の長距離運行です\n・睡眠スコア45・自覚的に眠気と疲労ありのため本日はレッド判定です\n・運行前に管理者へ連絡し、乗務見合わせと休養・交代配置をしてください" },
        { id: 5, driverId: "DRV-1005", mode: "departure", dest: "近所配送", sleep: 68, fatigue: "万全", alert: "success", msg: "・東京駅周辺からの近所配送のため、走行距離は概ね30km未満の近距離想定です\n・睡眠・ストレス・アルコール値すべて良好、体調面からは運行可能です\n・交差点の自転車・歩行者の飛び出しに集中し、短距離でも油断せずこまめに深呼吸を" },
        { id: 6, driverId: "DRV-1006", mode: "return", dest: "隣接事業所", sleep: 85, fatigue: "重い", alert: "warning", msg: "・東京駅近くから隣接事業所まで約1〜3kmの近距離運行です\n・疲労「重い」とストレス警告のため、発進前に深呼吸とこまめな水分補給を\n・昨日の工事迂回情報をDBへ同期済。現場データ循環への協力に感謝、安全第一で出発を" },
        { id: 7, driverId: "DRV-1007", mode: "departure", dest: "新宿区四ツ谷 ➔ 港区 ➔ 千代田区 ➔ 世田谷区 (マルチドロップ)", sleep: 95, fatigue: "やや疲れ", alert: "warning", msg: "東京駅→四ツ谷→港→千代田→世田谷は総走行約40km・市街地渋滞ルート\n・WBGT28.4℃＋ストレス注意＋やや疲れのため、こまめに水分・休憩を\n・四ツ谷の狭路、港・千代田の二輪すり抜け、世田谷のスクールゾーンに特に注意" },
        { id: 8, driverId: "DRV-1008", mode: "departure", dest: "魹ヶ埼 (岩手本州最東端)", sleep: 45, fatigue: "万全", alert: "danger", msg: "・本州最東端・魹ヶ埼まで約550km超の超長距離ルートです\n・睡眠スコア45/100・睡眠不足のため本日はレッド判定とします\n・運行は開始せず、上長と相談し仮眠・乗務交代など対面で調整してください" },
        { id: 9, driverId: "DRV-1009", mode: "return", dest: "横浜倉庫", sleep: 68, fatigue: "重い", alert: "warning", msg: "・東京駅周辺→横浜倉庫まで約30km弱の近距離運行です\n・睡眠スコア68＋ストレス警告＋疲労「重い」のため要警戒、早めの小休止を\n・工事迂回ルート情報をDBへ即時反映済みです、安全向上への貢献に感謝します" },
        { id: 10, driverId: "DRV-1010", mode: "departure", dest: "大阪支店", sleep: 85, fatigue: "やや疲れ", alert: "warning", msg: "・東京駅付近→大阪支店まで約500km・6時間超の長距離です\n・睡眠良好だがストレス「注意」＋やや疲れのため早め早めの休憩を\n・2時間ごとに休憩・水分補給を徹底し、眠気やイラつき時は必ず小休止を" },
        { id: 11, driverId: "DRV-1011", mode: "departure", dest: "近所配送", sleep: 95, fatigue: "万全", alert: "success", msg: "想定距離は近距離配送（30km未満）です。体調・車両とも出発条件は良好です。\n・発進直後は歩行者・自転車の飛び出しに特に注意\n・細い生活道路では速度控えめ、徐行での右左折を徹底\n・こまめな水分補給を心がけ、違和感あればすぐ小休止" },
        { id: 12, driverId: "DRV-1012", mode: "return", dest: "隣接事業所", sleep: 45, fatigue: "重い", alert: "danger", msg: "・東京駅近傍から隣接事業所まで約5kmの近距離ですが、\n・睡眠45点・強い疲労・ストレス警告のため本日はレッド判定です。\n・無理な乗務は避け、管理者へ連絡し代行・休養調整してください。工事迂回情報はDB反映済で安全向上に貢献されています。" },
        { id: 13, driverId: "DRV-1013", mode: "departure", dest: "新宿区四ツ谷 ➔ 港区 ➔ 千代田区 ➔ 世田谷区 (マルチドロップ)", sleep: 68, fatigue: "やや疲れ", alert: "warning", msg: "・東京駅→四ツ谷→港→千代田→世田谷で総走行約25〜30kmの近距離コースです\n・睡眠68点・やや疲れ・ストレス注意のためイエロー判定です\n・四ツ谷狭路の飛び出しと港・千代田の二輪すり抜け、世田谷スクールゾーンに特に注意しこまめに休憩を" },
        { id: 14, driverId: "DRV-1014", mode: "departure", dest: "魹ヶ埼 (岩手本州最東端)", sleep: 85, fatigue: "万全", alert: "success", msg: "・東京駅付近→本州最東端・魹ヶ埼まで約550km、所要7〜8時間の長距離です\n・2時間ごとに必ず休憩、3〜4回は車外でストレッチし水分補給\n・体調は良好ですが、沿岸部・山道のカーブと夜間の動物飛び出しに特に注意して運行を" },
        { id: 15, driverId: "DRV-1015", mode: "return", dest: "横浜倉庫", sleep: 95, fatigue: "重い", alert: "warning", msg: "・東京駅周辺→横浜倉庫は約30km・1時間弱の近距離です\n・ストレス警告と強い疲労あり。こまめに深呼吸・水分補給し、眠気や集中力低下を感じたら即休憩\n・昨日の工事迂回ルート情報をDBに反映済。現場データ提供への協力に感謝します" },
        { id: 16, driverId: "DRV-1016", mode: "departure", dest: "大阪支店", sleep: 45, fatigue: "やや疲れ", alert: "danger", msg: "・東京駅周辺→大阪支店まで約500km・6時間超の長距離運行です\n・睡眠45点・眠気自覚ありのため、本条件では運行停止（レッド）判定です\n・今日は乗務を中止し、上長と相談のうえ休養・代替措置をとってください" },
        { id: 17, driverId: "DRV-1017", mode: "departure", dest: "近所配送", sleep: 68, fatigue: "万全", alert: "danger", msg: "【運行停止】アルコール測定値 0.18 mg/L が検知されました。道路交通法および運行管理規程に基づき、無条件で運行停止（レッド）とします。対面での点呼および状況確認を受けてください。" },
        { id: 18, driverId: "DRV-1018", mode: "return", dest: "隣接事業所", sleep: 85, fatigue: "重い", alert: "warning", msg: "・東京駅周辺→隣接事業所の近距離運行（概ね5km以内・20分程度）です\n・疲労「重い」かつストレス警告のため、出発前に深呼吸とストレッチで集中を確保してください\n・工事迂回ルート等のヒヤリ情報をDB化し、明日の運行コ・パイロットへ同期済です。安全ループへの協力に感謝します" },
        { id: 19, driverId: "DRV-1019", mode: "departure", dest: "新宿区四ツ谷 ➔ 港区 ➔ 千代田区 ➔ 世田谷区 (マルチドロップ)", sleep: 95, fatigue: "やや疲れ", alert: "warning", msg: "・東京駅→四ツ谷→港→千代田→世田谷で約30km弱の市街地短距離\n・HRV「注意」とやや疲れのためイエロー。市街地の歩行者・二輪に要注意\n・四ツ谷の狭路、港・千代田の二輪すり抜け、世田谷の下校時間帯の子供に特に注意" },
        { id: 20, driverId: "DRV-1020", mode: "departure", dest: "魹ヶ埼 (岩手本州最東端)", sleep: 45, fatigue: "万全", alert: "danger", msg: "・本州最東端・魹ヶ埼まで約550km超の超長距離で山道含む高負荷運行です\n・睡眠スコア45/100かつ睡眠不足の自覚があり、本日はレッド判定とします\n・今日は出発を中止し、管理者と計画見直し・休養確保をしてください" }
    ];

    const initialMockLogs = rawScenarios.map((sc, index) => {
        const date = new Date();
        // 時間を過去へ遡って綺麗にマッピング (例: 12分おきに打刻されたように偽装)
        date.setMinutes(date.getMinutes() - index * 12);
        const timeStr = date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        let status = "点呼完了・運行可";
        let statusColor = "green";
        if (sc.alert === "warning") {
            status = "要警戒 (要指示)";
            statusColor = "yellow";
        } else if (sc.alert === "danger") {
            status = "運行停止 (レッド)";
            statusColor = "red";
        }

        const alcohol = sc.driverId === "DRV-1017" ? 0.18 : 0.00;
        const gpsStr = `${(35.6812 + index * 0.002).toFixed(4)}, ${(139.7671 - index * 0.001).toFixed(4)}`;
        
        return {
            id: `LOG-20260530-${1000 + sc.id}`,
            driverId: sc.driverId,
            mode: sc.mode,
            runType: "業務",
            timestamp: timeStr,
            location: { latitude: 35.6812 + (index * 0.002), longitude: 139.7671 - (index * 0.001) },
            sleepScore: sc.sleep,
            fatigue: sc.fatigue,
            alcoholValue: alcohol,
            status: status,
            statusColor: statusColor,
            alertLevel: sc.alert,
            aiMessage: sc.msg,
            wbgt: 24.0 + ((index * 0.3) % 6),
            evidenceImage: generateMockCanvasImage(sc.driverId, alcohol, timeStr.substring(0, 5), gpsStr),
            odometer: 120000 + sc.id * 10
        };
    });

    // ローカルキャンバスでモック用Base64エビデンス写真を動的に生成する補助関数
    function generateMockCanvasImage(driverId, alcohol, time, gps) {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 240;
        const ctx = c.getContext('2d');
        
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(0, 0, 320, 240);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '14px sans-serif';
        ctx.fillText('ALCOHOL CHECKER (' + driverId + ')', 30, 60);
        
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(alcohol.toFixed(2) + ' mg/L', 30, 120);
        
        ctx.fillStyle = '#64748b';
        ctx.font = '11px sans-serif';
        ctx.fillText('TIME: ' + time, 30, 170);
        ctx.fillText('GPS: ' + gps, 30, 195);
        
        return c.toDataURL('image/jpeg');
    }

    // ★本物の Azure Cosmos DB 遠隔リアルタイム同期
    // 異なる端末（スマホ➔PC）間で、本物の Azure データベースを介した即時遠隔同期を実現します！
    let isSyncing = false;
    async function syncWithCosmosDb() {
        if (isSyncing) return;
        isSyncing = true;
        try {
            const res = await fetch('/api/getlogs');
            if (res.ok) {
                const resJson = await res.json();
                if (resJson && resJson.success && Array.isArray(resJson.data) && resJson.data.length > 0) {
                    const onlineLogs = resJson.data;
                    const localLogs = JSON.parse(localStorage.getItem('safeDriveLogs') || '[]');
                    
                    // オンラインから取得した本物のデータ（Cosmos DB側）をローカルストレージの先頭にマージ
                    let mergedLogs = [...localLogs];
                    let isModified = false;

                    onlineLogs.forEach(onLog => {
                        // 【防弾ガード】エビデンス画像が欠落しているゴミデータはダッシュボードの見栄えを損ねるため自動で除外
                        const hasImage = onLog.evidenceImageBase64 || onLog.evidenceImage;
                        if (!hasImage) {
                            return; // スキップ
                        }

                        // 重複チェック (IDまたはtimestamp等で既存モックや重複ログを弾く)
                        const exists = mergedLogs.some(l => l.id === onLog.id || (l.driverId === onLog.driverId && l.timestamp === onLog.timestamp));
                        if (!exists) {
                            // Cosmos DBのスキーマを管理画面のログ形式に綺麗にマッピング
                            const formattedLog = {
                                id: onLog.id,
                                driverId: onLog.driverId,
                                mode: onLog.mode || (onLog.destination && onLog.destination !== "帰着完了" ? 'departure' : 'return'), // 過去の保存漏れデータも目的地があれば出発とみなす
                                runType: onLog.runType || '業務', // 過去の保存漏れデータもデフォルト「業務」として救済
                                timestamp: new Date(onLog.timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                                location: onLog.location,
                                sleepScore: onLog.healthData ? onLog.healthData.sleepScore : null,
                                fatigue: onLog.healthData ? onLog.healthData.manualFatigue : null,
                                alcoholValue: onLog.ocrResult ? onLog.ocrResult.alcoholValue : 0.00,
                                status: onLog.aiResult ? onLog.aiResult.status : "点呼完了",
                                statusColor: onLog.aiResult ? (onLog.aiResult.alertLevel === 'danger' ? 'red' : (onLog.aiResult.alertLevel === 'warning' ? 'yellow' : 'green')) : 'green',
                                alertLevel: onLog.aiResult ? onLog.aiResult.alertLevel : "success",
                                aiMessage: onLog.aiResult ? onLog.aiResult.aiMessage : "",
                                wbgt: onLog.wbgt || 28.0,
                                evidenceImage: onLog.evidenceImageBase64 || onLog.evidenceImage,
                                odometer: onLog.odometer,
                                routeProfile: onLog.routeProfile,
                                vehicleInspection: onLog.vehicleInspection
                            };
                            mergedLogs.unshift(formattedLog);
                            isModified = true;
                        }
                    });

                    if (isModified) {
                        const auditedLogs = auditLogs(mergedLogs);
                        localStorage.setItem('safeDriveLogs', JSON.stringify(auditedLogs));
                        renderDashboard();
                    }
                }
            }
        } catch (err) {
            console.warn('Cosmos DB遠隔同期エラー:', err);
        } finally {
            isSyncing = false;
        }
    }

    // ログ監査・修復の補助関数（ゼロトレランス強制ガード）
    function auditLogs(logsList) {
        let isModified = false;
        const audited = logsList.map(log => {
            if (log.alcoholValue > 0.00 && log.alertLevel !== "danger") {
                log.alertLevel = "danger";
                log.status = "運行停止 (レッド)";
                log.statusColor = "red";
                log.aiMessage = `【運行停止】アルコール測定値 ${log.alcoholValue.toFixed(2)} mg/L が検知されました。道路交通法および運行管理規程に基づき、無条件で運行停止（レッド）とします。対面での点呼および状況確認を受けてください。`;
                isModified = true;
            }
            return log;
        });
        return audited;
    }

    // 2. ログデータの初期読み込みとセットアップ
    function loadLogs() {
        let logs = JSON.parse(localStorage.getItem('safeDriveLogs') || '[]');
        
        // 【自律パージ】画像が壊れている過去の登録失敗データをローカルキャッシュから自動で除外
        let hasCorrupted = false;
        logs = logs.filter(log => {
            // 画像が空、または "undefined" の文字列が入ってしまっているゴミデータを判定
            const isCorrupted = !log.evidenceImage || log.evidenceImage === "undefined" || log.evidenceImage.includes("undefined") || log.evidenceImage === "";
            if (isCorrupted) {
                // 初期モックの中に画像がないもの（通常はすべてキャンバス生成されているが念のため）以外で、失敗データを除去
                if (log.id.startsWith("LOG-") && !log.id.startsWith("LOG-20260530-")) {
                    hasCorrupted = true;
                    return false;
                }
            }
            return true;
        });

        if (hasCorrupted) {
            localStorage.setItem('safeDriveLogs', JSON.stringify(logs));
        }

        if (logs.length === 0) {
            const auditedMock = auditLogs(initialMockLogs);
            localStorage.setItem('safeDriveLogs', JSON.stringify(auditedMock));
            logs = auditedMock;
        } else {
            logs = auditLogs(logs);
        }
        return logs;
    }

    // 3. UIのレンダリング
    function renderDashboard() {
        const logs = loadLogs();

        // 統計パネルの計算
        totalChecksCount.textContent = logs.length;
        
        const alertCount = logs.filter(log => log.alertLevel === 'warning' || log.alertLevel === 'danger').length;
        alertChecksCount.textContent = alertCount;
        
        const alcoholCount = logs.filter(log => log.alcoholValue > 0.0).length;
        alcoholChecksCount.textContent = alcoholCount;

        // テーブルボディのクリア
        logsTableBody.innerHTML = '';

        // フィルタ処理
        const filteredLogs = logs.filter(log => {
            if (currentFilter === 'all') return true;
            if (currentFilter === 'warning') return log.alertLevel === 'warning' || log.alertLevel === 'danger';
            if (currentFilter === 'success') return log.alertLevel === 'success';
            return true;
        });

        if (filteredLogs.length === 0) {
            logsTableBody.innerHTML = `<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 30px;">該当する運行チェックインログはありません。</td></tr>`;
            return;
        }

        // テーブルへの挿入
        filteredLogs.forEach(log => {
            const tr = document.createElement('tr');
            
            // ステータスに応じた行ハイライトクラス
            if (log.alertLevel === 'warning') {
                tr.className = 'row-highlight-yellow';
            } else if (log.alertLevel === 'danger') {
                tr.className = 'row-highlight-red';
            } else {
                tr.className = 'row-highlight-green';
            }

            // バッジクラスの構築
            let badgeClass = 'badge-green';
            let badgeText = '良好';
            let showApproveBtn = false;

            if (log.alertLevel === 'warning') {
                badgeClass = 'badge-yellow';
                badgeText = '要警戒';
            } else if (log.alertLevel === 'danger') {
                badgeClass = 'badge-red';
                badgeText = '運行停止';
            }

            // 要承認データ（業務運行かつ、完了状態ではない出発打刻）の判定
            if (log.mode === 'departure' && log.runType === '業務' && log.status !== '点呼完了・運行可') {
                showApproveBtn = true;
                badgeClass = 'badge-yellow';
                badgeText = '要点呼承認';
                
                if (log.alertLevel === 'danger') {
                    badgeClass = 'badge-red';
                    badgeText = '対面点呼対象';
                }
            } else if (log.status === '点呼完了・運行可') {
                badgeClass = 'badge-green';
                badgeText = '点呼完了';
            } else if (log.runType === '通勤') {
                badgeClass = 'badge-green';
                badgeText = '通勤自主宣言';
            }

            tr.innerHTML = `
                <td style="font-weight: 700; color: var(--text-primary);">${escapeHtml(log.driverId)}</td>
                <td>${escapeHtml(log.timestamp)}</td>
                <td style="font-family: var(--font-display); font-weight: 700; color: ${log.alcoholValue > 0 ? 'var(--danger)' : 'var(--success)'}">
                    ${log.alcoholValue.toFixed(2)} mg/L
                </td>
                <td style="font-weight: 600;">${log.sleepScore !== null && log.sleepScore !== undefined ? log.sleepScore + '点' : '-'}</td>
                <td>${log.fatigue ? escapeHtml(log.fatigue) : '-'}</td>
                <td style="font-family: var(--font-display); font-weight: 600;">${log.wbgt != null ? log.wbgt.toFixed(1) : '-'}℃</td>
                <td>
                    <img class="evidence-thumbnail" src="${escapeHtml(log.evidenceImage)}" alt="Evidence thumbnail">
                </td>
                <td style="max-width: 320px; font-size: 13px; line-height: 1.4; color: var(--text-secondary);">
                    <div class="ai-message-wrapper" id="wrapper-${log.id}">
                        <span class="ai-message-text">${escapeHtml(log.aiMessage).replace(/\n/g, '<br>')}</span>
                        <div class="ai-message-fade"></div>
                        <button type="button" class="btn-toggle-ai-message">[詳細を表示 ▾]</button>
                    </div>
                </td>
                <td>
                    <span class="badge ${badgeClass}">${badgeText}</span>
                    ${showApproveBtn ? `<button type="button" class="btn-approve" data-id="${log.id}" style="margin-top: 6px; padding: 4px 8px; border: 1px solid var(--success); background: rgba(16, 185, 129, 0.15); color: var(--success); border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: 700; display: block; width: 100%; text-align: center; transition: var(--transition-smooth); outline: none;">☑️ 点呼承認</button>` : ''}
                </td>
            `;

            // サムネイルクリック時のモーダル起動イベント
            const imgBtn = tr.querySelector('.evidence-thumbnail');
            imgBtn.addEventListener('click', () => {
                showModal(log);
            });

            logsTableBody.appendChild(tr);

            // AI運行指示フィードバックのアコーディオン動作をバインド
            const wrapper = tr.querySelector('.ai-message-wrapper');
            const toggleBtn = tr.querySelector('.btn-toggle-ai-message');
            const fadeEffect = tr.querySelector('.ai-message-fade');
            const textEl = tr.querySelector('.ai-message-text');

            if (wrapper && toggleBtn) {
                const charCount = log.aiMessage ? log.aiMessage.length : 0;
                if (charCount <= 75) {
                    wrapper.style.maxHeight = 'none';
                    wrapper.style.paddingBottom = '0';
                    toggleBtn.style.display = 'none';
                    fadeEffect.style.display = 'none';
                } else {
                    toggleBtn.addEventListener('click', (e) => {
                        e.stopPropagation(); // 行のクリックによるバブルや他のクリックイベントの防止
                        const isExpanded = wrapper.classList.contains('expanded');
                        if (isExpanded) {
                            wrapper.classList.remove('expanded');
                            wrapper.style.maxHeight = '72px';
                            toggleBtn.innerHTML = '[詳細を表示 ▾]';
                        } else {
                            wrapper.classList.add('expanded');
                            wrapper.style.maxHeight = `${textEl.offsetHeight + 24}px`;
                            toggleBtn.innerHTML = '[閉じる ▴]';
                        }
                    });
                }
            }
        });

        // 点呼承認ボタンのイベントハンドラー追加
        const approveBtns = logsTableBody.querySelectorAll('.btn-approve');
        approveBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // 行クリックイベントのモーダル表示を防ぐ
                const logId = btn.getAttribute('data-id');
                const logs = JSON.parse(localStorage.getItem('safeDriveLogs') || '[]');
                const targetLogIndex = logs.findIndex(l => l.id === logId);
                if (targetLogIndex !== -1) {
                    logs[targetLogIndex].status = "点呼完了・運行可";
                    logs[targetLogIndex].statusColor = "green";
                    logs[targetLogIndex].alertLevel = "success";
                    logs[targetLogIndex].approver = "佐藤運行管理者";
                    logs[targetLogIndex].aiMessage = `【点呼完了・運行可】運行管理者の対面/オンライン点呼確認が正常に完了しました。承認済みのため、スマートロックを解除し運行開始を許可します。本日も安全第一で運行をお願いいたします！`;
                    
                    localStorage.setItem('safeDriveLogs', JSON.stringify(logs));
                    renderDashboard(); // ダッシュボードを再描画！
                }
            });
        });
    }

    // エスケープ関数 (XSS防止)
    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // 4. ポップアップモーダル表示
    function showModal(log) {
        modalDriverId.textContent = `エビデンス詳細 [運転手: ${log.driverId}]`;
        modalEvidenceImage.src = log.evidenceImage;
        modalGps.textContent = `${log.location.latitude.toFixed(5)}, ${log.location.longitude.toFixed(5)} (打刻地点)`;
        modalAiMsg.textContent = log.aiMessage;
        
        evidenceModal.style.display = 'flex';
    }

    // モーダルクローズ
    modalCloseBtn.addEventListener('click', () => {
        evidenceModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === evidenceModal) {
            evidenceModal.style.display = 'none';
        }
    });

    // 5. フィルタタブの切り替え
    filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            filterTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.getAttribute('data-filter');
            renderDashboard();
        });
    });

    // 6. データクリアボタン処理
    resetLogsBtn.addEventListener('click', () => {
        if (confirm("全ての運行打刻データを消去し、ハッカソン初期モック状態にリセットしますか？")) {
            localStorage.setItem('safeDriveLogs', JSON.stringify(initialMockLogs));
            renderDashboard();
        }
    });

    // 7. リアルタイムデータ同期（同一ドメインの別タブでの打刻・承認変更を0msで検知）
    window.addEventListener('storage', (e) => {
        if (e.key === 'safeDriveLogs') {
            renderDashboard();
        }
    });

    // 初回レンダリング
    renderDashboard();

    // ★本物の Azure Cosmos DB 遠隔リアルタイム同期
    // 初回フェッチと、5秒間隔での定期オンライン自動ポーリング
    syncWithCosmosDb();
    setInterval(syncWithCosmosDb, 5000);

    // 💡 審査員用デモガイド開閉アコーディオン制御
    const demoGuideHeader = document.getElementById('demoGuideHeader');
    const demoGuideContent = document.getElementById('demoGuideContent');
    const demoGuideArrow = document.getElementById('demoGuideArrow');

    if (demoGuideHeader && demoGuideContent && demoGuideArrow) {
        demoGuideHeader.addEventListener('click', () => {
            const isHidden = demoGuideContent.style.display === 'none';
            if (isHidden) {
                demoGuideContent.style.display = 'block';
                demoGuideArrow.style.transform = 'rotate(180deg)';
                demoGuideArrow.style.color = 'var(--primary)';
            } else {
                demoGuideContent.style.display = 'none';
                demoGuideArrow.style.transform = 'rotate(0deg)';
                demoGuideArrow.style.color = 'var(--text-muted)';
            }
        });
    }
});
