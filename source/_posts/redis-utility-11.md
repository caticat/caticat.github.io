---
title: 11. Redis 扩展功能-地理定位(GEO)
tags:
  - redis
  - database
categories:
  - redis
  - development & operation
date: 2018-04-24 16:28:26
---

为了计算地理位置提供的接口集
GEO数据结构本质是`zset`
<!-- more -->

## 命令

- 增加地理位置信息
	`geoadd $key $经度 $纬度 $成员名 [$经度 $纬度 $成员名...]`
	重复添加相同成员名的数据会返回0,只能添加一次,但是会更新相应的位置信息
- 获取地理位置信息
	`geopos $key $成员名 [$成员名...]`
- 获取两点之间的距离
	`geodist $key $成员1 $成员2 [$单位]`
	- $单位
		- m(meter)米
		- km(kilometer)千米
		- mi(mile)英里
		- ft(feet)尺
- 获取指定范围内的地理信息位置集合
	`getradius $key $中心点精度 $中心点纬度 $半径 $单位`
	`getrediusbymember $key $成员名 $半径 $单位`
	这两条命令还有扩展参数
	- withcoord 结果包含经纬度
	- withdist 结果包含距离中心点距离
	- withhash 结果包含`geohash`(就是将经纬度转化为一个字符串,所有的点都可以转化为字符串,字符串长度越长越精确,转换是双向的)
	- COUNT $count 指定返回结果的数量
	- asc|desc 按照距离中心点的距离做升序降序排列
	- store $key 将结果的地理位置信息保存到指定键中
	- sotredist $key 将结果距离中心点的距离保存到指定键中
- 删除地理位置信息
	`zrem $key $成员名`
	直接使用`zrem`删除数据,`geo`命令本身无删除命令
