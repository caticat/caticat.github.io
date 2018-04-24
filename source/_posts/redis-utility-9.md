---
title: 9. Redis 扩展功能-HyperLogLog
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-24 15:16:45
---

HyperLogLog是一种数据结构(本质为字符串)
基于一种基数算法
它可以用极小的内存空间完成数据统计
它本身属性有点像`set`一样
因为它的存储数据不是一一对应的关系,
实际是有错误的,
官方给出的错误率是0.81%

**优点:相比set,可以极大的减少内存的使用**
<!-- more -->

## 命令

- 添加
	`pfadd $key $element [$element...]`
- 查询数量
	`pfcount $key [$key...]`
- 合并
	`pfmerge $destkey $key [%key...]`
	就是求并集

## 适用情况

- 只做统计数量,不需要获取单条数据
- 可以容忍一定误差率
