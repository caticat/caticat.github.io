---
title: leveldb源码阅读-db
tags:
  - leveldb
  - source
  - database
categories: leveldb
date: 2019-02-15 11:37:28
---

## 功能

定义了统一使用的数据库接口
规定了该类型的数据结构存储了有序键值对集合
同时内部保证了线程安全,外部无需关心线程安全问题
**接口类,内部实现没有看到,所以有很多TODO待后续阅读到相关代码补全**

## 源文件

`db.h`

## 相关类

### SnapShort

抽象类
记录特定状态的DB

```cpp
class LEVELDB_EXPORT Snapshot {
 protected:
  virtual ~Snapshot();
};
```

<!-- more -->

### Range

表示一个范围的key
包括开始和结束
TODO:目前不确定它的边界是否包含

```cpp
// A range of keys
struct LEVELDB_EXPORT Range {
  Slice start;          // Included in the range
  Slice limit;          // Not included in the range

  Range() { }
  Range(const Slice& s, const Slice& l) : start(s), limit(l) { }
};
```

### DB

数据库接口类
内部没有属性
只提供方法调用

- `Open`,打开数据库
```cpp
static Status Open(const Options& options,
                     const std::string& name,
                     DB** dbptr);
```
- `DB() = default;`,提供默认构造函数
- `DB(const DB&) = delete;`,禁用拷贝构造函数
- `DB& operator=(const DB&) = delete;`,禁用赋值构造函数
- `virtual ~DB();`,析构函数
- 接口
	- `Put`,需要实现的设置键值对的接口
```cpp
virtual Status Put(const WriteOptions& options,
                     const Slice& key,
                     const Slice& value) = 0;
```
	- `virtual Status Delete(const WriteOptions& options, const Slice& key) = 0;`,待实现的删除key的接口(删除不存在的key规定不会报错,为正常操作)
	- `virtual Status Write(const WriteOptions& options, WriteBatch* updates) = 0;`,批量修改数据库数据(TODO:应该是批量插入(包含修改)和删除,不确定)
	- `Get`,获取指定key的值,可能会返回各种错误
```cpp
virtual Status Get(const ReadOptions& options,
                     const Slice& key, std::string* value) = 0;
```
	- `virtual Iterator* NewIterator(const ReadOptions& options) = 0;`,新建一个该数据库的迭代器,有几点需要注意的
		- 新返回的迭代器在使用前必须手动调用对应的`Seek`函数来初始化
		- 必须在DB被删除前手动删除迭代器
	- `virtual const Snapshot* GetSnapshot() = 0;`,获取一个当前db的snapshot
		- TODO:上面的迭代器应该都是通过这个snapshot来创建出来的(这个不确定)
		- 必须手动调用`ReleaseSnapshot`来释放快照
	- `virtual void ReleaseSnapshot(const Snapshot* snapshot) = 0;`,释放指定的快照,释放后不能使用被释放的快照内容了
	- `virtual bool GetProperty(const Slice& property, std::string* value) = 0;`,可以获得数据库的一些基本属性信息
	- `GetApproximateSizes`,获取[0,n-1]层等指定范围的key数据所占用的硬盘空间的大概(不是精确值)空间尺寸,这里获得的是硬盘占用尺寸,而不是数据实际大小,压缩数据会影响这个值
```cpp
virtual void GetApproximateSizes(const Range* range, int n,
                                   uint64_t* sizes) = 0;
```
	- `virtual void CompactRange(const Slice* begin, const Slice* end) = 0;`,加锁指定范围的key数据,优化空间,删除无效或者重复key数据,接口应该只被底层实现者调用,范围参数如果为nullptr则表示最开始或者最终点,都是nullptr则表示整个数据库

## 全局函数

- `DestroyDB`,删库(TODO:估计是硬盘数据),危险函数
```cpp
LEVELDB_EXPORT Status DestroyDB(const std::string& name,
                                const Options& options);
```
- `RepairDB`,如果数据库无法正常打开,可以使用这个接口修复尽可能多的数据(部分数据会丢失),所以对重要数据库使用前需要谨慎处理
```cpp
LEVELDB_EXPORT Status RepairDB(const std::string& dbname,
                               const Options& options);
```
