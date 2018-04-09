---
title: 8. Redis API的理解和使用-键管理
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-09 11:19:46
---


## 单个键

- 键重命名
	`rename $key $newkey`,会覆盖已有键值
	`renamenx $key $newkey`,不会覆盖已有键值
	**重命名时会使用`del`删除旧的键,如果值比较大,可能会阻塞Redis**
- 随机返回一个键
	`randomkey`,从已有的key中随机一个key返回
- 键过期
	- `expire $key $seconds`,键在`$seconds`秒后过期
	- `expireat $key $timestamp`,键在秒级时间戳后过期
	- `ttl $key`,查看过期时间(秒),`-1`无限时间,`-2`键不存在
	- `pexpire $key $milliseconds`,键在`$seconds`毫秒后过期
	- `pexpireat $key $milliseconds-timestamp`,键在毫秒级时间戳后过期
	- `pttl $key`,查看过期时间(毫秒)
	- `persist $key`,清除键的过期时间
	**对于字符串类型的键,执行`set`命令时,很容易会覆盖掉过期时间**
<!-- more -->
- 迁移键
	将部分数据从一个数据库移动到另一个数据库
	- `move $key $db`(自评:不好用)
		内部使用,Redis内部有多个数据库,该命令会将数据从一个数据库移动到另一个数据库中(不建议使用)
	- `dump`+`restore`(自评:不好用)
		`dump $key`会将对应键的数据转为RDB格式
		`restore $key $ttl $serialized-value`会将RDB数据设置到`$key`中
		伪代码:
		```python
		s = redis.Redis(host="src", port=9898, db=0)
		t = redis.Redis(host="tar", port=9898, db=0)
		k = "hello"
		t.restore(k, 0, s.dump(k))
		```
	- `migrate`
		{% asset_img migrate.jpg migrate %}
		`migrate $host $port $key|"" $destination-db $timeout [copy] [replace] [keys key ...]`
		- `$host`:目标Redis的IP地址
		- `$port`:目标Redis的端口
		- `$key|""`:Redis3.0.6之前只支持一个`$key`,后面支持多个`$key`.当使用多个`$key`时,这里添空字符串
		- `$destination-db`:目标Redis的数据库索引
		- `$timeout`:前移超时时间(毫秒)
		- `[copy]`:迁移后不删除源数据
		- `[replace]`:覆盖目标数据库数据
		- `[key ...]`:迁移多个键的键名
		- 例:
			- `migrate 127.0.0.1 6666 hello 0 1000 copy replace`
			- `migrate 127.0.0.1 6666 "" 0 5000 keys hello1 hello2 hello3`

## 遍历键

1. 全量遍历键
	`keys $pattern`
	根据后面的正则表达式来查找显示所有符合条件的键
	因为是单线程阻塞操作,所以当键值较多的时候,要注意该命令的使用.
2. 渐进式遍历
	`scan $cursor [match $pattern] [count $number]`
	- `$cursor`:游标指针,初始是0,后面是每次返回的结果,当游标指针再次为0时,遍历结束
	- `match $pattern`:只返回满足正则匹配条件的值
	- `count $number`:每次运行命令处理的键的数量,默认是10
	- 例:`scan 0 match user* count 13`
	其他数据结构对应的遍历命令:
	- `hgetall`->`hscan`
	- `smembers`->`sscan`
	- `zrange`->`zscan`
	**渐进式遍历可以有效解决`keys`命令可能产生的阻塞问题,但是如果在`scan`中键发生变化(增加/删除/修改),那么就可能出现新增键可能没有遍历到,或者遍历出重复键的情况.`scan`不保证完整遍历出所有的键.**

## 数据库管理

Redis提供了几个面向数据库操作的命令

- 切换数据库
	Redis默认有16个数据库(0-15)
	默认使用`0`数据库
	切换当前使用的数据库使用命令:
	`select $dbIndex`
	Redis3.0中已经逐渐弱化这个功能,Redis分布式实现Redis Cluster只允许使用0号数据库.
	不使用多个数据库的原因:
		- Redis是单线程的,使用多个数据库,仍然是一个CPU管理,影响效率
		- 多数据库会让调试和运维不同业务的数据库更困难,一个慢查询会影响所有的数据库,定位问题也很困难
		- 部分Redis客户端不支持,按照数字切换数据库容易混乱
- 清除数据库数据
	`flushdb`:清空当前数据库数据
	`flushall`:清空所有数据库数据
	当当前数据库键值数据比较多的时候,这两个命令可能会引起阻塞


