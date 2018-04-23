---
title: 1. Redis 扩展功能-慢查询
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-23 15:42:23
---

慢日志就是程序记录命令的执行(无网络通信,排队等待的时间)前后的时间差,
当执行时间超过预设的阀值时,就会记录这条命令相关的信息.
可以根据慢日志来定位性能问题

<!-- more -->

## 配置

- `slowlog-log-slower-than`是超时时间(微秒),默认是10000,0:记录所有命令,<0:停用慢日志
- `slowlog-max-len`慢日志记录数量限制,超出的按照时间早晚删除,是队列,先进先出

### 配置修改命令

```redis
config set slowlog-log-slower-than 20000 # 设置超时时间
config set slowlog-max-len 100 # 设置最大长度
config rewrite # 写配置文件到硬盘
```

## 慢日志命令

- 显示慢日志
	`slowlog get [$count]`
	获取所有(指定条目)的慢日志
	每个慢日志有4个属性组成
	- 日志id
	- 发生时间戳
	- 命令耗时
	- 执行的完整命令(包含参数)
- 获取慢日志长度
	`slowlog len`
- 慢日志重置(清空)
	`slowlog reset`

## 可以注意的地方

- 慢日志条目限制可以适当增多,减少慢日志被顶掉的数量
- 默认10毫秒超时,根据需要设置超时时间
- 可以定时执行`slowlog get`+`slowlog reset`命令将慢日志存储在其他文件中,保证慢日志不会丢失
