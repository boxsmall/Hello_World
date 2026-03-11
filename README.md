# Texas Hold'em Web 游戏

一个基于德州扑克（Texas Hold'em）规则的简化 Web 端小游戏，支持：

- 你 + 电脑玩家对局
- 电脑玩家数量可选（0~4 个）
- 发手牌、翻牌、转牌、河牌、摊牌完整流程
- 过牌 / 跟注 / 下注加注 / 弃牌
- 自动比较牌型（高牌到同花顺）

## 本地运行

在项目目录执行：

```bash
python3 -m http.server 8000
```

然后浏览器打开：

```text
http://localhost:8000
```

## 文件说明

- `index.html`：页面结构
- `styles.css`：样式
- `script.js`：游戏逻辑（发牌、回合、AI、牌型判断）
