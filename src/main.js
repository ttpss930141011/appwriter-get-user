 import { Client, Users } from 'node-appwrite';

  // Appwrite Function入口点
  export default async ({ req, res, log, error }) => {
    // 验证请求方法
    if (req.method !== 'GET') {
      return res.json({ error: 'Method not allowed' }, 405);
    }

    // 获取userId参数
    const userId = req.query.userId || req.headers['x-user-id'];

    if (!userId) {
      error('Missing userId parameter');
      return res.json({ error: 'User ID is required' }, 400);
    }

    log(`Fetching user with ID: ${userId}`);

    try {
      // 初始化Appwrite客户端（服务端模式）
      const client = new Client()
        .setEndpoint(process.env.APPWRITE_FUNCTION_ENDPOINT)
        .setProject(process.env.APPWRITE_FUNCTION_PROJECT_ID)
        .setKey(process.env.APPWRITE_FUNCTION_API_KEY);

      const users = new Users(client);

      // 获取用户信息
      const user = await users.get(userId);

      // 构造返回数据，匹配Android代码期望的格式
      const userData = {
        id: user.$id,
        email: user.email || '',
        name: user.name || user.email?.split('@')[0] || 'User',
        avatarUrl: user.prefs?.avatar || ''  // 假设头像存储在用户偏好中
      };

      log(`Successfully fetched user: ${userData.name} (${userData.id})`);

      return res.json(userData, 200);

    } catch (err) {
      // 详细错误处理
      if (err.code === 404) {
        error(`User not found: ${userId}`);
        return res.json({ error: 'User not found' }, 404);
      } else if (err.code === 401) {
        error('Unauthorized access to user data');
        return res.json({ error: 'Unauthorized' }, 401);
      } else {
        error(`Error fetching user: ${err.message}`);
        return res.json({ error: 'Internal server error' }, 500);
      }
    }
  };