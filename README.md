# 加班调休记录网页应用

一个纯前端、零依赖的网页应用，用来记录：

- 每日加班时间
- 可调休余额
- 已使用的调休记录
- 本月与累计统计
- 餐补统计

## 本地使用

直接用浏览器打开 [index.html](/Users/yuki/Documents/Codex/2026-04-25-app/index.html) 即可。

如果想本地起一个简单服务，也可以在当前目录运行：

```bash
python3 -m http.server 4173
```

然后访问：

[http://localhost:4173](http://localhost:4173)

## 发布到 GitHub Pages

这个项目已经是标准静态站点，可以直接发布到 GitHub Pages。

1. 在 GitHub 新建一个仓库，例如 `overtime-ledger`
2. 把当前目录里的文件上传到仓库根目录
3. 进入仓库的 `Settings`
4. 打开 `Pages`
5. 在 `Build and deployment` 中选择 `Deploy from a branch`
6. 选择 `main` 分支和 `/(root)` 目录
7. 保存后等待几分钟，GitHub 会生成公网地址

生成后的地址通常类似：

- `https://你的用户名.github.io/overtime-ledger/`

## 数据迁移

注意：浏览器的 `localStorage` 是按网址隔离的。

这意味着你现在在本地文件地址 `file:///.../index.html` 里保存的数据，不会自动出现在 GitHub Pages 的新网址里。

建议这样迁移：

1. 先在本地页面点击“导出备份”
2. 打开 GitHub Pages 上的新网址
3. 点击“导入备份”
4. 选择刚才导出的 `json` 文件

这样原来的记录就能迁过去。

## 当前功能

- 登记加班日期、开始时间、结束时间、休息分钟、备注
- 自动按“19:00 后才算加班”计算有效加班小时数
- 加班到 20:00（含）及以后自动记 20 元餐补
- 自动累计可调休余额
- 登记调休并自动扣减余额
- 展示本月与累计统计
- 浏览器本地 `localStorage` 持久化保存
- 支持导出 JSON 备份和导入备份
- 支持删除记录

## 后续可继续扩展

- 导出 Excel / CSV
- 员工多账号
- 审批状态
- 云端同步
- 手机端适配加强
