---
title: 5. Redis 扩展功能-Pipeline
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-23 17:34:00
---


组装命令,批处理
按照顺序组装一系列命令统一发给服务器,
服务器再按照命令的顺序将结果统一组装发给客户端,
减少了多次执行命令所使用的网络通信时间

**pipeline不能过长,会引起阻塞**

<!-- more -->

## 执行命令流程

1. 发送命令
2. 命令排队
3. 命令执行
4. 返回结果

其中:1,4组合成为Round Trip Time(RTT,往返时间)

## 优点

- pipeline的执行速度比逐条执行要快
- 客户端服务器网络延迟越大,pipeline的效果越明显

## 缺点

- 单次执行前需要统计好所有需要执行的命令
- 无法根据上次命令查询结果来修改本次命令的内容

## 与`mset`,`mget`等天然支持批量操作命令的对比

- 原生命令是原子性的,pipeline是非原子性的
- 原生命令只是单条命令,pipeline是多条命令
