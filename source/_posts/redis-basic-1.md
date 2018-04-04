---
title: 1. 初识redis
# date: 2018-03-27 17:37:41
tags:
  - redis
  - database
categories: 
  - redis
  - development & operation
---

## 特性

1. 速度快
	- 数据在内存中
	- C语言实现的
	- 单线程架构,预防了多线程可能产生的资源竞争问题
	- 代码细节
2. 基于键值对的数据结构服务器(Remote Dictionary Server)
3. 丰富的功能
	- 键过期
	- 发布订阅
	- lua脚本
	- 简单事物
	- pipeline(将命令一次性传到redis)
4. 简单稳定
5. 客户端语言多
6. 持久化
7. 主从复制(复制功能是分布式Redis的基础)
8. 高可用和分布式
	- `Redis Sentinel`可以保证能够`Redis`节点的故障发现和故障自动转移
	- `Redis Cluster`是`Redis`真正的分布式实现,提供了高可用,读写和容量的扩展性

<!-- more -->

## 使用场景

### 适合

1. 缓存
合理的使用缓存可以加快数据的访问速度,有效降低后端数据源的压力.
`Redis`提供了键值过期时间设置,也提供了最大内存和内存溢出后的淘汰策略.
2. 排行榜系统
`Redis`提供了列表和有序集合数据结构,合理的使用可以很方便的构建各种排行榜系统.
3. 计数器应用
`Redis`天然支持计数功能而且计数性能也很好.
4. 社交网络
`Redis`的数据结构比传统关系型数据库更适合社交网络.
5. 消息队列系统
`Redis`提供了发布订阅功能和阻塞队列功能.

### 不适合

1. 从数据规模上看
如果数据量非常大,使用`Redis`来存储,基本是个无底洞
2. 从数据冷热角度看
冷数据放在`Redis`中存储是对内存的一种浪费

## 建议

1. 切勿当作黑盒使用,开发与运维同样重要,如:
	- 在有千万个键的`Redis`上执行`keys*`操作
	- 在一个写操作量很大的`Redis`上配置自动保存`RDB`
2. 阅读源码
加深对`Redis`的理解,提高自身的编码水平,对`Redis`做定制化.

## 程序文件说明

可执行文件 | 作用
-|
redis-server | 启动`Redis`
redis-cli | Redis命令行客户端
redis-benchmark | Redis基准测试工具
redis-check-aof | Redis AOF持久化文件检测和修复工具
redis-check-dump | Redis RDB持久化文件检测和修复工具
redis-sentinel | 启动Redis Sentinel

### 启动方式

#### 服务器启动

1. 直接启动`redis-server`
2. 命令行参数启动`redis-server --configKey1 configValue1 --configKey2 configValue2`
3. 配置文件启动`redis-server /opt/redis/redis.conf`

#### 客户端启动

1. 命令行参数连接`redis-cli -h 127.0.0.1 -p 6379`
2. 命令行参数直接查询`redis-cli  -h 127.0.0.1 -p 6379 get hello`

#### 停止`Redis`服务

1. `redis-server shutdown nosave|save`
2. `kill $pid`

断开与客户端的连接,持久化文件生成





