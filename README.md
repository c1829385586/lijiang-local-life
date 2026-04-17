# 本地生活小程序

> 多商家本地生活平台 — 酒店民宿 · 美食推荐 · 周边游玩 · 特产零食

## 📁 项目结构

```
miniprogram-local-life/
├── miniprogram/                    # 👤 用户端小程序
│   ├── app.js / app.json / app.wxss
│   ├── pages/
│   │   ├── home/                   # 首页（推荐、分类入口）
│   │   ├── hotel/                  # 酒店民宿列表
│   │   ├── hotel-detail/           # 酒店详情 + 预订 + 选房
│   │   ├── food/                   # 美食列表
│   │   ├── food-detail/            # 美食详情
│   │   ├── travel/                 # 周边游玩
│   │   ├── travel-detail/          # 游玩详情
│   │   ├── product/                # 特产零食（可送到房间）
│   │   ├── cart/                   # 购物车
│   │   ├── order/                  # 订单列表
│   │   ├── order-confirm/          # 订单确认 + 支付
│   │   ├── address/                # 收货地址管理
│   │   ├── search/                 # 搜索
│   │   ├── store-detail/           # 商户详情
│   │   └── mine/                   # 我的（个人中心）
│   └── components/                 # 公共组件
│
├── merchant-miniprogram/           # 🏪 商户端小程序（独立）
│   ├── app.js / app.json / app.wxss
│   ├── pages/
│   │   ├── login/                  # 商户入驻（注册 + 审核）
│   │   ├── dashboard/              # 工作台（今日数据 + 待处理订单）
│   │   ├── store-edit/             # 店铺信息编辑
│   │   ├── room-manage/            # 房型管理（酒店）
│   │   ├── room-edit/              # 房型编辑
│   │   ├── product-manage/         # 商品管理
│   │   ├── product-edit/           # 商品编辑
│   │   ├── order-manage/           # 订单管理（接单/拒绝/完成）
│   │   ├── order-detail/           # 订单详情
│   │   ├── stats/                  # 数据统计
│   │   └── profile/                # 个人设置
│   └── components/
│
└── cloudfunctions/                 # ☁️ 云函数（免运维，共用）
    ├── order/                      # 订单管理（用户端调用）
    ├── pay/                        # 支付（当前为模拟支付）
    └── merchant/                   # 商户管理（商户端调用）
```

## ✨ 功能清单

### 👤 用户端
- [x] 首页推荐（Banner + 分类 + 热门推荐）
- [x] 酒店民宿预订（选房型、选日期、入住信息）
- [x] 美食推荐（地图探索、距离排序）
- [x] 周边游玩（景点推荐、攻略）
- [x] 特产零食（可送到酒店房间）
- [x] 订单管理（创建、支付、取消、确认）
- [x] 收货地址管理
- [x] 搜索功能
- [x] 腾讯地图导航

### 🏪 商户端
- [x] 商户入驻注册
- [x] 工作台（今日数据、待处理订单）
- [x] 店铺信息管理
- [x] 房型管理（酒店民宿：添加/编辑/上下架）
- [x] 商品管理（特产零食：添加/编辑/上下架/送到房间开关）
- [x] 订单管理（接单/拒绝/确认完成）
- [x] 数据统计（按天统计订单数、营收）

## 💰 支付状态

> ⚠️ **当前使用模拟支付** — 未配置微信支付商户号

支付流程已完整实现，开通过程：
1. 注册微信商户号 → https://pay.weixin.qq.com/
2. 在商户平台完成认证
3. 将商户号关联到小程序
4. 在云开发控制台开启支付能力
5. 修改 `cloudfunctions/pay/index.js`，将模拟代码替换为真实支付逻辑

开通前可以直接测试完整下单流程，只是不走真实扣款。

## 🚀 快速开始

### 1. 环境准备
- 微信开发者工具
- 微信小程序 AppID（需要两个：用户端 + 商户端）
- 微信云开发环境（两个小程序共用同一个云开发环境）

### 2. 创建项目
1. 微信开发者工具 → 新建项目 → 选择 `miniprogram/` 目录 → 用户端
2. 微信开发者工具 → 新建项目 → 选择 `merchant-miniprogram/` 目录 → 商户端

### 3. 配置云开发
两个项目的 `app.js` 中替换相同的环境ID：
```js
wx.cloud.init({
  env: 'your-env-id', // 替换为你的环境ID
  traceUser: true
})
```

### 4. 创建数据库集合
在云开发控制台 → 数据库中创建以下集合：

| 集合名 | 说明 | 主要操作方 |
|--------|------|-----------|
| `stores` | 商户/店铺信息 | 商户端写，用户端读 |
| `merchants` | 商户账号信息 | 商户端 |
| `rooms` | 房型信息 | 商户端写，用户端读 |
| `products` | 特产商品 | 商户端写，用户端读 |
| `orders` | 订单 | 双端读写 |
| `banners` | 首页轮播图 | 管理后台写，用户端读 |
| `users` | 用户信息 | 用户端 |

### 5. 数据结构示例

**stores（店铺）**
```json
{
  "type": "hotel",
  "name": "山间民宿",
  "coverImage": "cloud://xxx",
  "images": ["cloud://xxx"],
  "address": "xxx路xxx号",
  "latitude": 30.123,
  "longitude": 120.456,
  "tags": ["免费停车", "含早餐"],
  "score": 4.8,
  "minPrice": 299,
  "status": 1
}
```

**merchants（商户账号）**
```json
{
  "openid": "xxx",
  "name": "山间民宿",
  "type": "hotel",
  "phone": "13800138000",
  "contactName": "张三",
  "storeId": "关联的store_id",
  "status": 1
}
```

**products（商品 - 特产零食）**
```json
{
  "storeId": "store_id",
  "name": "手工腊肉",
  "coverImage": "cloud://xxx",
  "price": 68,
  "originalPrice": 88,
  "stock": 100,
  "category": "特产干货",
  "canDeliverToRoom": true,
  "sales": 0,
  "status": 1
}
```

### 6. 部署云函数
在微信开发者工具中，右键每个云函数目录 → **上传并部署：云端安装依赖**

需要部署的云函数：
- `cloudfunctions/order`
- `cloudfunctions/pay`
- `cloudfunctions/merchant`

### 7. 腾讯地图Key
在用户端 `pages/home/home.js` 中替换：
```js
url: `https://apis.map.qq.com/ws/geocoder/v1/?location=${lat},${lng}&key=YOUR_KEY`
```
申请地址：https://lbs.qq.com/

## 🎨 设计

- **用户端主色**：`#FF6B35`（活力橙）
- **商户端主色**：`#2C3E50`（深蓝灰，专业感）
- **字体**：PingFang SC / Microsoft YaHei

## 💡 核心卖点

### 特产送到房间
住客订完酒店，直接在酒店详情页选购周边特产和小零食，由商户配送到房间。这是本地生活区别于纯OTA平台的核心差异。

### 商户自助管理
商家通过独立小程序自行管理商品、房型、订单，平台方零运维成本。

## 📝 待开发
- [ ] 优惠券/活动功能
- [ ] 分销/推广功能
- [ ] 客服系统
- [ ] 真实微信支付

## ✅ 已完成（新增）

### ⭐ 评价系统
- 用户端完成订单后可评价（1-5星 + 文字 + 图片）
- 管理后台：评价列表、评分分布、按评分/状态筛选
- 隐藏/显示/删除评价
- 商户可回复评价
- 自动更新店铺评分

**云函数：** `review`（用户端调用）、`admin`（管理后台调用）

### 🔔 消息推送（订单状态通知）
- 基于微信订阅消息，支持4种通知：
  - 支付成功通知 → 用户
  - 订单完成通知 → 用户
  - 订单取消通知 → 用户
  - 新订单通知 → 商户
- 管理后台：推送统计、手动推送、推送日志
- 模板配置说明页

**云函数：** `notify`（发送通知）、`admin`（管理后台调用）

### 部署新增云函数
```bash
# 微信开发者工具中右键部署：
cloudfunctions/review/
cloudfunctions/notify/
```

### 订阅消息模板配置
1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 订阅消息 → 选用以下模板（或相似模板）：
   - 支付成功通知
   - 订单状态提醒
   - 订单取消通知
   - 商家新订单提醒
3. 获取模板ID，填入 `cloudfunctions/notify/index.js` 的 `TEMPLATE_IDS` 中
4. 重新部署 notify 云函数
