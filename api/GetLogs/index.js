const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, req) {
    context.log('Fetching driving logs from Cosmos DB...');

    const useRealCosmos = process.env.COSMOS_DB_KEY && 
                          process.env.COSMOS_DB_KEY !== "YOUR_COSMOS_DB_PRIMARY_KEY" &&
                          process.env.COSMOS_DB_ENDPOINT;

    try {
        if (useRealCosmos) {
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

            // 最新の50件のログを取得 (タイムスタンプ降順)
            const querySpec = {
                query: "SELECT * FROM c ORDER BY c._ts DESC OFFSET 0 LIMIT 50"
            };

            const { resources: items } = await container.items.query(querySpec).fetchAll();

            context.res = {
                status: 200,
                body: {
                    success: true,
                    isSimulated: false,
                    data: items
                },
                headers: { 'Content-Type': 'application/json' }
            };
        } else {
            // シミュレーター（ローカル環境など）時は空配列を返し、フロント側の初期モックを優先
            context.res = {
                status: 200,
                body: {
                    success: true,
                    isSimulated: true,
                    data: []
                },
                headers: { 'Content-Type': 'application/json' }
            };
        }
    } catch (err) {
        context.log.error("GetLogs エラー:", err);
        context.res = {
            status: 500,
            body: { error: "サーバー内部エラーが発生しました。" }
        };
    }
};
