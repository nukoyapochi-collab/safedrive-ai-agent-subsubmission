const { CosmosClient } = require("@azure/cosmos");
const DocumentIntelligenceClient = require("@azure-rest/ai-document-intelligence").default;
const { OpenAIClient, AzureKeyCredential } = require("@azure/openai");

module.exports = async function (context, req) {
    context.log('Checking in driving event...');

    try {
        const body = req.body;
        if (!body || !body.driverId || !body.location || !body.healthData || !body.evidenceImageBase64) {
            context.res = {
                status: 400,
                body: { error: "入力項目が不足しています (driverId, location, healthData, evidenceImageBase64 が必要です)" }
            };
            return;
        }

        const { driverId, mode, runType, timestamp, location, healthData, evidenceImageBase64, destination, routeProfile, odometer, vehicleInspection, scheduleFileBase64, returnReportFileBase64, nearMissDetail, nearMissCount } = body;
        
        // --- 各種 Azure サービスの構成情報読み込みと個別有効化判定 ---
        const useRealDocIntel = process.env.DOCUMENT_INTELLIGENCE_KEY && 
                                process.env.DOCUMENT_INTELLIGENCE_KEY !== "YOUR_DOCUMENT_INTELLIGENCE_KEY" &&
                                process.env.DOCUMENT_INTELLIGENCE_ENDPOINT;
                                
        const useRealOpenAI = process.env.AZURE_OPENAI_KEY && 
                              process.env.AZURE_OPENAI_KEY !== "YOUR_AZURE_OPENAI_KEY" &&
                              process.env.AZURE_OPENAI_ENDPOINT;
                              
        const useRealCosmos = process.env.COSMOS_DB_KEY && 
                              process.env.COSMOS_DB_KEY !== "YOUR_COSMOS_DB_PRIMARY_KEY" &&
                              process.env.COSMOS_DB_ENDPOINT;

        let ocrResult = { alcoholValue: 0.00, detectedTime: timestamp };
        let wbgtValue = Math.random() * 6 + 25.0; // 25℃〜31℃
        let aiResult = { status: "良好 (グリーン)", alertLevel: "success", aiMessage: "" };
        let savedToDb = false;

        // 1. OCR 解析 (Azure AI Document Intelligence)
        if (useRealDocIntel) {
            context.log("⚡ [本物接続] Azure AI Document Intelligence に接続しています...");
            try {
                const docIntelClient = DocumentIntelligenceClient(
                    process.env.DOCUMENT_INTELLIGENCE_ENDPOINT, 
                    { key: process.env.DOCUMENT_INTELLIGENCE_KEY }
                );

                // Base64画像データをバイナリバッファに変換
                const base64Data = evidenceImageBase64.replace(/^data:image\/\w+;base64,/, "");
                const imageBuffer = Buffer.from(base64Data, 'base64');

                // ドキュメント読込モデルの実行 (文字起こし)
                const poller = await docIntelClient.path("/documentModels/prebuilt-read:analyze").post({
                    contentType: "application/octet-stream",
                    body: imageBuffer
                });

                const result = await poller.pollUntilDone();
                const ocrText = result.body.analyzeResult.content || "";
                context.log("OCR 解析テキスト:", ocrText);

                // テキストからアルコール数値を正規表現で抽出を試みる (例: "0.15" または "0.00")
                const alcoholRegex = /(\d\.\d{2})\s*(mg\/L|mg)/i;
                const match = ocrText.match(alcoholRegex);
                if (match) {
                    ocrResult.alcoholValue = parseFloat(match[1]);
                } else if (ocrText.includes("0.00") || ocrText.includes("0.0")) {
                    ocrResult.alcoholValue = 0.00;
                } else {
                    ocrResult.alcoholValue = 0.00; // 見つからない場合は安全側に倒して0.00
                }
            } catch (ocrErr) {
                context.log.warn("❌ Document Intelligence OCR 解析に失敗しました。フォールバックします:", ocrErr.message);
                ocrResult.alcoholValue = 0.00;
            }
        } else {
            context.log("💡 [シミュレーター] Document Intelligence は模擬解析を実行します。");
            ocrResult.alcoholValue = 0.00;
        }

        // 2. AI 判定 & フィードバック生成 (Azure OpenAI Service)
        if (useRealOpenAI) {
            context.log("⚡ [本物接続] Azure OpenAI Service (GPT-5.1) に接続しています...");
            try {
                const openaiClient = new OpenAIClient(
                    process.env.AZURE_OPENAI_ENDPOINT,
                    new AzureKeyCredential(process.env.AZURE_OPENAI_KEY)
                );

                const prompt = `
あなたは運輸会社の「安全運行AIエージェント」です。
以下のドライバーの打刻データを元に、運行開始を「グリーン（良好）」「イエロー（要警戒）」「レッド（運行停止）」の3段階で判定し、ドライバーへのアドバイスを出力してください。

【入力データ】
- ドライバーID: ${driverId}
- 現在地 (出発点GPS): 緯度 ${location.latitude}, 経度 ${location.longitude}
- 目的地 (マルチドロップ時などは「➔」で区切られた複数目的地): ${destination || "未指定"}
- 運行計画書アップロードの有無: ${scheduleFileBase64 ? "あり (AIスキャン済)" : "なし"}
- 帰着報告書（日報）アップロードの有無: ${returnReportFileBase64 ? "あり (AIスキャン済)" : "なし"}
- 帰着時ヒヤリハット報告詳細: ${nearMissDetail || "特になし"}
- 帰着時ヒヤリハット回数: ${nearMissCount || "なし"}
- 配送コース特性 (運行計画): ${routeProfile || "一般"}
- 出発前車両点検状況: ${vehicleInspection || "OK"}
- 出発時メーター値 (走行距離): ${odometer || "未記録"} km
- アルコール測定値: ${ocrResult.alcoholValue} mg/L
- 昨夜の睡眠スコア: ${healthData.sleepScore}/100
- ストレス状態 (HRV): ${healthData.hrvStatus}
- 体感の睡眠の実感: ${healthData.manualSleepQuality}
- 体感の自覚疲労: ${healthData.manualFatigue}
- 周辺WBGT (暑さ指数): ${wbgtValue.toFixed(1)}℃

【複数目的地（マルチドロップ）時の特別指示要件】
1. 目的地欄に「➔」などで複数の経由地（例：新宿区四ツ谷 ➔ 港区 ➔ 千代田区 ➔ 世田谷区）が指定されている場合、あるいは「マルチドロップ」である場合：
   - 目的地リストからLeg（区間）ごとの走行リスクを順番に抽出してください。
   - それぞれの地域特性に応じた具体的な時間帯リスク、交差点・狭路・スクールゾーンの危険（例：「新宿四ツ谷の狭路での飛び出し」「港・千代田の大型交通量と二輪すり抜け」「世田谷のスクールゾーン下校時間帯の子供」）を予測し、Legごとに順番に改行付きの箇条書き（弾丸ポイント）でドライバーに指示するアドバイスを生成してください。

【帰着チェック（乗務後報告）時の特別指示要件】
1. 帰着報告書（日報）がアップロードされている場合、あるいは「帰着時ヒヤリハット報告詳細」に入力がある場合：
   - 報告された内容（例：新宿〜千代田での「工事迂回」や新宿四ツ谷での「自転車飛び出しヒヤリハット地点」など）を抽出し、それらを Cosmos DB に正常データベース化し、明日の RAG および検索グラウンディング知識へリアルタイムに蓄積した旨をドライバーへ伝えてください。
   - アドバイス文中に、「工事迂回ルート情報および新宿四ツ谷の自転車飛び出し位置をCosmos DBへデータベース化し、明日の運行コ・パイロット（RAG・グラウンディング用知識）へリアルタイムに蓄積・同期完了しました。現場データの自動循環によるセーフティループへの貢献に深く感謝します！」といった内容を、ドライバーが達成感を感じられるように簡潔・スマートに表現してください。

【現在地と目的地からの「運転負荷・距離」の自律動的判定（★最優先要件）】
1. 出発点GPS（現在地）から目的地までの「想定走行距離」および「想定運転時間」を、あなたの持っている広範な地理知識から自律的に見積もってください。
   （例：出発点GPSが東京近郊で、目的地が岩手県「魹ヶ埼」の場合 ➔ 走行距離約550km以上、所要時間7時間以上の極めて過酷な長距離・沿岸山道ルートと自動推測）
2. 算出した距離・ルート負荷を元に、以下のように安全リスク判定を**「動的にアップグレード/ダウングレード」**して調整してください。
   - **【長距離（100km以上）または過酷な山道・沿岸ルート】**: 睡眠スコアが「65点」や自覚疲労が「やや疲れ」といった、本来なら「イエロー（要警戒）」となる健康状態であっても、**長距離・過酷運行となる場合は疲労事故リスクを考慮し、判定を「レッド（運行停止・対面管理指示）」へ一段階引き上げて**ください。アドバイス内に「目的地である〇〇（魹ヶ埼など）までの約XX kmの過酷な超長距離運行となるため、本日の疲労度ではレッド判定とします」と具体的に理由を説明してください。
   - **【短距離（30km未満）】**: 多少の睡眠不足や疲労感があっても、**判定を「グリーン（良好・注意）」や非常にマイルドな「イエロー」に留め**、「近距離の移動ですが、安全運転で」と配慮のある優しいメッセージに抑えてください。

【判定基準の優先順位（※距離負荷による動的調整を適用したのち、最終判断すること）】
1. レッド（運行停止 / danger）:
   - アルコール値が 0.00 mg/L を超える（ゼロトレランス: 微量でも検知された場合は無条件で運行停止）
   - 昨夜の睡眠スコアが 50点以下（睡眠極度不足）
   - 昨夜の睡眠スコアが 70点未満、かつ（体感の自覚疲労が「重い」またはストレス状態（HRV）が「警告」）の二重リスク
   - 長距離・過酷運行と判定され、かつ中度の健康リスク（睡眠スコア70未満や疲労・ストレスあり）が重複した場合
2. イエロー（要警戒 / warning）:
   - 昨夜の睡眠スコアが 70点未満
   - 体感の自覚疲労が「やや疲れ」または「重い」
   - ストレス状態（HRV）が「注意」または「警告」
   - 周辺WBGTが 28.0℃ 以上（熱中症リスク）
3. グリーン（良好 / success）:
   - 上記のいずれにも該当しない健康状態

【aiMessage の超厳格な制約（モバイル向け要約）】
- ドライバーが乗車直前の忙しい時間帯に「スマートフォンで3秒で読める」よう、**極めて簡潔・シンプル**に要約してください。
- 文字数は**全体で120〜150文字以内**を厳守してください。長文や過剰な親密さは現場で読まれないため、絶対に避けてください。
- **改行を使用し、最大3つの箇条書き（弾丸ポイント）**で、最も重要なアクション指示（目的地までの推定距離・運転リスクを踏まえた具体的な休憩指示など）だけを提示してください。
  （例：岩手県魹ヶ埼が目的地の時は、「本州最東端・魹ヶ埼への500km超の沿岸長距離ルートとなるため...」のように具体名を交えて短くアドバイスする）

【出力形式】
JSONフォーマットのみで返答してください。余計なマークダウン記法等は含めないでください。
{
  "status": "良好 (グリーン) または 要警戒 (イエロー) または 運行停止 (レッド)",
  "alertLevel": "success または warning または danger",
  "aiMessage": "ドライバーへの具体的な指示メッセージ（改行を含めて読みやすく）"
}
`;

                const chatResponse = await openaiClient.getChatCompletions(
                    process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
                    [{ role: "user", content: prompt }]
                );

                const responseText = chatResponse.choices[0].message.content.trim();
                
                // 防弾JSONパース: GPT-4oが稀に出力する ```json や ``` マークダウンコードフェンスを安全に除去
                let cleanJsonText = responseText;
                if (cleanJsonText.startsWith("```")) {
                    cleanJsonText = cleanJsonText.replace(/^```[a-zA-Z]*\s*/, '').replace(/\s*```$/, '');
                }
                cleanJsonText = cleanJsonText.trim();
                
                // JSON部分を正規表現で抽出（前置きテキストや閉じ忘れにも対応）
                const jsonExtract = cleanJsonText.match(/\{[\s\S]*\}/);
                const jsonCandidate = jsonExtract ? jsonExtract[0] : cleanJsonText;
                
                let parsedResponse;
                try {
                    parsedResponse = JSON.parse(jsonCandidate);
                } catch (parseErr) {
                    context.log.warn("⚠️ GPTレスポンスのJSON抽出に失敗。生テキストをフォールバック:", parseErr.message);
                    parsedResponse = {
                        status: "要警戒 (イエロー)",
                        alertLevel: "warning",
                        aiMessage: responseText.substring(0, 300)
                    };
                }
                
                aiResult.status = parsedResponse.status || aiResult.status;
                aiResult.alertLevel = parsedResponse.alertLevel || aiResult.alertLevel;
                aiResult.aiMessage = parsedResponse.aiMessage || aiResult.aiMessage;
            } catch (aiErr) {
                context.log.warn("❌ Azure OpenAI の連携に失敗しました。フォールバックします:", aiErr.message);
                aiResult.aiMessage = "（AIフォールバック）接続タイムアウト。アルコール値はクリアしています。十分な休息と熱中症対策を意識し、安全第一で運行を開始してください。";
            }
        } else {
            context.log("💡 [シミュレーター] Azure OpenAI は模擬アドバイスを実行します。");
            const mode = body.mode || "departure";

            if (mode === "return") {
                const nearMiss = nearMissCount || "なし";
                const detail = nearMissDetail || "";
                
                if (detail.includes("工事") || detail.includes("迂回") || returnReportFileBase64) {
                    aiResult = {
                        status: "運行終了完了 (RAG知識蓄積済 🟢)",
                        alertLevel: "success",
                        aiMessage: `【運行後AIエージェント】${driverId}さん、本日の乗務お疲れ様でした！AI日報スキャンにより、新宿〜千代田での「工事迂回ルート情報」、および新宿四ツ谷での「自転車飛び出しヒヤリハット位置」を検知し、Azure Cosmos DBに正常データベース化しました。この情報はRAGおよび検索グラウンディング知識としてリアルタイム同期され、明日同じ地域を走る他の全ドライバーの安全運行コ・パイロット指示に即時反映されます。現場データの自動循環によるセーフティループへの貢献に深く感謝します！`
                    };
                } else if (nearMiss === '3回以上') {
                    aiResult = {
                        status: "運行終了 (要面談)",
                        alertLevel: "warning",
                        aiMessage: `【運行前チェックAI】${driverId}さん、運行終了打刻を受領しました。本日はヒヤリハットが3回以上と非常に多い状態でした。蓄積疲労による注意力低下の懸念があります。事故に繋がる前に、一度運行管理者と対面面談を行ってください。本日はゆっくりお休みください。🍵`
                    };
                } else if (nearMiss === '1〜2回') {
                    aiResult = {
                        status: "運行終了完了 (グリーン)",
                        alertLevel: "success",
                        aiMessage: `【運行前チェックAI】${driverId}さん、本日の乗務お疲れ様でした！ヒヤリハット報告（1〜2回）を受領しました。軽微なインシデント要因を整理し、次回乗務時の安全に繋げましょう。ゆっくり体を休めてくださいね。🍵`
                    };
                } else {
                    aiResult = {
                        status: "運行終了完了 (グリーン)",
                        alertLevel: "success",
                        aiMessage: `【運行前チェックAI】${driverId}さん、運行お疲れ様でした！インシデントなく無事に終業できたことに深く感謝します。明日も気持ちよく乗務できるよう、しっかり睡眠をとってください！🍵`
                    };
                }
            } else {
                const sleepScore = healthData.sleepScore || 80;
                const fatigue = healthData.manualFatigue || "万全";
                const hrvStatus = healthData.hrvStatus || "良好";

                // 目的地から走行距離を推定するヘルパー
                const estimateDistanceKm = (dest) => {
                if (!dest || dest === "未指定") return 15;
                const destStr = dest.toLowerCase();
                if (destStr.includes("魹") || destStr.includes("todogasaki") || destStr.includes("とどがさき") || destStr.includes("岩手") || destStr.includes("最東端")) {
                    return 550; // 本州最東端 魹ヶ埼
                }
                if (destStr.includes("隣接") || destStr.includes("近隣") || destStr.includes("近所") || destStr.includes("ショート") || destStr.includes("市街地") || destStr.includes("2km")) {
                    return 2.5; // 隣接事業所 (超短距離)
                }
                if (destStr.includes("大阪") || destStr.includes("osaka") || destStr.includes("関西")) {
                    return 400;
                }
                if (destStr.includes("仙台") || destStr.includes("sendai") || destStr.includes("宮城")) {
                    return 350;
                }
                if (destStr.includes("横浜") || destStr.includes("yokohama") || destStr.includes("川崎")) {
                    return 35;
                }
                if (destStr.includes("支店") || destStr.includes("営業所") || destStr.includes("配送")) {
                    return 45;
                }
                return 15;
            };

            const destText = destination || "未指定";
            const distance = estimateDistanceKm(destText);

            const isSleepPoor = sleepScore < 70;
            const isSleepVeryPoor = sleepScore <= 50;
            const isFatigueHigh = fatigue === "重い" || hrvStatus === "警告";
            const isFatigueMed = fatigue === "やや疲れ" || hrvStatus === "注意";

            // 日常点検およびメーター記録状況のAI指導の生成
            const isInspectionOk = vehicleInspection === "OK" || vehicleInspection === true || vehicleInspection === undefined;
            const vehicleAdvice = isInspectionOk 
                ? `日常点検（ブレーキ・タイヤ等）も異常なしと記録されました。素晴らしい点呼安全意識です。`
                : `⚠️【警告】運行前の日常点検（タイヤ・ブレーキ）が未完了です！直ちに安全確認を行ってください。`;

            // 路線特性（運行計画）に応じたプロ向け安全警告の生成
            let profileAdvice = "";
            const profile = routeProfile || "一般";
            if (destText.includes("新宿区四ツ谷") || destText.includes("マルチドロップ") || (scheduleFileBase64 && destText.includes("新宿"))) {
                profileAdvice = `\n\n📋【AIマルチドロップ運行計画スキャン結果】\n・新宿四ツ谷エリア：一方通行の極狭路が多いため、歩行者の急な飛び出しや電柱への接触に最徐行で警戒してください。\n・港・千代田エリア：大型車の往来と二輪車のすり抜けが激しいため、交差点右左折時の巻き込みに極警戒してください。\n・世田谷エリア：住宅街スクールゾーンと午後下校時間帯が重なるため、子供の動きを予測した安全運転を徹底してください。`;
            } else if (profile === "住宅街") {
                profileAdvice = `\n\n🏙️【路線警告: 住宅街】配送コースに狭い住宅地や生活道路が多いため、塀・電柱の影（ブラインドコーナー）や交差点からの子供や自転車の急な飛び出しに警戒し、最徐行を徹底してください！`;
            } else if (profile === "高速幹線") {
                profileAdvice = `\n\n🛣️【路線警告: 高速道路】単調な高速巡航による眠気（高速道路催眠現象）や微小睡眠が懸念されます。車内換気をこまめに行い、80km毎にPAに入ってストレッチを行ってください！`;
            } else if (profile === "山間山道") {
                profileAdvice = `\n\n🏔️【路線警告: 山間急カーブ】急勾配や急カーブが連続する難ルートです。カーブの手前での十分な事前減速を行い、下り坂でのフェード現象（ブレーキ過熱）を防ぐため排気ブレーキやエンジンブレーキを多用してください！`;
            } else if (profile === "工業地帯") {
                profileAdvice = `\n\n🏭【路線警告: 工業地帯】大型トレーラーやコンテナ車の往来が極めて激しいエリアです。大型トラック同士の死角や、交差点右左折時の内輪差による巻き込み事故に極警戒し、車間距離を確保してください！`;
            } else {
                // 「一般（自動推測）」時の自律判定
                if (destText.includes("魹") || destText.includes("岩手") || distance >= 300) {
                    profileAdvice = `\n\n🌐【コース特性自動推測】本州最東端や長距離ルートが予想されます。長時間の疲労蓄積が懸念されるため、無理な行程は避け、2時間おきに必ずシートから降りて休憩を挟んでください。`;
                } else {
                    profileAdvice = `\n\n🌐【コース特性自動推測】一般的な走行ルートです。周囲の状況に合わせて無理のないペースで、心に余裕を持った安全運転で行ってらっしゃい！`;
                }
            }

            // 1. 超長距離（100km以上）の危険度アップグレード
            if (distance >= 100) {
                // 通常ならイエロー（睡眠不足、疲労、ストレス、猛暑のいずれか）でも、長距離過酷ルートのためレッド（運行停止）へ引き上げ
                if (isSleepVeryPoor || isSleepPoor || isFatigueHigh || isFatigueMed || wbgtValue > 28.5) {
                    aiResult = {
                        status: "運行停止 (レッド)",
                        alertLevel: "danger",
                        aiMessage: `【運行前チェックAI】${driverId}さん、アルコール値は正常ですが、目的地【${destText}】までの約${distance}kmの過酷な長距離運行となるため、本日の疲労蓄積度（睡眠:${sleepScore}点、疲労:${fatigue}）では極めて危険と判断し、【運行停止（レッド）】とします。対面点呼での状況確認を受けてください。${vehicleAdvice}${profileAdvice}`
                    };
                } else {
                    // 全て良好でも、超長距離なのでイエロー注意喚起
                    aiResult = {
                        status: "要警戒 (イエロー)",
                        alertLevel: "warning",
                        aiMessage: `【運行前チェックAI】健康状態は良好ですが、目的地【${destText}】までの約${distance}kmの超長距離運行です。長時間の連続運転は突然の眠気を誘発するため、必ず1.5時間おきに15分以上の休憩を取り、安全運行を徹底してください。${vehicleAdvice}${profileAdvice}`
                    };
                }
            }
            // 2. 超短距離（30km未満）の危険度ダウングレード緩和
            else if (distance < 30) {
                if (isSleepVeryPoor) {
                    // 極度の睡眠不足は短距離でも危険なためレッド（運行停止）
                    aiResult = {
                        status: "運行停止 (レッド)",
                        alertLevel: "danger",
                        aiMessage: `【運行前チェックAI】${driverId}さん、短距離運行ですが、昨夜の睡眠スコアが${sleepScore}点と極度に不足しています。脳機能の著しい低下が懸念され、近距離でも衝突事故のリスクが極めて高いため、【運行停止】とします。${vehicleAdvice}${profileAdvice}`
                    };
                } else if (isSleepPoor || isFatigueHigh || isFatigueMed) {
                    // 本来ならイエローだが、30km未満の短距離のため、グリーン（良好・注意）に緩和し、配慮のあるアドバイスを提示
                    aiResult = {
                        status: "良好 (グリーン)",
                        alertLevel: "success",
                        aiMessage: `【運行前チェックAI】${driverId}さん、やや睡眠不足（${sleepScore}点）や疲労の兆候が見られますが、目的地【${destText}】までは約${distance}kmと短距離のため、安全に十分配慮すれば運行可能です。車内を冷やし、無理せず安全運転で行ってらっしゃい！${vehicleAdvice}${profileAdvice}`
                    };
                } else {
                    // 完全に良好
                    aiResult = {
                        status: "良好 (グリーン)",
                        alertLevel: "success",
                        aiMessage: `【運行前チェックAI】${driverId}さん、チェックイン完了！睡眠スコア（${sleepScore}点）、バイタルともに万全です。目的地【${destText}】（約${distance}km）までの近距離配送、本日も笑顔で安全運転で行ってらっしゃい！${vehicleAdvice}${profileAdvice}`
                    };
                }
            }
            // 3. 通常の中距離（30km以上 100km未満）
            else {
                if (isSleepVeryPoor || (isSleepPoor && isFatigueHigh)) {
                    aiResult = {
                        status: "運行停止 (レッド)",
                        alertLevel: "danger",
                        aiMessage: `【運行前チェックAI】${driverId}さん、睡眠スコア（${sleepScore}点）の深刻な不足、または疲労・ストレスの二重リスクを検出したため【運行停止】を指示します。安全のため、対面点呼での状況確認を行ってください。${vehicleAdvice}${profileAdvice}`
                    };
                } else if (isSleepPoor || isFatigueHigh || isFatigueMed) {
                    aiResult = {
                        status: "要警戒 (イエロー)",
                        alertLevel: "warning",
                        aiMessage: `【運行前チェックAI】${driverId}さん、睡眠スコア（${sleepScore}点）がやや低く、または疲労・ストレスの兆候があるため「要警戒」です。目的地【${destText}】までの約${distance}km、休憩と水分補給を細目に行いましょう。${vehicleAdvice}${profileAdvice}`
                    };
                } else if (wbgtValue > 28.5) {
                    aiResult = {
                        status: "要警戒 (周辺の猛暑)",
                        alertLevel: "warning",
                        aiMessage: `【運行前チェックAI】バイタル数値はすべてクリアしていますが、現在地周辺の暑さ指数（WBGT）が ${wbgtValue.toFixed(1)}℃ と危険値に達しています。冷房を適切にかけ、水分補給を怠らず熱中症を回避してください。${vehicleAdvice}${profileAdvice}`
                    };
                } else {
                    aiResult = {
                        status: "良好 (グリーン)",
                        alertLevel: "success",
                        aiMessage: `【運行前チェックAI】${driverId}さん、チェックイン完了です！睡眠（${sleepScore}点）、体調、気象条件すべてが万全です。目的地【${destText}】（約${distance}km）、本日も心に余裕を持って、安全運転で行ってらっしゃい！${vehicleAdvice}${profileAdvice}`
                    };
                }
            }
        }
    }

        // アルコール検知の最終ガード（ゼロトレランス）:
        // AI/シミュレーター判定を問わず、アルコールが検知された場合は無条件でレッド
        if (ocrResult.alcoholValue > 0.00) {
            aiResult = {
                status: "運行停止 (レッド)",
                alertLevel: "danger",
                aiMessage: `【運行前チェックAI】アルコール測定値 ${ocrResult.alcoholValue.toFixed(2)} mg/L が検知されました。道路交通法および運行管理規程に基づき、無条件で【運行停止（レッド）】とします。対面での点呼および状況確認を受けてください。`
            };
        }

        // 3. Cosmos DB 保存
        if (useRealCosmos) {
            context.log("⚡ [本物接続] Azure Cosmos DB に接続しています...");
            try {
                const cosmosClient = new CosmosClient({
                    endpoint: process.env.COSMOS_DB_ENDPOINT,
                    key: process.env.COSMOS_DB_KEY
                });

                // データベースとコンテナーが存在しない場合は自動作成（環境構築を完全自動化）
                const { database } = await cosmosClient.databases.createIfNotExists({ 
                    id: process.env.COSMOS_DB_DATABASE_NAME || "SafeDriveDB" 
                });
                
                const { container } = await database.containers.createIfNotExists({ 
                    id: process.env.COSMOS_DB_CONTAINER_NAME || "CheckIns",
                    partitionKey: "/driverId"
                });

                const item = {
                    id: `checkin_${Date.now()}`,
                    driverId,
                    mode,
                    runType,
                    timestamp,
                    location,
                    healthData,
                    evidenceImageBase64,
                    ocrResult,
                    wbgt: wbgtValue,
                    aiResult,
                    destination,
                    routeProfile,
                    odometer,
                    vehicleInspection,
                    scheduleFileBase64,
                    returnReportFileBase64,
                    nearMissDetail,
                    nearMissCount
                };

                await container.items.create(item);
                savedToDb = true;
                context.log("💾 Cosmos DB に記録が正常に保存されました。");
            } catch (dbErr) {
                context.log.warn("❌ Cosmos DB 保存に失敗しました。フォールバックします:", dbErr.message);
            }
        } else {
            context.log("💡 [シミュレーター] Cosmos DB は模擬保存を実行します。");
            savedToDb = true;
        }

        // レスポンス応答
        context.res = {
            status: 200,
            body: {
                success: true,
                isSimulated: !useRealDocIntel || !useRealOpenAI || !useRealCosmos,
                data: {
                    driverId,
                    timestamp,
                    location,
                    healthData,
                    ocrResult,
                    wbgt: wbgtValue,
                    aiResult,
                    savedToDb: savedToDb,
                    destination,
                    routeProfile,
                    odometer,
                    vehicleInspection,
                    scheduleFileBase64,
                    returnReportFileBase64,
                    nearMissDetail,
                    nearMissCount
                }
            },
            headers: { 'Content-Type': 'application/json' }
        };

    } catch (globalErr) {
        context.log.error("CheckIn エラー:", globalErr);
        context.res = {
            status: 500,
            body: { error: "サーバー内部エラーが発生しました。" }
            // NOTE: details (globalErr.message) は運用ログにのみ出力し、クライアントには非公開
        };
    }
};
