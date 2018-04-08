---
title: 5. Redis API的理解和使用-集合
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-08 16:49:55
---


集合(set)
无序不重复的元素的集合,
元素数量上限:2^32-1,
支持多个集合取:交集/并集/差集.

<!-- more -->

## 命令

### 单个集合

- 添加
	`sadd $key $element [$element ...]`,返回添加成功的元素个数
- 删除
	`srem $key $element [$element ...]`,返回删除成功的元素个数
- 获取元素个数
	`scard $key`,时间复杂度为O(1),不会遍历
- 判断元素是否在集合中
	`sismember $key $element`
- 随机从集合返回指定个数的元素
	`srandmember $key [$count]`,默认为1
- 随机从集合弹出元素
	`spop $key`,Redis3.2后,支持`$count`参数
- 获取所有元素
	`smembers $key`

**`smembers`,`lrange`和`hgetall`都属于比较重的命令,如果元素过多,可能阻塞Redis,这是用可以使用`sscan`来完成**

### 多个集合

- 交集
	`sinter $key [$key ...]`
- 并集
	`sunion $key [$key ...]`
- 差集(第一个集合元素剔除后面所有集合的元素后剩下的元素组成的集合)
	`sdiff $key [$key ...]`
- 将上述集合操作结果保存(命令+store)
	`sinterstore $destination $key [$key ...]`
	`sunionstore $destination $key [$key ...]`
	`sdiffstore $destination $key [$key ...]`

## 编码

有两种
1. intset
	元素都是整数且个数小于`set-max-intset-entries`(默认512个)时会使用intset减少内存的使用
2. hashtable
	无法满足intset条件时,使用hashtable

## 使用场景

- 标签(tag)(sadd)
- 随机抽奖(spop|srandmember)

