---
title: 3. Redis 扩展功能-redis-server
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-23 16:49:13
---


redis的server,实际的数据处理都是使用这个程序

<!-- more -->

## 参数

- `--test-memory $内存大小(MB)`,检测是否可以正确的分配指定大小的内存给redis-server使用,可以减少因为内存问题导致的redis-server服务错误(极端内存使用测试用)
