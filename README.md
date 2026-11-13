# Star Daily

一个简洁的 GitHub 每日升星榜。每天北京时间 08:00 采集 GitHub Trending 综合页及 Python、JavaScript、TypeScript、Rust、Go、Java、C++、Shell 语言页的今日热门候选项目，按页面显示的 `stars today` 排序取前 20，调用本机 Codex CLI 生成中文简介，保存到 SQLite。网站支持查看历史榜单。

**统计口径**：GitHub Trending 综合页及指定语言页是 GitHub 选出的热门候选集，并非全站所有仓库；榜单是该候选集按新增星数排序的前 20，不能视作全站升星前 20。GitHub 的“today”窗口不一定是北京时间自然日或精确的前 24 小时。

近7日榜和近30日榜直接汇总所选日期及此前对应天数的每日榜，不额外采集。项目仅累计出现在每日榜中的新增星数，未上榜的日期不计入；如果某天没有榜单，该日也不会计入。项目名称按大小写不敏感去重，项目简介、语言和总星数使用该项目最近一次上榜时的记录，因此结果不是完整的实际升星量。切换日期可以查看历史榜单。

## 运行

需要 Python 3.9+（系统须有 Asia/Shanghai 时区数据）、已登录的 Codex CLI，以及能够访问 GitHub 和 Codex 服务的网络。无第三方 Python 依赖。

```sh
cd /root/workspace/github-star-daily
python3 app.py
```

浏览器打开 <http://127.0.0.1:8000>。服务器部署时通过 Nginx 在 <https://xulm.host/stars/> 提供访问，systemd 服务监听 `127.0.0.1:4200`。可通过 `HOST`、`PORT`、`STAR_DAILY_DB` 环境变量调整监听地址、端口和数据库路径。默认数据库是 `data/stars.db`。服务运行后可另开终端手动采集：

```sh
python3 collect.py
```

采集会请求 GitHub Trending，并运行 `codex exec` 生成所有项目的中文简介。必须保证定时任务运行用户的 Codex 已完成登录；可用 `CODEX_BIN` 指定可执行文件路径。采集、解析或 Codex 失败时不替换已有数据。相同日期重新采集会原子替换该日期榜单。执行结果输出到标准输出和标准错误。

## 每天定时采集

在持续运行的 Linux 主机上配置 cron；使用脚本来保留已有任务并添加项目专属任务：

```sh
./scripts/install-cron.sh
```

cron 每小时唤醒一次脚本，脚本仅在北京时间 08:00 执行采集；日志写入 `data/collect.log`。请确保 cron 服务运行，运行用户的环境能访问 GitHub 和 Codex、Codex 已登录，并且机器在该时间开机。脚本不会启动网站进程；如需长期提供服务，请用 systemd 或进程管理器运行 `python3 app.py`。通过 `crontab -l` 检查任务。移除时删除包含 `# star-daily-collector` 的行。

## 验证

```sh
python3 -m unittest discover -s tests -v
node --test tests/test_ui.cjs
```
