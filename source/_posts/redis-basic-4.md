---
title: 4. Redis API的理解和使用-哈希
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-08 11:34:14
---

## 命令

- 设置值
	`hset $key $field $value`
	`hsetnx`:当不存在`$field`时设置
- 获取值
	`hget $key $field`
- 删除`$field`
	`hdel $key $field [$field ...]`
- 计算`$field`个数
	`hlen $key`
- 批量设置
	`hmset $key $field $value [$field $value ...]`
- 批量获取
	`hmget $key $field [$field ...]`
- 判断`$field`是否存在
	`hexists $key $field`
- 获取所有`$field`
	`hkeys $key`
- 获取所有`$value`
	`hvals $key`
- 获取所有的`$field-$value`
	`hgetall $key`
	当哈希元素个数比较多的时候,该命令可能会阻塞`Redis`,只需要部分数据的话推荐使用`hmget`,一定要获得全部的话,也可以使用`hscan
	`来遍历
- 递增计数
	`hincrby $key $field`
	`hincrbyfloat $key $field`
- 计算`$value`的长度(Redis3.2以上)
	`hstrlen $key $field`

<!-- more -->
## 内部编码

两种内部编码
1. ziplist(压缩列表)
	当元素个数小于`hash-max-ziplist-entries`(默认512个)同时所有值小于`hash-max-ziplist-value`(默认64字节)时会使用.ziplist比hashtable更紧凑,节省内存
2. hashtable(哈希表)
	当不满足ziplist条件时,就是使用哈希表存储.因为这时ziplist的读写效率会下降,而哈希表读写时间复杂度为O(1)

## 与关系型数据库对比

- 哈希表类型更加直观
- 哈希表是稀疏的,单条数据增加一个`$key`不影响其他数据的字段,而关系行数据库增加列需要给所有数据都增加一个属性值
- 关系型数据库可以做复杂关系查询,而使用`Redis`去模拟复杂查询开发困难,维护成本高

{% asset_img db_compare.jpg db compare %}

## 几种数据存储方法

1. 原生字符串:每个属性一个键
```redis
set user:1:name a
set user:1:age 1
set user:1:city b
```
	- 优点:简单直观,所有属性都支持更新操作
	- 缺点:键过多,内存占用大,用户信息内聚性差
2. 系列化字符串类型:将用户信息系列化为一个键后保存
```redis
set user:1 serialize(userInfo)
```
	- 优点:简化变成,如果合理使用序列化可以提高内存使用效率
	- 缺点:序列化和反序列化有一定开销,每次更新属性都需要把全部数据取出后更新,反序列化
3. 哈希类型:用户属性存储为`$field-$value`,但只用一个键保存
```redis
hmset user:1 name a age 1 city b
```
	- 优点:简单直观,如果使用合理可以减少内存空间的使用
	- 缺点:要控制哈希在ziplist和hashtable两种内部编码的转换,hashtable会消耗更多的内存

