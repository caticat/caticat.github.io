---
title: 2. Redis 扩展功能-redis-cli
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-23 16:40:39
---

## 参数

- `--help`所有参数帮助
- `-h`IP
- `-p`端口
- `redis-cli -p 6666 -r 5 -i 1 ping`每隔1秒执行一次命令`ping`,总共执行5次
- `-x`从输出获取命令的最后一个参数`echo "world" | redis-cli -p 6666 -x set hello`(只能获取最后一个参数,即时输出中有空格也是只能获取一个)
<!-- more -->
- `-c`cluster选项,功能我还不知道
- `--slave`将客户端模拟成`redis-server`的从数据库
- `--rdb`将数据库文件保存为rdb文件在本地`redis-cli -p 6666 --rdb $filename`
- `--eval`执行lua脚本
- `--latency`,当前客户端和服务器的网络延迟信息
- `--latency-history`,显示两次调用该命令的延迟信息(可以配合`-r-i`参数定时输出)
- `--latency-dist`,已图表的形式输出延迟信息
- `--stat`查看redis的运行状态(key数量,内存使用,客户端数量,阻塞数量,请求数量,连接数)
	在命令行内部,可以直接使用`info`命令来查看更详细的信息
- `--raw`和`--no-raw`直接运行的命令是否格式化