---
title: 5. Redis API的理解和使用-列表
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-08 15:06:21
---


列表(list)是用来存储多个有序的字符串,
列表中的每个字符串成为元素(element),
一个列表最多可以存储2^32-1个元素.
它可以充当栈和队列
(可以理解为有长度限制的链表)

{% asset_img list_basic_operation_0.jpg list basic operation 0 %}
{% asset_img list_basic_operation_1.jpg list basic operation 1 %}

<!-- more -->

## 特点

1. 有序
	可以通过索引下标来获取元素和这范围内的元素列表
2. 可以重复

## 命令

{% asset_img list_oper_command.jpg command %}

- 获得
	`lrange $begin $end`,$begin,$end:从左至右[0,(N-1)],从右直左[-1, -N],包含两端元素
	`lindex $key $index`,获取指定位置的元素
	`llen $key`,获得列表长度
- 添加
	`rpush $key $value [$value ...]`
	`lpush $key $value [$value ...]`
- 插入
	`linsert $key before|after $pivot $value` 找到等于`$pivot`的元素,在其前|后插入一个新元素`$value`
- 删除
	`lpop $key`,删除左侧第一个元素
	`rpop $key`,删除右侧第一个元素
	`lrem $key $count $value`,删除指定元素
		- `$count > 0`,从左到右删除`$count`个元素
		- `$count < 0`,从右到左删除`-$count`个元素
		- `$count = 0`,删除所有
	`ltrim $key $start $end`,截断表
- 修改
	`lset $key $index $value`,设置列表第`$index`元素的值
- 阻塞操作
	`blpop|brpop $key [$key ...] $timeout`,是`lpop`和`rpop`的阻塞版本
		- 其中`$key [$key ...]`为多个列表,如果有多个列表,则按照顺序从左到右遍历,返回最先有数据的列表和对应的数据
		- `$timeout`为超时时间(秒),如果为0则一直阻塞等待下去.(不会阻塞`Redis`进程)
		- 当有多个block操作等待时,按照时间顺序返回给每一个block操作的结果

## 编码

有两种编码实现

1. ziplist(压缩列表)
	当元素个数小于`list-max-ziplist-entries`(默认512个),同时每个元素值都小于`list-max-ziplist-value`(默认64字节)时,会使用ziplist来减少内存的使用
2. linkedlist(链表)
	当不满足ziplist条件时,使用链表作为内部实现

注:
Redis3.2提供了额外的`quicklist`内部编码,简单的说它是一个以ziplist为节点的linkedlist,
结合了两者的优势. 

## 常用组合

- `lpush`+`lpop`,栈
- `lpush`+`rpop`,队列
- `lpush`+`ltrim`,有限集合
- `lpush`+`brpop`,消息队列,生产者消费者模式

