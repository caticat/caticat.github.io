---
title: 2. Redis API的理解和使用
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-04 16:08:20
---


## 全局命令

1. 查看所有的键,o(n),线上应禁止使用
`keys *`
2. 查看键总数,o(1)
`dbsize`
3. 检查键是否存在
`exists $key`
4. 删除键
`del $key...`
5. 键过期,设置键的过期秒数,`RedisLV`不支持
`expire $key $seconds`
查询`key`的剩余有效时间,
`ttl $key`
	- `>0`,剩余有效时间秒
	- `-1`,无过期时间
	- `-2`,键不存在
6. 键的数据结构类型
`type $key`

<!-- more -->

## 数据结构和内部编码

每种数据结构都有自己的底层内部编码实现,而且是多种实现
`object encoding $key`命令可以查询内部编码

### 数据结构

- 字符串
- 哈希
- 列表
- 集合
- 有序集合

{% asset_img basic_type.jpg basic type %}

### 内部编码

{% asset_img basic_type_encoding.jpg basic type encoding %}

优点:
- 无需改动外部数据结构和命令,即可将代码替换成更合适的数据结构
- 不同的结构在不同情况下有不同的优势

## 单线程架构

`Redis`使用了单线程架构和`I/O`多路复用模型来实现高性能的内存数据库服务.

### 流程

1. 客户端发送命令
2. `Redis`执行命令
3. 返回结果

因为是单线程,所有命令在一个队列里等待执行,不存在多个命令同时执行的情况

### 快的原因

1. 纯内存访问
2. 非阻塞I/O(内部使用epoll)
3. 避免了线程切换和竞争(单线程的阻塞问题需要注意)
