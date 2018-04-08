---
title: 7. Redis API的理解和使用-有序集合
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-08 19:57:05
---


有序的集合,
像集合一样元素不能重复,
增加了一个分数(可以重复)用于排序

{% asset_img collections_diff.jpg collections different %}

<!-- more -->

## 命令

### 单集合操作

- 添加
	`zadd $key $score $member [$score $member ...]`,返回成功添加的个数
	`zadd`时间复杂度为O(log(n)),`sadd`时间复杂度为O(1),有序是有代价的
- 计算成员个数
	`zcard $key`
- 获取成员分数
	`zscore $key $member`
- 获取成员排名
	`zrank $key $member`
	`zrevrank $key $member`,倒序
- 删除成员
	`zrem $key $member [$member ...]`,返回成功删除的个数
- 增加成员分数
	`zincrby $key $increment $member`,返回当前该元素的分数
- 获取指定排名范围的成员
	`zrange $key $start $end [withscores]`,`$start`
	`zrevrange $key $start $end [withscores]`,倒序
- 获取指定分数范围的成员(后面的参数不会用)(分数范围支持`(`开区间,只要在数字前加上对应的符号即可(默认是闭区间))
	`zrangebyscore $key $min $max [withscores] [$limit $offset $count]`
	`zrevrangebyscore $key $min $max [withscores] [$limit $offset $count]`
- 获取指定分数范围内的元素个数
	`zcount $key $min $max`
- 删除指定排名内的元素
	`zremrangebyrank $key $start $end`
- 删除指定分数范围内的成员
	`zremrangebyscore $key $min $max`

### 多集合操作

- 交集
	`zinterstore $destination $numberkeys $key [$key ...] [$weight ...] [aggregate sum|min|max]`
	- `$destination`结果存储位置
	- `$numberkeys`进行交集的`$key`的数量
	- `$key`键
	- `$weight`每个键的权重,计算时,会将每个`$key`的分数乘以自己的权重进行比较,默认为1
	- `[aggregate sum|min|max]`计算后,分值的汇总方式,默认是`sum`
- 并集
	`zunionstore $destination $numkeys $key [$key ...] [weight ...] [aggregate sum|min|max]`

## 编码

两种
1. ziplist(压缩列表)
	当有序集合元素个数小于`zset-max-ziplist-entries`(默认128个),同时每个元素值都小于`zset-max-ziplist-value`(默认64字节)时会使用ziplist,减少内存的使用
2. skiplist(跳跃表)
	当不满足条件时,采用skiplist,因为此时ziplist读写效率会下降

## 使用场景

排行榜点赞次数
- 添加用户赞数:`zadd`
- 取消用户赞数:`zrem`
- 展示赞数前1名:`zrevrangebyrank $key 0 9`
- 展示用户信息及分数:`hgetall`,`zscore`,`zrank`
