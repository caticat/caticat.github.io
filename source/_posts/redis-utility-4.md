---
title: 4. Redis 扩展功能-redis-benchmark
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-23 17:10:53
---


redis-benchmark是redis测试工具
用于测试redis的性能

<!-- more -->

## 参数

- `-c`
	客户端并发数量,默认50
- `-n $requests`
	客户端**总**请求数量,默认100000
- `-q`
	显示简略信息
- `-r $随机标志`
	向redis随机插入键,如:10000是随机键值的后4位
- `-P`
	每个请求pipeline的数量,默认为1
- `-k $是否长连`
	客户端是否使用keeplive,1:使用,0:不实用,默认为1
- `-t $command1[,$command2...]`
	对指定命令进行测试
- `--csv`
	将结果输出为csv格式输出,可以重定向到文件
