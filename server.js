// 导入需要的库
const express = require('express');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

// 创建Express应用
const app = express();
const PORT = process.env.PORT || 3000; // 改为从环境变量获取端口
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// 配置中间件
app.use(cors()); // 解决跨域问题
app.use(bodyParser.json()); // 解析JSON请求
app.use(express.static('.')); // 允许访问本地静态文件（比如index.html）

// 1. 连接SQLite数据库（没有会自动创建）
const db = new sqlite3.Database('./todo.db', (err) => {
    if (err) {
        console.error('数据库连接失败：', err.message);
    } else {
        console.log('成功连接SQLite数据库');
        // 初始化数据表（用户表+待办表）
        initDb();
    }
});

// 2. 初始化数据库表
function initDb() {
    // 创建用户表（存储管理员密码，这里只做单用户）
    db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  )`, (err) => {
        if (err) console.error('创建用户表失败：', err.message);
        // 初始化默认管理员（用户名admin，密码123456，加密后存储）
        bcrypt.hash('123456', 10, (err, hash) => {
            db.run(`INSERT OR IGNORE INTO users (username, password) VALUES (?, ?)`, ['admin', hash]);
        });
    });

    // 创建待办事项表
    db.run(`CREATE TABLE IF NOT EXISTS todos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP
  )`, (err) => {
        if (err) console.error('创建待办表失败：', err.message);
    });
}

// 3. 后端接口：验证密码（登录）
app.post('/api/login', (req, res) => {
    const { password } = req.body;
    // 查询数据库里的管理员密码
    db.get(`SELECT password FROM users WHERE username = ?`, ['admin'], (err, row) => {
        if (err) {
            return res.json({ success: false, message: '服务器错误' });
        }
        if (!row) {
            return res.json({ success: false, message: '无管理员账户' });
        }
        // 对比密码（加密后对比）
        bcrypt.compare(password, row.password, (err, result) => {
            if (result) {
                res.json({ success: true, message: '登录成功' });
            } else {
                res.json({ success: false, message: '密码错误' });
            }
        });
    });
});

// 4. 后端接口：获取所有待办事项
app.get('/api/todos', (req, res) => {
    db.all(`SELECT * FROM todos ORDER BY create_time DESC`, (err, rows) => {
        if (err) {
            return res.json({ success: false, data: [] });
        }
        res.json({ success: true, data: rows });
    });
});

// 5. 后端接口：添加待办事项
app.post('/api/todos', (req, res) => {
    const { content } = req.body;
    if (!content) {
        return res.json({ success: false, message: '内容不能为空' });
    }
    db.run(`INSERT INTO todos (content) VALUES (?)`, [content], function (err) {
        if (err) {
            return res.json({ success: false, message: '添加失败' });
        }
        res.json({ success: true, id: this.lastID });
    });
});

// 6. 后端接口：删除待办事项
app.delete('/api/todos/:id', (req, res) => {
    const id = req.params.id;
    db.run(`DELETE FROM todos WHERE id = ?`, [id], (err) => {
        if (err) {
            return res.json({ success: false, message: '删除失败' });
        }
        res.json({ success: true });
    });
});

// 启动服务器
app.listen(port, () => {
    console.log(`后端服务运行在：http://localhost:${port}`);
    console.log('打开浏览器访问：http://localhost:3000/index.html 即可使用');

});
