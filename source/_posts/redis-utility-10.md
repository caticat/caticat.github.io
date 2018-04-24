---
title: 10. Redis 扩展功能-发布订阅
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-24 15:50:35
---

- 发布者,订阅者都是客户端
- 频道信息记录在Redis服务器中

{% asset_img publish_subscribe.jpg publish subscribe %}

<!-- more -->

## 命令

- 发布消息
	`publish $channel $message`
	返回订阅者个数
- 订阅消息
	`subscribe $channel [$channel...]`
	持续返回相关频道的信息
	不会显示之前发布的信息
	只会显示订阅开始后新发布的信息
- 取消订阅
	`unsubscribe $channel [$channel...]`
- 模式匹配订阅和取消订阅
	`psubscribe $channelPattern [$channelPattern...]`
	`punsubscribe $channelPattern [$channelPattern...]`
- 订阅查询
	- 查询活跃频道
		`pubsub channels [$channelPattern]`
		查询所有符合`$channelPattern`的频道
		(必须至少有一个订阅者)
	- 查看频道订阅数
		`pubsub numsub [$channel...]`
	- 查看模式订阅数
		`pubsub numpat`

## 用途

聊天室/公告牌/服务之间消息解耦用
