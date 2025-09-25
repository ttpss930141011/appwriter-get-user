import { Client } from 'node-appwrite';

// Appwrite Function 入口點
export default async ({ req, res, log, error }) => {
  // 獲取 userId 參數
  const userId = req.query.userId || req.headers['x-user-id'];

  if (!userId) {
    error('Missing userId parameter');
    return res.json({ error: 'User ID is required' }, 400);
  }

  log(`Fetching user with ID: ${userId}`);

  try {
    // 初始化 Appwrite 客戶端 - 使用請求 header 中的 API Key
    const apiKey = req.headers['x-appwrite-key'] || process.env.APPWRITE_FUNCTION_API_KEY || '';

    if (!apiKey) {
      throw new Error("沒有可用的 API Key");
    }

    // 直接使用 REST API 呼叫（繞過 node-appwrite SDK v11.0.0 的 bug）
    const response = await fetch(`${process.env.APPWRITE_FUNCTION_API_ENDPOINT}/users/${userId}`, {
      method: 'GET',
      headers: {
        'X-Appwrite-Project': process.env.APPWRITE_FUNCTION_PROJECT_ID,
        'X-Appwrite-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      if (response.status === 404) {
        error(`User not found: ${userId}`);
        return res.json({ error: 'User not found' }, 404);
      } else if (response.status === 401) {
        error('Unauthorized access to user data');
        return res.json({ error: 'Unauthorized' }, 401);
      } else if (response.status === 403) {
        error('Forbidden - check function scopes');
        return res.json({ error: 'Forbidden' }, 403);
      } else {
        const errorText = await response.text().catch(() => '');
        throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorText}`);
      }
    }

    const user = await response.json();

    // 構造返回數據，匹配 Android 代碼期望的格式
    const userData = {
      id: user.$id,
      email: user.email || '',
      name: user.name || user.email?.split('@')[0] || 'User',
      avatarUrl: user.prefs?.avatar || ''  // 假設頭像存儲在用戶偏好中
    };

    log(`Successfully fetched user: ${userData.name} (${userData.id})`);

    return res.json(userData, 200);

  } catch (err) {
    // 詳細錯誤處理
    error(`Error fetching user: ${err.message}`);
    return res.json({
      error: 'Internal server error',
      details: err.message
    }, 500);
  }
};