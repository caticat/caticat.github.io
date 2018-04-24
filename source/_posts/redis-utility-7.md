---
title: 7. Redis 扩展功能-Lua
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-24 11:33:17
---

## 在Redis中使用Lua

- 外部
	1. `redis-cli --eval $脚本文件名`
		`redis-cli -p 6666 --eval a.lua`
- 内部
	1. `eval $脚本内容 $参数个数 $参数列表...`
		`eval 'return "hello"..KEYS[1]..KEYS[2]' 2 world haha`
		`KEYS`数组下标从1开始
<!-- more -->
	2. `evalsha $脚本sha1值 $参数个数 $参数列表...`
	```bash
	redis-cli -p 6666 script load "$(cat a.lua)" # 获取到xxx.lua脚本的sha1值
	```
	```redis
	evalsha 4719dc708ac83e3d7c7252804b4b166e06519c61 2 world1 world2
	```
**使用`script load`可以将脚本内容加载到数据库内存中,后面通过返回的sha1值来调用执行脚本即可**

## Lua调用Redis

- `redis.call`可以调用Redis的命令,执行失败报错,停止继续执行
	```lua
	redis.call("set", "hello", "world")
	return redis.call("get", "hello")
	```
	```bash
	redis-cli -p 6666 --eval a.lua
	redis-cli -p 6666 script load "$(cat a.lua)"
	```
	```redis
	evalsha 86370eb220da770aec7bc7aeaacd7acefc3a8437 0
	```
- `redis.pcall`也可以调用Redis命令,执行失败会忽略错误继续执行脚本

## 使用Lua的好处

- 原子性,在Redis中执行脚本不会被中断插入其他命令执行
- 可以方便的组合命令来实现快捷操作
- 可以将多个命令打包,减少网络通信开销

## Redis命令

- `script load $脚本名`
	将脚本加载到内存中
- `script exits $脚本sha1...`
	判断脚本是否已经加载到内存中
- `script flush`
	清空所有被加载到内存中的脚本
- `script kill`
	杀掉当前正在执行的lua脚本,当lua脚本运行时间过长时可以使用该命令停止脚本的执行
	**当脚本正在执行写操作时,是无法使用本条命令进行关闭的,只能使用`shutdown save`来停掉操作**
	所以写lua脚本时一定要注意
