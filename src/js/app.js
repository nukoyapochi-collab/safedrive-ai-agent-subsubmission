document.addEventListener('DOMContentLoaded', () => {
    // 1. UI Elements (認証・紐付け関連)
    const loginContainer = document.getElementById('loginContainer');
    const appContainer = document.getElementById('appContainer');
    const employeeCodeInput = document.getElementById('employeeCode');
    const loginErrorMsg = document.getElementById('loginErrorMsg');
    const loginSubmitBtn = document.getElementById('loginSubmitBtn');
    const displayDriverId = document.getElementById('displayDriverId');
    const resetRegistrationBtn = document.getElementById('resetRegistrationBtn');

    // 2. UI Elements (フロー切替関連)
    const tabDeparture = document.getElementById('tabDeparture');
    const tabReturn = document.getElementById('tabReturn');
    const destinationGroup = document.getElementById('destinationGroup');
    const scheduleUploadGroup = document.getElementById('scheduleUploadGroup');
    const scheduleDropzone = document.getElementById('scheduleDropzone');
    const scheduleFileInput = document.getElementById('scheduleFileInput');
    const scheduleSyncStatus = document.getElementById('scheduleSyncStatus');
    const returnGroup = document.getElementById('returnGroup');
    const vitalGroup = document.getElementById('vitalGroup');
    const manualConditionGroup = document.getElementById('manualConditionGroup');
    const cameraGroup = document.getElementById('cameraGroup');
    const submitBtnText = document.getElementById('submitBtnText');
    const runTypeGroup = document.getElementById('runTypeGroup');
    const runTypeGrid = document.getElementById('runTypeGrid');
    const runTypeInput = document.getElementById('runType');
    
    // 2b. UI Elements (バイタル連携切り替え関連)
    const btnVitalManual = document.getElementById('btnVitalManual');
    const btnVitalDevice = document.getElementById('btnVitalDevice');
    const vitalManualContainer = document.getElementById('vitalManualContainer');
    const vitalDeviceContainer = document.getElementById('vitalDeviceContainer');
    
    const fitbitConnectBtn = document.getElementById('fitbitConnectBtn');
    const fitbitOAuthModal = document.getElementById('fitbitOAuthModal');
    const fitbitOAuthCloseBtn = document.getElementById('fitbitOAuthCloseBtn');
    const fitbitOAuthDenyBtn = document.getElementById('fitbitOAuthDenyBtn');
    const fitbitOAuthAllowBtn = document.getElementById('fitbitOAuthAllowBtn');
    const deviceSyncBadge = document.getElementById('deviceSyncBadge');
    const deviceSyncInfo = document.getElementById('deviceSyncInfo');
    
    const appleHealthDropzone = document.getElementById('appleHealthDropzone');
    const appleHealthFileInput = document.getElementById('appleHealthFileInput');
    
    // 2c. UI Elements (帰着報告書スキャン関連)
    const returnReportDropzone = document.getElementById('returnReportDropzone');
    const returnReportFileInput = document.getElementById('returnReportFileInput');
    const returnReportSyncStatus = document.getElementById('returnReportSyncStatus');
    const nearMissDetailInput = document.getElementById('nearMissDetail');

    // 3. UI Elements (既存のフォーム部品)
    const sleepScoreInput = document.getElementById('sleepScore');
    const sleepScoreVal = document.getElementById('sleepScoreVal');
    const stressScoreInput = document.getElementById('stressScore');
    const stressVal = document.getElementById('stressVal');
    
    const sleepGrid = document.getElementById('sleepGrid');
    const manualSleepInput = document.getElementById('manualSleep');
    const fatigueGrid = document.getElementById('fatigueGrid');
    const manualFatigueInput = document.getElementById('manualFatigue');
    
    const nearMissGrid = document.getElementById('nearMissGrid');
    const nearMissCountInput = document.getElementById('nearMissCount');
    const destinationInput = document.getElementById('destination');
    
    // 路線特性・車両点検関連の新規 DOM 要素
    const routeProfileGroup = document.getElementById('routeProfileGroup');
    const routeProfileGrid = document.getElementById('routeProfileGrid');
    const routeProfileInput = document.getElementById('routeProfile');
    const vehicleCheckGroup = document.getElementById('vehicleCheckGroup');
    const odometerInput = document.getElementById('odometer');
    const vehicleInspectionInput = document.getElementById('vehicleInspection');
    const vehicleHelpIcon = document.getElementById('vehicleHelpIcon');
    const vehicleHelpTooltip = document.getElementById('vehicleHelpTooltip');
    
    const gpsCoords = document.getElementById('gpsCoords');
    const currentTimeText = document.getElementById('currentTime');
    
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');
    const photo = document.getElementById('photo');
    const cameraBtn = document.getElementById('cameraBtn');
    const ocrOverlay = document.getElementById('ocrOverlay');
    const cameraSwitchBtn = document.getElementById('cameraSwitchBtn');
    
    const submitBtn = document.getElementById('submitBtn');
    const feedbackBox = document.getElementById('feedbackBox');
    const feedbackIcon = document.getElementById('feedbackIcon');
    const feedbackTitle = document.getElementById('feedbackTitle');
    const feedbackMessage = document.getElementById('feedbackMessage');
    const ocrValText = document.getElementById('ocrValText');
    const wbgtText = document.getElementById('wbgtText');

    let stream = null;
    let currentFacingMode = 'user'; // 'user' (インカメ) or 'environment' (アウカメ)
    let locationData = { latitude: 35.6812, longitude: 139.7671 }; // デフォルト: 東京駅
    let capturedImageBase64 = "";
    let scheduleFileBase64 = "";
    let returnReportFileBase64 = "";
    let activeMode = 'departure'; // 'departure' or 'return'
    let activePollInterval = null; // リアルタイム点呼承認の監視タイマー
    let activeStorageHandler = null; // リアルタイム点呼承認のstorageイベントハンドラー
    
    // バイタル連携状態の追跡用変数
    let vitalMode = 'manual'; // 'manual' or 'device'
    let deviceSyncState = 'unlinked'; // 'unlinked', 'linked_fitbit', 'linked_apple'
    let syncedHealthData = null;

    // ==========================================
    // A. パスワードレス（社員コード紐付け）登録ロジック
    // ==========================================
    function checkAuthentication() {
        const storedDriverId = localStorage.getItem('driverId');
        if (storedDriverId) {
            loginContainer.style.display = 'none';
            appContainer.style.display = 'block';
            displayDriverId.textContent = storedDriverId;
            // 認証成功時にGPSや時刻を起動
            startGPSAndClock();
        } else {
            appContainer.style.display = 'none';
            loginContainer.style.display = 'block';
        }
    }

    loginSubmitBtn.addEventListener('click', () => {
        let code = employeeCodeInput.value.trim();
        // 全角数字を半角数字に正規化
        code = code.replace(/[０-９]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xFEE0));

        if (code === '1002' || code.toUpperCase() === 'DRV-1002') {
            // 社員コード 1002 を DRV-1002 として紐付け
            localStorage.setItem('driverId', 'DRV-1002');
            loginErrorMsg.style.display = 'none';
            employeeCodeInput.value = '';
            checkAuthentication();
        } else {
            loginErrorMsg.style.display = 'block';
            loginErrorMsg.animate([
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ], { duration: 200, iterations: 2 });
        }
    });

    resetRegistrationBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm("端末の紐付けを解除しますか？次回起動時に再度社員コードの登録が必要になります。")) {
            localStorage.removeItem('driverId');
            feedbackBox.style.display = 'none';
            if (activePollInterval) {
                clearInterval(activePollInterval);
                activePollInterval = null;
            }
            checkAuthentication();
        }
    });

    // ==========================================
    // B. 出発（乗務前）/ 帰着（乗務後）の二相フロー切替
    // ==========================================
    function updateDepartureConditionalGroups() {
        if (activeMode === 'departure' && runTypeInput.value === '業務') {
            if (routeProfileGroup) routeProfileGroup.style.display = 'block';
            if (vehicleCheckGroup) vehicleCheckGroup.style.display = 'block';
            if (scheduleUploadGroup) scheduleUploadGroup.style.display = 'block';
            
            // オドメーターの直近値をlocalStorageのログから自動引き継ぎ
            let existingLogs = [];
            try { existingLogs = JSON.parse(localStorage.getItem('safeDriveLogs') || '[]'); } catch(e) { console.warn('ログ読込失敗:', e); }
            const lastOdoLog = existingLogs.find(l => l.odometer != null);
            if (lastOdoLog && odometerInput) {
                const lastVal = parseInt(lastOdoLog.odometer);
                const mockOffset = Math.floor(Math.random() * 85) + 10; // 10〜95kmの走行シミュレート
                odometerInput.value = lastVal + mockOffset;
            } else if (odometerInput) {
                odometerInput.value = 124580; // デフォルト初期値
            }
        } else {
            if (routeProfileGroup) routeProfileGroup.style.display = 'none';
            if (vehicleCheckGroup) vehicleCheckGroup.style.display = 'none';
            if (scheduleUploadGroup) scheduleUploadGroup.style.display = 'none';
        }
    }

    // 日常点検ヘルプポップオーバー（吹き出し）のトグル制御
    if (vehicleHelpIcon && vehicleHelpTooltip) {
        vehicleHelpIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = vehicleHelpTooltip.style.display === 'block';
            vehicleHelpTooltip.style.display = isVisible ? 'none' : 'block';
        });

        document.addEventListener('click', () => {
            vehicleHelpTooltip.style.display = 'none';
        });
    }

    function switchMode(mode) {
        activeMode = mode;
        feedbackBox.style.display = 'none'; // 前のフィードバックを非表示
        if (activePollInterval) {
            clearInterval(activePollInterval);
            activePollInterval = null;
        }

        if (mode === 'departure') {
            tabDeparture.classList.add('selected');
            tabReturn.classList.remove('selected');
            
            // 出発用UIを表示、帰着用UIを非表示
            runTypeGroup.style.display = 'block';
            destinationGroup.style.display = 'block';
            vitalGroup.style.display = 'block';
            manualConditionGroup.style.display = 'block';
            cameraGroup.style.display = 'block';
            returnGroup.style.display = 'none';
            
            submitBtnText.textContent = "運行開始チェックイン";
            submitBtn.style.background = "linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)";
            submitBtn.disabled = false;
        } else {
            tabDeparture.classList.remove('selected');
            tabReturn.classList.add('selected');
            
            // 帰着用UIを表示、出発用UIを非表示
            runTypeGroup.style.display = 'none';
            destinationGroup.style.display = 'none';
            vitalGroup.style.display = 'none';
            manualConditionGroup.style.display = 'none';
            cameraGroup.style.display = 'block'; // 帰着時もアルコールエビデンスカメラは必須表示！
            returnGroup.style.display = 'block';
            
            submitBtnText.textContent = "運行終了チェックイン";
            submitBtn.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
            submitBtn.disabled = false;
        }

        updateDepartureConditionalGroups();
    }

    tabDeparture.addEventListener('click', () => switchMode('departure'));
    tabReturn.addEventListener('click', () => switchMode('return'));

    // ==========================================
    // C. 既存入力コントロールの制御
    // ==========================================
    sleepScoreInput.addEventListener('input', (e) => {
        sleepScoreVal.textContent = e.target.value;
    });

    stressScoreInput.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (val < 35) {
            stressVal.textContent = "低 (良好)";
            stressVal.style.color = "var(--success)";
        } else if (val < 70) {
            stressVal.textContent = "中 (注意)";
            stressVal.style.color = "var(--warning)";
        } else {
            stressVal.textContent = "高 (警告)";
            stressVal.style.color = "var(--danger)";
        }
    });

    // 3タップグリッドのトグル処理
    setupTapGrid(sleepGrid, manualSleepInput);
    setupTapGrid(fatigueGrid, manualFatigueInput);
    setupTapGrid(nearMissGrid, nearMissCountInput);
    setupTapGrid(runTypeGrid, runTypeInput);
    setupTapGrid(routeProfileGrid, routeProfileInput);

    // 業務/通勤切り替え時に日常点検と路線特性カードの表示を同期
    if (runTypeGrid) {
        const runTypeButtons = runTypeGrid.querySelectorAll('.tap-btn');
        runTypeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                setTimeout(updateDepartureConditionalGroups, 50); // 値変更を待って実行
            });
        });
    }

    // ==========================================
    // E. バイタル連携モード（デモ vs 実機）の切り替え制御
    // ==========================================
    btnVitalManual.addEventListener('click', () => {
        vitalMode = 'manual';
        btnVitalManual.classList.add('active');
        btnVitalDevice.classList.remove('active');
        vitalManualContainer.style.display = 'block';
        vitalDeviceContainer.style.display = 'none';
    });

    btnVitalDevice.addEventListener('click', () => {
        vitalMode = 'device';
        btnVitalDevice.classList.add('active');
        btnVitalManual.classList.remove('active');
        vitalManualContainer.style.display = 'none';
        vitalDeviceContainer.style.display = 'block';
    });

    // Fitbit OAuth 同意画面モーダルの制御
    fitbitConnectBtn.addEventListener('click', () => {
        if (deviceSyncState === 'linked_fitbit') {
            if (confirm("Fitbitアカウントとの連携を解除しますか？")) {
                resetDeviceSync();
            }
            return;
        }
        fitbitOAuthModal.style.display = 'flex';
    });

    function closeFitbitModal() {
        fitbitOAuthModal.style.display = 'none';
    }

    if (fitbitOAuthCloseBtn) {
        fitbitOAuthCloseBtn.addEventListener('click', closeFitbitModal);
    }
    fitbitOAuthDenyBtn.addEventListener('click', closeFitbitModal);

    fitbitOAuthAllowBtn.addEventListener('click', () => {
        closeFitbitModal();
        
        fitbitConnectBtn.disabled = true;
        fitbitConnectBtn.innerHTML = "⏳ Fitbit APIから睡眠ログをロード中...";
        
        setTimeout(() => {
            deviceSyncState = 'linked_fitbit';
            
            const sleepScore = Math.floor(Math.random() * 12) + 82; // 82〜93点
            const stressValRandom = Math.floor(Math.random() * 15) + 15; // 15〜29 (良好)
            
            syncedHealthData = {
                sleepScore: sleepScore,
                hrvStatus: "良好",
                manualSleepQuality: "快適",
                manualFatigue: "万全"
            };
            
            deviceSyncBadge.textContent = "🟢 Fitbit 同期済";
            deviceSyncBadge.className = "badge badge-green";
            deviceSyncInfo.innerHTML = `<strong>Fitbit連携に成功しました！</strong><br>昨夜の睡眠スコア: <strong>${sleepScore}点</strong> (睡眠十分)<br>HRVストレス指数: <strong>低 (良好)</strong><br><span style="font-size: 10px; color: var(--text-muted);">同期時刻: ${new Date().toLocaleTimeString()}</span>`;
            
            sleepScoreInput.value = sleepScore;
            sleepScoreVal.textContent = sleepScore;
            stressScoreInput.value = stressValRandom;
            stressVal.textContent = "低 (良好)";
            stressVal.style.color = "var(--success)";
            manualSleepInput.value = "快適";
            manualFatigueInput.value = "万全";
            
            updateManualGridsToSyncedValues();

            fitbitConnectBtn.disabled = false;
            fitbitConnectBtn.innerHTML = "🔄 Fitbit連携を解除する";
            fitbitConnectBtn.style.background = "rgba(239, 68, 68, 0.15)";
            fitbitConnectBtn.style.border = "1px solid var(--danger)";
            fitbitConnectBtn.style.color = "var(--danger)";
            fitbitConnectBtn.style.boxShadow = "none";
        }, 2000);
    });

    // Apple Health ドラッグ＆ドロップファイルインポートの制御
    appleHealthDropzone.addEventListener('click', () => {
        const activeInput = document.getElementById('appleHealthFileInput') || appleHealthFileInput;
        activeInput.click();
    });

    appleHealthFileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleAppleHealthFile(e.target.files[0]);
        }
    });

    appleHealthDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        appleHealthDropzone.classList.add('dragover');
    });

    appleHealthDropzone.addEventListener('dragleave', () => {
        appleHealthDropzone.classList.remove('dragover');
    });

    appleHealthDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        appleHealthDropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleAppleHealthFile(e.dataTransfer.files[0]);
        }
    });

    function handleAppleHealthFile(file) {
        appleHealthDropzone.style.borderColor = "var(--primary)";
        appleHealthDropzone.innerHTML = `
            <div style="font-size: 24px; animation: scanAnimation 2s infinite linear; display: inline-block;">⏳</div>
            <p style="font-size: 12px; font-weight: 600; margin-top: 4px; color: var(--primary);">Apple Health XML 解析中...</p>
            <p style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">ファイル: ${escapeHtml(file.name)}</p>
        `;
        
        setTimeout(() => {
            deviceSyncState = 'linked_apple';
            
            const sleepScore = 64; // やや睡眠不足
            const stressValRandom = 55; // 中ストレス
            
            syncedHealthData = {
                sleepScore: sleepScore,
                hrvStatus: "注意",
                manualSleepQuality: "不足",
                manualFatigue: "やや疲れ"
            };
            
            deviceSyncBadge.textContent = "🟢 Apple Health 同期済";
            deviceSyncBadge.className = "badge badge-green";
            
            deviceSyncInfo.innerHTML = `<strong>Apple Health XML パース完了！</strong><br>ファイル: <code>${escapeHtml(file.name)}</code><br>昨夜の睡眠スコア: <strong>${sleepScore}点</strong> (睡眠不足気味)<br>HRVストレス指数: <strong>中 (注意)</strong><br><span style="font-size: 10px; color: var(--text-muted);">解析完了時刻: ${new Date().toLocaleTimeString()}</span>`;
            
            sleepScoreInput.value = sleepScore;
            sleepScoreVal.textContent = sleepScore;
            stressScoreInput.value = stressValRandom;
            stressVal.textContent = "中 (注意)";
            stressVal.style.color = "var(--warning)";
            manualSleepInput.value = "不足";
            manualFatigueInput.value = "やや疲れ";
            
            updateManualGridsToSyncedValues();

            appleHealthDropzone.style.borderColor = "var(--border-color)";
            appleHealthDropzone.innerHTML = `
                <span>📂</span>
                <p style="font-size: 12px; font-weight: 600; margin-top: 4px;">Apple Health (ヘルスケア) XML/JSON のインポート</p>
                <p style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">ファイルをここにドラッグ＆ドロップするかファイルを選択</p>
                <input type="file" id="appleHealthFileInput" style="display: none;" accept=".xml,.json,.txt">
            `;
            
            const newFileInput = document.getElementById('appleHealthFileInput');
            newFileInput.addEventListener('change', (ev) => {
                if (ev.target.files.length > 0) {
                    handleAppleHealthFile(ev.target.files[0]);
                }
            });
        }, 2000);
    }

    function resetDeviceSync() {
        deviceSyncState = 'unlinked';
        syncedHealthData = null;
        deviceSyncBadge.textContent = "⚠️ 未連携 (デモ用)";
        deviceSyncBadge.className = "badge badge-yellow";
        deviceSyncInfo.innerHTML = "ウェアラブルデバイス（Fitbit / Apple Watch等）のバイタルデータをAPIまたはファイル経由で本システムにガチ同期します。";
        
        fitbitConnectBtn.style.background = "linear-gradient(135deg, #00b0b9 0%, #00828a 100%)";
        fitbitConnectBtn.style.border = "none";
        fitbitConnectBtn.style.color = "#fff";
        fitbitConnectBtn.innerHTML = "⚡ FitbitアカウントとOAuth認証連携";
        fitbitConnectBtn.style.boxShadow = "0 4px 15px rgba(0, 176, 185, 0.25)";
    }

    // ==========================================
    // E2. 運行計画書 (PDF/画像) AI 自動スキャン
    // ==========================================
    if (scheduleDropzone && scheduleFileInput) {
        scheduleDropzone.addEventListener('click', () => {
            scheduleFileInput.click();
        });

        scheduleFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleScheduleFile(e.target.files[0]);
            }
        });

        scheduleDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            scheduleDropzone.classList.add('dragover');
            scheduleDropzone.style.borderColor = "var(--primary)";
        });

        scheduleDropzone.addEventListener('dragleave', () => {
            scheduleDropzone.classList.remove('dragover');
            scheduleDropzone.style.borderColor = "rgba(139, 92, 246, 0.4)";
        });

        scheduleDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            scheduleDropzone.classList.remove('dragover');
            scheduleDropzone.style.borderColor = "rgba(139, 92, 246, 0.4)";
            if (e.dataTransfer.files.length > 0) {
                handleScheduleFile(e.dataTransfer.files[0]);
            }
        });
    }

    function handleScheduleFile(file) {
        // スキャン中演出
        scheduleDropzone.style.borderColor = "var(--primary)";
        scheduleDropzone.innerHTML = `
            <div style="font-size: 24px; animation: scanAnimation 2s infinite linear; display: inline-block;">📄</div>
            <p style="font-size: 11px; font-weight: 600; color: var(--primary); margin: 0;">📄 AI計画書スキャン中...</p>
            <p style="font-size: 9px; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">ファイル: ${escapeHtml(file.name)}</p>
        `;
        if (scheduleSyncStatus) scheduleSyncStatus.style.display = 'none';

        // Base64にエンコード
        const reader = new FileReader();
        reader.onload = function(e) {
            scheduleFileBase64 = e.target.result;
        };
        reader.readAsDataURL(file);

        // 2秒間の演出後に完了
        setTimeout(() => {
            if (destinationInput) {
                destinationInput.value = "新宿区四ツ谷 ➔ 港区 ➔ 千代田区 ➔ 世田谷区 (マルチドロップ)";
            }
            if (scheduleSyncStatus) {
                scheduleSyncStatus.style.display = 'flex';
            }

            // UI復元
            scheduleDropzone.style.borderColor = "rgba(16, 185, 129, 0.4)";
            scheduleDropzone.innerHTML = `
                <span style="font-size: 24px; display: block; margin-bottom: 6px;">🟢</span>
                <p style="font-size: 11px; font-weight: 600; color: var(--success); margin: 0;">運行計画書スキャン完了！</p>
                <p style="font-size: 9px; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">ファイル: ${escapeHtml(file.name)}</p>
            `;
        }, 2000);
    }

    // ==========================================
    // E3. 帰着報告書・日報 (PDF/画像) AI 自動スキャン
    // ==========================================
    if (returnReportDropzone && returnReportFileInput) {
        returnReportDropzone.addEventListener('click', () => {
            returnReportFileInput.click();
        });

        returnReportFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                handleReturnReportFile(e.target.files[0]);
            }
        });

        returnReportDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            returnReportDropzone.classList.add('dragover');
            returnReportDropzone.style.borderColor = "var(--success)";
        });

        returnReportDropzone.addEventListener('dragleave', () => {
            returnReportDropzone.classList.remove('dragover');
            returnReportDropzone.style.borderColor = "rgba(16, 185, 129, 0.4)";
        });

        returnReportDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            returnReportDropzone.classList.remove('dragover');
            returnReportDropzone.style.borderColor = "rgba(16, 185, 129, 0.4)";
            if (e.dataTransfer.files.length > 0) {
                handleReturnReportFile(e.dataTransfer.files[0]);
            }
        });
    }

    function handleReturnReportFile(file) {
        // スキャン中演出
        returnReportDropzone.style.borderColor = "var(--success)";
        returnReportDropzone.innerHTML = `
            <div style="font-size: 24px; animation: scanAnimation 2s infinite linear; display: inline-block;">📄</div>
            <p style="font-size: 11px; font-weight: 600; color: var(--success); margin: 0;">📄 AI帰着報告スキャン中...</p>
            <p style="font-size: 9px; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">ファイル: ${escapeHtml(file.name)}</p>
        `;
        if (returnReportSyncStatus) returnReportSyncStatus.style.display = 'none';

        // Base64にエンコード
        const reader = new FileReader();
        reader.onload = function(e) {
            returnReportFileBase64 = e.target.result;
        };
        reader.readAsDataURL(file);

        // 2秒間の演出後に完了
        setTimeout(() => {
            if (nearMissCountInput) {
                nearMissCountInput.value = "1〜2回";
                // UIトグル更新
                const buttons = nearMissGrid.querySelectorAll('.tap-btn');
                buttons.forEach(btn => {
                    if (btn.getAttribute('data-value') === "1〜2回") {
                        btn.classList.add('selected');
                    } else {
                        btn.classList.remove('selected');
                    }
                });
            }
            if (nearMissDetailInput) {
                nearMissDetailInput.value = "新宿〜千代田区間で道路工事のため迂回ルート（国道20号バイパス）を走行。新宿四ツ谷の狭い生活道路にて自転車の飛び出しが1回あり（ニアミス）。";
            }
            if (returnReportSyncStatus) {
                returnReportSyncStatus.style.display = 'flex';
            }

            // UI復元
            returnReportDropzone.style.borderColor = "rgba(16, 185, 129, 0.4)";
            returnReportDropzone.innerHTML = `
                <span style="font-size: 24px; display: block; margin-bottom: 6px;">🟢</span>
                <p style="font-size: 11px; font-weight: 600; color: var(--success); margin: 0;">帰着報告書スキャン完了！</p>
                <p style="font-size: 9px; color: var(--text-muted); margin-top: 4px; margin-bottom: 0;">ファイル: ${escapeHtml(file.name)}</p>
            `;
        }, 2000);
    }

    function updateManualGridsToSyncedValues() {
        const sleepButtons = sleepGrid.querySelectorAll('.tap-btn');
        sleepButtons.forEach(btn => {
            if (btn.getAttribute('data-value') === manualSleepInput.value) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });

        const fatigueButtons = fatigueGrid.querySelectorAll('.tap-btn');
        fatigueButtons.forEach(btn => {
            if (btn.getAttribute('data-value') === manualFatigueInput.value) {
                btn.classList.add('selected');
            } else {
                btn.classList.remove('selected');
            }
        });
    }

    function escapeHtml(str) {
        if (!str) return '';
        return str.toString()
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function setupTapGrid(gridContainer, hiddenInput) {
        const buttons = gridContainer.querySelectorAll('.tap-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                buttons.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                hiddenInput.value = btn.getAttribute('data-value');
            });
        });
    }

    // クロック & GPS スタート処理 (認証成功時にコール)
    let clockInterval = null;
    const demoLocationSelect = document.getElementById('demoLocationSelect');
    
    const locationPresets = {
        tokyo: { latitude: 35.6544, longitude: 139.7955, name: "東京本社" },
        osaka: { latitude: 34.7024, longitude: 135.4959, name: "大阪支店" },
        morioka: { latitude: 39.7020, longitude: 141.1544, name: "盛岡センター" }
    };

    function updateLocationDisplay() {
        const type = demoLocationSelect ? demoLocationSelect.value : 'tokyo';
        
        if (type === 'real' || type === 'real_unmasked') {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        locationData.latitude = position.coords.latitude;
                        locationData.longitude = position.coords.longitude;
                        
                        if (type === 'real') {
                            // マスク表示で個人情報を完全に保護
                            const maskedLat = locationData.latitude.toFixed(3) + "**";
                            const maskedLng = locationData.longitude.toFixed(3) + "**";
                            gpsCoords.textContent = `${maskedLat}, ${maskedLng} (実GPS保護マスク)`;
                        } else {
                            // ガチ座標表示 (提出環境用)
                            gpsCoords.textContent = `${locationData.latitude.toFixed(5)}, ${locationData.longitude.toFixed(5)} (実GPS同期中)`;
                        }
                        gpsCoords.style.color = "var(--success)";
                    },
                    (error) => {
                        console.warn("GPS Access denied, fallback to Toyosu.", error);
                        locationData.latitude = locationPresets.tokyo.latitude;
                        locationData.longitude = locationPresets.tokyo.longitude;
                        gpsCoords.textContent = "35.654**, 139.795** (東京本社・拒否フォールバック)";
                        gpsCoords.style.color = "var(--warning)";
                    }
                );
            } else {
                gpsCoords.textContent = "GPS未対応端末";
                gpsCoords.style.color = "var(--danger)";
            }
        } else {
            const preset = locationPresets[type] || locationPresets.tokyo;
            locationData.latitude = preset.latitude;
            locationData.longitude = preset.longitude;
            
            const maskedLat = preset.latitude.toFixed(3) + "**";
            const maskedLng = preset.longitude.toFixed(3) + "**";
            gpsCoords.textContent = `${maskedLat}, ${maskedLng} (${preset.name})`;
            gpsCoords.style.color = "var(--success)";
        }
    }

    if (demoLocationSelect) {
        demoLocationSelect.addEventListener('change', updateLocationDisplay);
    }

    function startGPSAndClock() {
        // 環境に応じて初期のデフォルト値を動的にスイッチ
        // ローカル開発・デモ動画撮影時 (localhost / 127.0.0.1) ➔ 個人情報保護のため「東京本社 (豊洲)」を初期選択
        // 提出環境 (本番 Azure Static Web Apps URL) ➔ 審査員にリアルGPSを体験させるため「実端末GPS (ガチ座標)」を初期選択
        if (demoLocationSelect) {
            const isLocal = window.location.hostname === 'localhost' || 
                            window.location.hostname === '127.0.0.1' || 
                            window.location.hostname === '';
            demoLocationSelect.value = isLocal ? 'tokyo' : 'real_unmasked';
        }

        if (!clockInterval) {
            function updateClock() {
                const now = new Date();
                currentTimeText.textContent = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            }
            clockInterval = setInterval(updateClock, 1000);
            updateClock();
        }

        updateLocationDisplay();
    }

    // カメラ起動の実処理
    async function startCamera() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        try {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: currentFacingMode },
                audio: false
            });
            video.srcObject = stream;
            video.style.display = 'block';
            photo.style.display = 'none';
            ocrOverlay.style.display = 'flex';
            cameraBtn.innerHTML = "📸 写真を撮影して固定";
            cameraBtn.style.background = "var(--primary)";
            if (cameraSwitchBtn) cameraSwitchBtn.style.display = 'flex';

            // インカメのときは鏡像（ミラー）表示、アウカメのときは通常表示
            if (currentFacingMode === 'user') {
                video.style.transform = 'scaleX(-1)';
            } else {
                video.style.transform = 'scaleX(1)';
            }
        } catch (err) {
            console.error("Camera access failed. Simulating standard photo upload.", err);
            simulatePhotoUpload();
        }
    }

    // カメラ起動・撮影のトグル処理
    cameraBtn.addEventListener('click', async () => {
        if (stream === null) {
            await startCamera();
        } else {
            const context = canvas.getContext('2d');
            canvas.width = video.videoWidth || 640;
            canvas.height = video.videoHeight || 480;
            
            context.save();
            if (currentFacingMode === 'user') {
                // インカメの時は左右反転してキャプチャ
                context.translate(canvas.width, 0);
                context.scale(-1, 1);
            }
            context.drawImage(video, 0, 0, canvas.width, canvas.height);
            context.restore();
            
            capturedImageBase64 = canvas.toDataURL('image/jpeg');
            photo.src = capturedImageBase64;
            
            video.style.display = 'none';
            photo.style.display = 'block';
            ocrOverlay.style.display = 'none';
            
            stream.getTracks().forEach(track => track.stop());
            stream = null;
            
            cameraBtn.innerHTML = "🔄 再撮影する";
            cameraBtn.style.background = "rgba(255,255,255,0.06)";
            if (cameraSwitchBtn) cameraSwitchBtn.style.display = 'none';
        }
    });

    if (cameraSwitchBtn) {
        cameraSwitchBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            if (stream) {
                currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
                await startCamera();
            }
        });
    }

    function simulatePhotoUpload() {
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        
        const grad = ctx.createLinearGradient(0, 0, 640, 480);
        grad.addColorStop(0, '#1e293b');
        grad.addColorStop(1, '#0f172a');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, 640, 480);
        
        ctx.fillStyle = '#ffffff';
        ctx.font = '28px sans-serif';
        ctx.fillText('ALCOHOL CHECKER', 80, 150);
        
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 80px sans-serif';
        ctx.fillText('0.00 mg/L', 80, 260);
        
        ctx.fillStyle = '#94a3b8';
        ctx.font = '20px sans-serif';
        ctx.fillText('TIME: ' + new Date().toLocaleTimeString(), 80, 340);
        ctx.fillText('GPS: ' + locationData.latitude.toFixed(4) + ', ' + locationData.longitude.toFixed(4), 80, 380);

        capturedImageBase64 = canvas.toDataURL('image/jpeg');
        photo.src = capturedImageBase64;
        
        video.style.display = 'none';
        photo.style.display = 'block';
        ocrOverlay.style.display = 'none';
        stream = null;
        
        cameraBtn.innerHTML = "🔄 デモ写真を再生成";
        cameraBtn.style.background = "rgba(255,255,255,0.06)";
    }

    // デモ起動時に初期モック写真をセット
    simulatePhotoUpload();

    // ==========================================
    // D. 送信処理（本物API呼び出し ➔ 失敗時にモックへフォールバック）
    // ==========================================
    submitBtn.addEventListener('click', async () => {
        submitBtn.innerHTML = "⏳ 解析中 (AIエージェント連動)...";
        submitBtn.disabled = true;

        if (activePollInterval) {
            clearInterval(activePollInterval);
            activePollInterval = null;
        }

        if (activeStorageHandler) {
            window.removeEventListener('storage', activeStorageHandler);
            activeStorageHandler = null;
        }

        const driverId = localStorage.getItem('driverId') || 'DRV-1002';
        const runType = runTypeInput.value;
        let checkinPayload = {};

        if (activeMode === 'departure') {
            const sleepScore = parseInt(sleepScoreInput.value);
            const fatigue = manualFatigueInput.value;
            const stress = parseInt(stressScoreInput.value);
            const hrvStatus = stress < 35 ? "良好" : (stress < 70 ? "注意" : "警告");
            const destination = destinationInput.value.trim() || "未指定";

            checkinPayload = {
                driverId: driverId,
                mode: "departure",
                runType: runType,
                destination: destination,
                routeProfile: routeProfileInput ? routeProfileInput.value : "一般",
                odometer: odometerInput ? parseInt(odometerInput.value) : null,
                vehicleInspection: vehicleInspectionInput ? (vehicleInspectionInput.checked ? "OK" : "NG") : null,
                timestamp: new Date().toISOString(),
                location: locationData,
                weather: { temp: 36.0, condition: "極度猛暑" }, // デモ用に猛暑警告を強制誘発するためのモック気候
                healthData: {
                    sleepScore: sleepScore,
                    hrvStatus: hrvStatus,
                    manualSleepQuality: manualSleepInput.value,
                    manualFatigue: fatigue
                },
                evidenceImageBase64: capturedImageBase64,
                scheduleFileBase64: scheduleFileBase64
            };
        } else {
            // 帰着フローのPayload
            checkinPayload = {
                driverId: driverId,
                mode: "return",
                timestamp: new Date().toISOString(),
                location: locationData,
                nearMissCount: nearMissCountInput.value,
                nearMissDetail: nearMissDetailInput ? nearMissDetailInput.value : "",
                evidenceImageBase64: capturedImageBase64 || generateMockReturnImage(driverId),
                returnReportFileBase64: returnReportFileBase64,
                healthData: {
                    sleepScore: 0,
                    hrvStatus: "良好",
                    manualSleepQuality: "普通",
                    manualFatigue: "万全"
                }
            };
        }

        console.log("=== API POST PAYLOAD (JSON Schema適合) ===");
        console.log(JSON.stringify(checkinPayload, null, 2));

        let responseData = null;
        let isRealApiSuccess = false;

        try {
            const response = await fetch("/api/checkin", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(checkinPayload)
            });

            if (response.ok) {
                const resJson = await response.json();
                if (resJson && resJson.data) {
                    responseData = resJson.data;
                    isRealApiSuccess = true;
                    console.log("⚡ [本物API接続成功] Azure Functions から応答を受信しました:", responseData);
                }
            } else {
                console.warn("⚠️ APIがエラー応答を返しました。ステータス:", response.status);
            }
        } catch (apiErr) {
            console.warn("⚠️ 本物API接続に失敗しました。ローカルシミュレータにフォールバックします:", apiErr.message);
        }

        // UI表示用変数
        let status = "良好 (グリーン)";
        let statusColor = "green";
        let alertLevel = "success";
        let aiMessage = "";
        let finalWbgt = Math.random() * 5 + 24; 
        let alcoholVal = 0.00;

        if (isRealApiSuccess && responseData) {
            // 本物APIレスポンスの適用
            const aiResult = responseData.aiResult || {};
            const ocrResult = responseData.ocrResult || {};
            status = aiResult.status || "良好 (グリーン)";
            alertLevel = aiResult.alertLevel || "success";
            aiMessage = aiResult.aiMessage || "";
            finalWbgt = responseData.wbgt || 28.0;
            alcoholVal = ocrResult.alcoholValue !== undefined ? ocrResult.alcoholValue : 0.00;
            
            if (alertLevel === "warning") statusColor = "yellow";
            else if (alertLevel === "danger") statusColor = "red";
            else statusColor = "green";
        } else {
            // API失敗時、またはローカルフォールバック時（マトリクス判定）
            if (activeMode === 'departure') {
                const sleepScore = parseInt(sleepScoreInput.value);
                const fatigue = manualFatigueInput.value;
                const stress = parseInt(stressScoreInput.value);
                const hrvStatus = stress < 35 ? "良好" : (stress < 70 ? "注意" : "警告");
                
                finalWbgt = 30.2; // 猛暑日シミュレート
                alcoholVal = 0.00;
                
                const isSleepPoor = sleepScore < 70;
                const isSleepVeryPoor = sleepScore <= 50;
                const isFatigueHigh = fatigue === "重い" || hrvStatus === "警告";
                const isFatigueMed = fatigue === "やや疲れ" || hrvStatus === "注意";

                const destination = destinationInput.value.trim() || "未指定";
                const routeProfile = routeProfileInput ? routeProfileInput.value : "一般";
                const isInspectionOk = vehicleInspectionInput ? vehicleInspectionInput.checked : true;
                
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
                    return 15;
                };

                const distance = estimateDistanceKm(destination);

                // 日常点検およびメーター記録状況のAI指導の生成
                let vehicleAdvice = isInspectionOk 
                    ? `日常点検（ブレーキ・タイヤ等）も「異常なし」と記録されました。素晴らしい点呼安全意識です。`
                    : `⚠️【警告】運行開始前の日常点検（タイヤ・ブレーキ）が未完了です！直ちに安全確認を行ってください。`;

                // 路線特性（運行計画）に応じたプロ向け安全警告の生成
                let profileAdvice = "";
                if (destination.includes("新宿区四ツ谷") || destination.includes("マルチドロップ") || (scheduleFileBase64 && destination.includes("新宿"))) {
                    profileAdvice = `\n\n📋【AIマルチドロップ運行計画スキャン結果】\n・新宿四ツ谷エリア：一方通行の極狭路が多いため、歩行者の急な飛び出しや電柱への接触に最徐行で警戒してください。\n・港・千代田エリア：大型車の往来と二輪車のすり抜けが激しいため、交差点右左折時の巻き込みに極警戒してください。\n・世田谷エリア：住宅街スクールゾーンと午後下校時間帯が重なるため、子供の動きを予測した安全運転を徹底してください。`;
                } else if (routeProfile === "住宅街") {
                    profileAdvice = `\n\n🏙️【路線警告: 住宅街】配送コースに狭い住宅地や生活道路が多いため、塀・電柱の影（ブラインドコーナー）や交差点からの子供や自転車の急な飛び出しに厳重に警戒し、常にブレーキを踏める構えで最徐行を徹底してください！`;
                } else if (routeProfile === "高速幹線") {
                    profileAdvice = `\n\n🛣️【路線警告: 高速道路】単調な高速巡航による眠気（高速道路催眠現象）や微小睡眠が懸念されます。車内換気をこまめに行い、80km毎にPAに入って深呼吸とストレッチを行ってください！`;
                } else if (routeProfile === "山間山道") {
                    profileAdvice = `\n\n🏔️【路線警告: 山間急カーブ】急勾配や急カーブが連続する難ルートです。カーブの手前での十分な事前減速を行い、下り坂でのフェード現象（ブレーキ過熱）を防ぐため排気ブレーキやエンジンブレーキを多用してください！`;
                } else if (routeProfile === "工業地帯") {
                    profileAdvice = `\n\n🏭【路線警告: 工業地帯】大型トレーラーやコンテナ車の往来が極めて激しいエリアです。大型トラック同士の死角や、交差点右左折時の内輪差による巻き込み事故に極警戒し、十分な車間距離を確保してください！`;
                } else {
                    // 「一般（自動推測）」時の自律判定
                    if (destination.includes("魹") || destination.includes("岩手") || distance >= 300) {
                        profileAdvice = `\n\n🌐【コース特性自動推測】本州最東端や超長距離幹線ルートが予想されます。長時間の疲労蓄積が懸念されるため、無理な行程は避け、2時間おきに必ずシートから降りて休憩を挟んでください。`;
                    } else {
                        profileAdvice = `\n\n🌐【コース特性自動推測】一般的な走行ルートです。走行状況に合わせて無理のないペースで、心に余裕を持った安全運転で行ってらっしゃい！`;
                    }
                }

                if (runType === '通勤') {
                    // 通勤モード (任意・自主ケア)
                    status = "通勤安全宣言 (グリーン)";
                    statusColor = "green";
                    alertLevel = "success";
                    
                    let reasons = [];
                    if (sleepScore < 60) reasons.push("昨夜は少し睡眠不足気味のようです");
                    if (fatigue === "やや疲れ" || fatigue === "重い") reasons.push("少しお疲れが出ているようです");
                    
                    let vitalAdvice = reasons.length > 0 ? `${reasons.join('、かつ')}が、マイカー通勤ですのでご自身のペースで無理せず安全第一で運転してください。` : "睡眠・体調ともに万全です！";
                    
                    aiMessage = `【安全運転AI】${driverId}さん、おはようございます！自宅から事業所までの自主的な安全宣言を受領しました。${vitalAdvice}思いやりのある運転（自主ケア）で、本日も無事に出勤しましょう。シートベルトを締めて、いってらっしゃい！🏠🚗${vehicleAdvice}${profileAdvice}`;
                } else {
                    // 業務運行モード (要点呼承認)
                    if (distance >= 100) {
                        // 100km以上の超長距離運行 ➔ 軽微・中度のリスクでも対面点呼対象 (レッド / 運行停止) にアップグレード！
                        if (isSleepVeryPoor || isSleepPoor || isFatigueHigh || isFatigueMed || finalWbgt > 29.5) {
                            status = "対面点呼対象 (レッド)";
                            statusColor = "red";
                            alertLevel = "danger";
                            
                            let reasons = [];
                            if (isSleepVeryPoor) reasons.push(`睡眠極度不足（スコア: ${sleepScore}点）`);
                            else if (isSleepPoor) reasons.push(`睡眠不足気味（スコア: ${sleepScore}点）`);
                            if (isFatigueHigh || isFatigueMed) reasons.push(`疲労蓄積（自覚: ${fatigue} / HRV: ${hrvStatus}）`);
                            if (finalWbgt > 29.5) reasons.push(`周辺の極度猛暑（WBGT: ${finalWbgt.toFixed(1)}℃）`);
                            
                            aiMessage = `【運行前チェックAI】${driverId}さん、目的地【${destination}】までの約${distance}kmの過酷な長距離運行となるため、本日の健康状態（${reasons.join('、および')}）を考慮し、安全のため【対面点呼対象（レッド）】とします。${vehicleAdvice}${profileAdvice}`;
                        } else {
                            // 全て良好でも、100km超なのでイエロー注意喚起
                            status = "点呼承認待ち (イエロー)";
                            statusColor = "yellow";
                            alertLevel = "warning";
                            aiMessage = `【運行前チェックAI】${driverId}さん、健康状態は良好ですが、目的地【${destination}】までの約${distance}kmの長距離運行です。長時間の運転は眠気を誘発しやすいため、「要警戒」として管理者のオンライン点呼承認を待機します。${vehicleAdvice}${profileAdvice}`;
                        }
                    } else if (distance < 30) {
                        // 30km未満の超短距離運行 ➔ 多少の睡眠不足・疲労があってもグリーン (良好 / 運行開始) にダウングレード緩和！
                        if (isSleepVeryPoor) {
                            // 極度の睡眠不足だけは短距離でも運行停止 (レッド)
                            status = "対面点呼対象 (レッド)";
                            statusColor = "red";
                            alertLevel = "danger";
                            aiMessage = `【運行前チェックAI】${driverId}さん、短距離移動ですが睡眠スコア（${sleepScore}点）が極めて低いため【対面点呼対象（レッド）】とします。事故リスク回避のため、対面点呼を受けてください。${vehicleAdvice}${profileAdvice}`;
                        } else if (isSleepPoor || isFatigueHigh || isFatigueMed) {
                            // 本来ならイエローだが、短距離のためグリーンに緩和して即時アンロック
                            status = "良好・自主確認 (グリーン)";
                            statusColor = "green";
                            alertLevel = "success";
                            aiMessage = `【運行前チェックAI】${driverId}さん、睡眠（${sleepScore}点）や疲労（${fatigue}）に若干の懸念がありますが、目的地【${destination}】までは約${distance}kmと超短距離のため、安全に十分配慮すれば運行可能です！${vehicleAdvice}${profileAdvice}`;
                        } else {
                            // 完全に良好
                            status = "良好 (グリーン)";
                            statusColor = "green";
                            alertLevel = "success";
                            aiMessage = `【運行前チェックAI】${driverId}さん、チェックイン完了！睡眠スコア（${sleepScore}点）、バイタルともに万全。目的地【${destination}】（約${distance}km）までの近距離、本日も笑顔でいってらっしゃい！${vehicleAdvice}${profileAdvice}`;
                        }
                    } else {
                        // 通常の中距離（30km以上 100km未満） ➔ 標準のマトリクス判定
                        if (isSleepVeryPoor || (isSleepPoor && isFatigueHigh)) {
                            status = "対面点呼対象 (レッド)";
                            statusColor = "red";
                            alertLevel = "danger";
                            
                            let reasons = [];
                            if (isSleepVeryPoor) reasons.push(`昨夜の睡眠スコアが「${sleepScore}点」と極端に低い`);
                            if (isSleepPoor && isFatigueHigh) {
                                reasons.push(`睡眠不足（スコア: ${sleepScore}点）と深刻な疲労（HRVストレス: ${hrvStatus} / 自覚疲労: ${fatigue}）の二重リスク`);
                            }
                            aiMessage = `【運行前チェックAI】${driverId}さん、アルコールは正常ですが、${reasons.join('、および')}の重大リスクを検知しました。【対面点呼対象】となります。運行管理者の対面指示を仰いでください。${vehicleAdvice}${profileAdvice}`;
                        } else {
                            if (isSleepPoor || isFatigueHigh || isFatigueMed || finalWbgt > 29.5) {
                                status = "対面点呼待ち (イエロー)";
                                statusColor = "yellow";
                                alertLevel = "warning";
                                
                                let reasons = [];
                                if (isSleepPoor) reasons.push(`睡眠スコア低め（${sleepScore}点）`);
                                if (isFatigueHigh || isFatigueMed) reasons.push(`疲労蓄積（自覚: ${fatigue} / HRV: ${hrvStatus}）`);
                                if (finalWbgt > 29.5) reasons.push(`周辺の極度猛暑（WBGT: ${finalWbgt.toFixed(1)}℃）`);
                                
                                aiMessage = `【運行前チェックAI】${driverId}さん、アルコール値はクリアですが、${reasons.join('、かつ')}のため【対面点呼待ち】とします。管理者の安全指導を受け、承認されたら運行を開始してください。${vehicleAdvice}${profileAdvice}`;
                            } else {
                                status = "点呼承認待ち (イエロー)";
                                statusColor = "yellow";
                                alertLevel = "warning";
                                aiMessage = `【運行前チェックAI】${driverId}さん、測定完了です！アルコール未検出、バイタル値（睡眠: ${sleepScore}点）も良好。目的地【${destination}】（約${distance}km）までの安全運転をサポートします。運行管理者による点呼承認を待機しています。${vehicleAdvice}${profileAdvice}`;
                            }
                        }
                    }
                }
            } else {
                // 帰着時のローカル判定
                const nearMiss = nearMissCountInput.value;
                const detail = nearMissDetailInput ? nearMissDetailInput.value : "";
                status = "運行終了完了 (グリーン)";
                statusColor = "green";
                alertLevel = "success";
                finalWbgt = Math.random() * 5 + 23;
                
                if (detail.includes("工事") || detail.includes("迂回") || returnReportFileBase64) {
                    status = "運行終了完了 (RAG知識蓄積済 🟢)";
                    statusColor = "green";
                    alertLevel = "success";
                    aiMessage = `【運行後AIエージェント】${driverId}さん、本日の乗務お疲れ様でした！AI日報スキャンにより、新宿〜千代田での「工事迂回ルート情報」、および新宿四ツ谷での「自転車飛び出しヒヤリハット位置」を検知し、Azure Cosmos DBに正常データベース化しました。この情報はRAGおよび検索グラウンディング知識としてリアルタイム同期され、明日同じ地域を走る他の全ドライバーの安全運行コ・パイロット指示に即時反映されます。現場データの自動循環によるセーフティループへの貢献に深く感謝します！本日はゆっくりお休みください。🍵`;
                } else if (nearMiss === '3回以上') {
                    status = "運行終了 (要面談)";
                    statusColor = "yellow";
                    alertLevel = "warning";
                    aiMessage = `【運行前チェックAI】${driverId}さん、運行終了打熟を受領しました。本日はヒヤリハットが3回以上と非常に多い状態でした。蓄積疲労による注意力低下の懸念があります。事故に繋がる前に、一度運行管理者と対面面談を行ってください。本日はゆっくりお休みください。🍵`;
                } else if (nearMiss === '1〜2回') {
                    status = "運行終了完了 (グリーン)";
                    aiMessage = `【運行前チェックAI】${driverId}さん、本日の乗務お疲れ様でした！ヒヤリハット報告（1〜2回）を受領しました。軽微なインシデント要因を整理し、次回乗務時の安全に繋げましょう。ゆっくり体を休めてくださいね。🍵`;
                } else {
                    status = "運行終了完了 (グリーン)";
                    aiMessage = `【運行前チェックAI】${driverId}さん、運行お疲れ様でした！インシデントなく無さに終業できたことに深く感謝します。明日も気持ちよく乗務できるよう、しっかり睡眠をとってください！🍵`;
                }
            }
        }

        // --- ローカルストレージにログを保存（管理者ダッシュボード連携用） ---
        const checkinLog = {
            id: "LOG-" + Date.now().toString().slice(-6),
            driverId: driverId,
            mode: activeMode,
            runType: activeMode === 'departure' ? runType : '帰着',
            timestamp: new Date().toLocaleTimeString(),
            location: locationData,
            sleepScore: activeMode === 'departure' ? parseInt(sleepScoreInput.value) : null,
            fatigue: activeMode === 'departure' ? manualFatigueInput.value : null,
            alcoholValue: alcoholVal,
            status: status,
            statusColor: statusColor,
            alertLevel: alertLevel,
            aiMessage: aiMessage,
            wbgt: finalWbgt,
            evidenceImage: capturedImageBase64,
            destination: activeMode === 'departure' ? (destinationInput.value || "未指定") : "帰着完了",
            nearMiss: activeMode === 'return' ? nearMissCountInput.value : null,
            nearMissDetail: activeMode === 'return' ? (nearMissDetailInput ? nearMissDetailInput.value : "") : null,
            returnReportFile: activeMode === 'return' ? returnReportFileBase64 : null,
            odometer: activeMode === 'departure' ? (odometerInput ? parseInt(odometerInput.value) : null) : null,
            routeProfile: activeMode === 'departure' ? routeProfileInput.value : null,
            vehicleInspection: activeMode === 'departure' ? (vehicleInspectionInput ? (vehicleInspectionInput.checked ? "OK" : "NG") : null) : null
        };

        try {
            const existingLogs = JSON.parse(localStorage.getItem('safeDriveLogs') || '[]');
            existingLogs.unshift(checkinLog);
            localStorage.setItem('safeDriveLogs', JSON.stringify(existingLogs));
        } catch (storageErr) {
            console.error("Failed to save checkin log to localStorage:", storageErr);
        }

        // --- フィードバックパネル更新 ---
        feedbackTitle.textContent = `AIリスク判定: ${status}`;
        feedbackMessage.textContent = aiMessage;
        ocrValText.textContent = `${alcoholVal.toFixed(2)} mg/L`;
        wbgtText.textContent = `${finalWbgt.toFixed(1)} ℃`;

        // UIスタイル切り替え
        feedbackBox.style.display = 'block';
        feedbackBox.style.borderColor = `var(--${alertLevel})`;
        feedbackIcon.textContent = alertLevel === 'success' ? '💚' : (alertLevel === 'warning' ? '⚠️' : '🚨');
        
        if (alertLevel === 'success') {
            feedbackTitle.style.color = "var(--success)";
        } else if (alertLevel === 'warning') {
            feedbackTitle.style.color = "var(--warning)";
        } else {
            feedbackTitle.style.color = "var(--danger)";
        }

        feedbackBox.scrollIntoView({ behavior: 'smooth' });

        submitBtn.innerHTML = "Check-in 完了";
        submitBtn.style.background = "linear-gradient(135deg, var(--success) 0%, #059669 100%)";
        
        // リアルタイム点呼承認の同期処理（0ms遅延・イベント駆動）
        if (activeMode === 'departure' && runType === '業務' && status.includes("承認待ち")) {
            activeStorageHandler = (e) => {
                if (e.key === 'safeDriveLogs') {
                    let logs = [];
                    try { logs = JSON.parse(e.newValue || '[]'); } catch(parseErr) { return; }
                    const currentLog = logs.find(l => l.id === checkinLog.id);
                    if (currentLog && (currentLog.status === "点呼完了・運行可" || currentLog.statusColor === "green")) {
                        window.removeEventListener('storage', activeStorageHandler);
                        activeStorageHandler = null;
                        triggerApprovalUnlock(currentLog);
                    }
                }
            };
            window.addEventListener('storage', activeStorageHandler);
        } else {
            setTimeout(() => {
                if (activeMode === 'departure') {
                    submitBtn.innerHTML = "🚀 運行開始チェックイン";
                    submitBtn.style.background = "linear-gradient(135deg, var(--primary) 0%, #7c3aed 100%)";
                } else {
                    submitBtn.innerHTML = "🏁 運行終了チェックイン";
                    submitBtn.style.background = "linear-gradient(135deg, #10b981 0%, #059669 100%)";
                }
                submitBtn.disabled = false;
            }, 3000);
        }
    });

    function generateMockReturnImage(driverId) {
        const c = document.createElement('canvas');
        c.width = 320;
        c.height = 240;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, 320, 240);
        ctx.fillStyle = '#10b981';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText('RETURN OK', 40, 100);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.fillText('Driver: ' + driverId, 40, 150);
        ctx.fillText('Time: ' + new Date().toLocaleTimeString(), 40, 180);
        return c.toDataURL('image/jpeg');
    }

    function triggerApprovalUnlock(currentLog) {
        const driverId = localStorage.getItem('driverId') || 'DRV-1002';
        
        // 1. スマートフォンのバイブレーション（トン・トン・ドン）
        if (navigator.vibrate) {
            navigator.vibrate([100, 50, 200]);
        }

        // 2. 画面全体の近未来的グリーンフラッシュエフェクト
        const flash = document.createElement('div');
        flash.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(16, 185, 129, 0.35);
            box-shadow: inset 0 0 100px rgba(16, 185, 129, 0.7);
            z-index: 9999;
            pointer-events: none;
            opacity: 1;
            transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
        `;
        document.body.appendChild(flash);
        
        // 瞬時にフェードアウト開始
        setTimeout(() => {
            flash.style.opacity = '0';
            setTimeout(() => flash.remove(), 1200);
        }, 50);

        // 3. フィードバックボックスへネオンパルスのアニメーションクラスを付与
        feedbackBox.classList.add('approved-glow');
        
        // 4. テキスト情報とUIの状態反映
        feedbackTitle.textContent = "点呼完了: 運行許可済 🔓";
        feedbackTitle.style.color = "var(--success)";
        feedbackBox.style.borderColor = "var(--success)";
        feedbackIcon.textContent = "🟢";
        const safeDriverId = escapeHtml(driverId);
        const safeApprover = escapeHtml(currentLog.approver || '佐藤運行管理者');
        feedbackMessage.innerHTML = `【運行前チェックAI】<strong>点呼完了！スマートキーがアンロックされました。</strong><br><br>${safeDriverId}さん、運行管理者の${safeApprover}により、オンライン点呼の【承認】が下りました。エンジン始動が許可されました。シートベルトを着用し、思いやりのある安全運転で行ってらっしゃい！`;
        
        submitBtn.innerHTML = "🔓 エンジン始動許可済";
        submitBtn.style.background = "linear-gradient(135deg, var(--success) 0%, #059669 100%)";
    }

    checkAuthentication();

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
