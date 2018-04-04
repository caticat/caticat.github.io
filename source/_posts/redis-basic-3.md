---
title: 3. Redis API的理解和使用-字符串
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-04 17:50:34
---


字符串是`Redis`最基础的数据结构
支持二进制数据
最大值不能超过512MB

## 基本命令

### 设置

`set $key $value [ex $seconds][px milliseconds][nx|xx]`

ex:过期的秒数
px:过期的毫秒数
nx:$key不存在才能设置
xx:$key存在才能设置

`setex`,`setnx`就是简化了`set`的使用方法

`setnx`可以做分布式锁

<!-- more -->

### 获取

`get $key`

如果`$key`不存在,则返回`nil`

### 批量设置值

`mset $key $value [$key $value ...]`

### 批量获取值

`mget $key [$key ...]`

不存在就返回`nil`,顺序和`$key`的顺序一致
`mget`可以减少通信次数,提高效率

**单次命令发送的字节数也不是无限的,数量过多可能造成Redis或者网络阻塞**

### 记数

- `incr $key`(自增)
	- 值存在
		- 整数:返回自增后的结果
		- 非整数:返回错误
	- 不存在,按0处理,返回结果为1
- `decr $key`(自减)
- `incrby $key $increment`(自增指定数值)
- `decrby $key $decrement`(自减指定数值)
- `incrbyfloat $key $increment`(自增指定浮点数)

## 不常用命令

### 追加值

`append $key $value`
在字符串结尾追加字符串

### 获取字符串长度

`strlen $key`

### 获取原始值并设置新值

`getset $key $value`

### 从指定位置开始设置字符串

`setrange $key $offset $value`
是覆盖/替换操作,可以增加字符串的长度

### 获取指定位置区间的字符串

`getrange $key $start $end`
从0开始,闭区间,包含两个端点

## 内部编码

- int:8字节的长整型
- embstr:<=39字节的字符串(实测没有找到这个数据结构的使用)
- raw:>39字节的字符串

Redis会根据当前值的类型和长度决定使用那种内部编码实现

查看`$key`的内部编码命令:
`object encoding $key`

## 典型使用场景

### 缓存

应用程序+Redis+Mysql

{% asset_img cache.jpg cache %}

Redis没有命令空间,推荐使用的命名方式是:
`业务名:对象名:id:属性`作为键(也可以不是`:`)
可以在意义明确的情况下缩写键名减少因为键过长导致的内存浪费

### 记数

### 共享Session

### 限制指定时间指定次数

通过`$key`的时效性和自增功能可以实现
