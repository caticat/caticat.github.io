---
title: REDISLV数据备份与恢复
tags:
  - redis
  - redisLV
  - data backup
  - data recovery
categories:
  - redis
date: 2018-07-23 11:24:21
---


REDISLV的数据保存一般是根据配置文件
直接保存在本地硬盘上的

## 示例说明

一个基本的配置文件的例子
redis_simple.conf

```conf
# 所有会使用到的配置整理
 
# 后台运行
# daemonize yes 
 
# 监听
port 9898
 
# 客户端ip限制
bind 127.0.0.1

# 密码限制
requirepass 192168119145
 
# 不保存rdb文件
save ""
 
# 是否开启aof
appendonly yes

# 每秒保存日志
appendfsync everysec

# aof重写配置
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# 慢日志配置
slowlog-log-slower-than 10000
slowlog-max-len 128

# rdb,aof保存目录
dir ./database

# levedb配置
leveldb yes
leveldb-path ./leveldb
```

<!-- more -->

根据例子的配置
数据库不保存rdb文件

只使用aof和leveldb保存数据
aof是实时日志,防止leveldb出现问题无法恢复
或者当切换为普通的redis时,可以直接使用这个
aof文件来进行数据恢复.
aof文件是保存在配置中的`./database`中的

leveldb是使用leveldb的方式持久化数据
leveldb的数据是保存在`./database/leveldb`文件夹中的

### 不使用rdb的原因

因为使用了leveldb,所以数据的压缩保存就不需要使用
rdb了.
rdb保存本身要fork进程
有可能占用更多的内存
当数据库比较大时,
写文件时间可能会比较长,
影响aof和leveldb的写操作.

## 备份

定期保存`./database`文件夹下的数据即可

## 恢复

实际上就是用以前备份的文件覆盖掉现有文件的一个过程
整体回档也可以采用这种方案.

1. 数据库停机
2. 将备份的数据库文件覆盖掉原来的数据库文件
3. 启动数据库
4. 完成

