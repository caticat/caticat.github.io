---
title: leveldb源码-Status
tags:
  - leveldb
  - source
  - database
categories: leveldb
date: 2019-02-12 17:52:40
---

## 功能

- 用于操作结果的返回
- 标记操作状态的成功与失败
- 失败时有相应的描述信息

## 源文件

`leveldb/status.h`
`leveldb/util/status.cc`

## 内部枚举定义

```cpp
enum Code {
	kOk = 0,
	kNotFound = 1,
	kCorruption = 2,
	kNotSupported = 3,
	kInvalidArgument = 4,
	kIOError = 5
};
```

## 属性

- private
	- `const char* state_`,用于记录错误具体信息
		- 默认为`nullptr`
		- 如果为`nullptr`,则表示状态为`kOk`正常
		- 格式:
			- [:3]:后续错误信息字符串的整体长度(不包含长度记录和错误号字节)
			- [4]:错误号(`Code`的枚举)
			- [5:]:错误文字信息
				- 最多由两段错误信息拼接而成
				- 两段文字中间使用连个字节`: `分割

<!-- more -->

## 方法

### 静态方法

主要是用于创建Status的方法

- `OK`,返回正常的Status结构
- `NotFound`,返回`kNotFound`的Status结构
- `Corruption`,返回`kCorruption`的Status结构
- `NotSupported`,返回`kNotSupported`的Status结构
- `InvalidArgument`,返回`kInvalidArgument`的Status结构
- `IOError`,返回`kIOError`的Status结构
- `CopyState`,将参数的`state`字符串完整复制到自身的`state`中

### 构造复制函数

分别包含了标准和右值引用优化对应的函数

### 其他

#### 公共

- `ok`,返回`State`是否正常
- `IsNotFound`,返回`State`是否为`kNotFound`
- `IsCorruption`,返回`State`是否为`kCorruption`
- `IsIOError`,返回`State`是否为`kIOError`
- `IsNotSupportedError`,返回`State`是否为`kNotSupported`
- `IsInvalidArgument`,返回`State`是否为`kInvalidArgument`
- `ToString`,如果状态正常,则返回"OK",否则返回对应的错误信息描述

#### 私有

- `code`,将`state_`中记录的`Code`提取出来
