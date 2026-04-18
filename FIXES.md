# 丽江本地生活小程序 - 修复完成清单

## ✅ 已修复

### 致命问题
1. ✅ **创建 `login` 云函数** - app.js onLaunch 现在能正常登录
2. ✅ **db 云函数补全优惠券功能** - receiveCoupon / listMyCoupons 已实现
3. ✅ **admin 云函数部署到所有位置** - root + miniprogram + merchant 三处同步
4. ✅ **商户端 tabBar 图片** - 生成 8 个 PNG 占位图标
5. ✅ **sitemap.json** - 用户端和商户端均已创建

### 逻辑 Bug
6. ✅ **酒店排序修复** - 距离排序改为按评分兜底（云数据库不支持地理距离排序）
7. ✅ **订单支付流程修复** - order.js 和 order-detail.js 的"去支付"直接调 pay 云函数，不再创建新订单
8. ✅ **商品 storeId 修复** - store-detail.js 下单时优先使用商品的 storeId 字段
9. ✅ **商户工作台 storeId** - dashboard.js 改用 merchant.storeId 查询订单
10. ✅ **日期格式化** - order.js 和 order-detail.js 已格式化 createdAt / paidAt
11. ✅ **订单云函数支付返回值修复** - pay 云函数返回 mock:true 时 order 云函数正确处理

### 功能完善
12. ✅ **云函数目录统一** - 三个目录（root / miniprogram / merchant）同步所有云函数
13. ✅ **首页 banner 点击** - 添加 onBannerTap 事件处理
14. ✅ **酒店详情页日期选择器** - 添加入住/退房日期 picker UI
15. ✅ **所有云函数添加 package.json**

## 数据库集合清单

部署前需在云开发控制台创建以下集合：

| 集合名 | 用途 |
|--------|------|
| users | 用户信息 |
| stores | 店铺/商户信息 |
| merchants | 商户账号 |
| rooms | 房型信息 |
| products | 特产商品 |
| orders | 订单 |
| banners | 首页轮播图 |
| reviews | 评价 |
| addresses | 收货地址 |
| coupons | 优惠券 |
| user_coupons | 用户领取的优惠券 |
| user_subscribes | 订阅消息记录 |
| notify_logs | 推送日志 |
