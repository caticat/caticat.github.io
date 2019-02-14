---
title: leveldb源码-slice
tags:
  - leveldb
  - source
  - database
categories: leveldb
date: 2019-02-14 16:22:47
---


## 功能

常用的参数,
本质就是指针+长度组成的字符串数组
但是内部不会申请内存,
只是引用外部的指针地址内容

## 源文件

`slice.h`

<!-- more -->

## 属性

- private
	- `const char* data_`,首字符指针
	- `size_t size_`,字符串长度

## 方法

### 公共

- `data`,返回`data_`指针
- `size`,返回`size_`值
- `empty`,字符串是否为空
- `operator[]`获取数组指定索引的char
- `clear`,将字符串设置为空""
- `remove_prefix`,删除前X个字符
- `ToString`,转化为`std::string`
- `compare`,比较Slice
	- 比参数小则返回值<0
	- 相等则返回值=0
	- 比参数大则返回值>0
- `starts_with`,判断该结构的前几个字符是否是已参数的字符开始的

### 全局

- `operator==`,判断两个Slice是否相同
- `operator!=`,判断两个Slice是否不同
