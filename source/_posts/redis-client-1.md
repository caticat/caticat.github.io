---
title: 1. Redis 客户端-客户端通信协议
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-24 17:56:38
---


- 使用TCP协议
- 定制了RESP(Redis Serialization Protocol)序列化协议

## 协议格式

请求格式(换行符使用`\r\n`):
```
*3
$3
SET
$5
hello
$5
world
```
返回格式:
```
+OK
```
<!-- more -->

格式说明
```
*<参数数量>CRLF
$<参数1字节数>CRLF
<参数1>CRLF
...
```

实际是字符串:
`*3\r\nSET\r\n$5\r\nhello\r\n$5\r\nworld\r\n`

返回第一个字节为
- `+`,状态回复,如`set hello world`
- `-`,错误回复,命令错误
- `:`,整数回复,如`incr a`
- `$`,字符串回复,如`get hello`
- `*`,多条字符串回复,如`mget hello a`

### 使用`nc`命令来查看原始返回

`nc`是`ncat`的缩写,安装运行命令`yum install -y nc`,实际安装包名为:`nmap-ncat`

- 连接redis-server
	`nc 127.0.0.1 6666`
- 发送命令
	`set hello world`
- 收到返回
	`+OK`
- 发送命令
	`get hello`
- 收到返回
	```
	$5
	world
	```
