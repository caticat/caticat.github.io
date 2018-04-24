---
title: 8. Redis 扩展功能-位操作
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-24 11:56:24
---

位操作(Bitmaps)本质就是字符串
在Redis中提供了一系列位操作命令

## 命令
<!-- more -->

- 设置值
	`setbit $key $offset $value`
- 获取值
	`getbit $key $offset`
- 获取指定范围内值为1的个数
	`bitcount $key [$start $end]`(起始字节和结束字节,不是位)
- 交,并,非,异或运算(多个位变量的操作)
	`bitop $op $destkey $key [$key...]`
	- $op
		- and
		- or
		- not
		- xor
	最终结果存放在`$destkey`中
- 从前到后查找第一个值为指定值的位置
	`bitpos $key $指定值(0|1) [$start $end]`

## 试用范围

需要用到的标记量比较多的时候,
如果用到的比较少,直接使用`set`来存储id即可,
如果很多,则使用位变量能减少空间.
