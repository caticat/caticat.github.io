---
title: leveldb源码阅读-options
tags:
  - leveldb
  - source
  - database
categories: leveldb
date: 2019-02-15 17:10:50
---

## 功能

配置文件统一的文件
配置文件因为比较常用,紧接着会补齐配置文件中的TODO内容,
把各个参数的作用都理解和写清楚

## 源文件

`options.h`
`util/options.cc`

## CompressionType

db包含了一组set的block
block是用于存储连续键值对的
block是从硬盘读取到内存的单个最小单位
block最终会存储在file文件中
block在存储在file中前,
可能会使用某种方法进行压缩处理,
这个枚举是用于表示block采取了那种压缩方法的

```cpp
enum CompressionType {
  // NOTE: do not change the values of existing entries, as these are
  // part of the persistent format on disk.
  kNoCompression     = 0x0,
  kSnappyCompression = 0x1
};
```

<!-- more -->

## Options

统一的参数配置存储结构类
用于`DB::Open`函数
没有什么接口
只有一个构造函数
和一套配置属性

### 构造函数

所有属性的初始值可以从构造函数中得出

```cpp
Options::Options()
    : comparator(BytewiseComparator()),
      create_if_missing(false),
      error_if_exists(false),
      paranoid_checks(false),
      env(Env::Default()),
      info_log(nullptr),
      write_buffer_size(4<<20),
      max_open_files(1000),
      block_cache(nullptr),
      block_size(4096),
      block_restart_interval(16),
      max_file_size(2<<20),
      compression(kSnappyCompression),
      reuse_logs(false),
      filter_policy(nullptr) {
}
```

### 属性

- 行为属性
	- `const Comparator* comparator;`,比较器,用于key排序用,必须保证这个排序和上次数据库存储时用的排序器是一致的,否则会出现取数据取不到等等各种问题.默认是按照字典规则排序的
	- `bool create_if_missing;`,当数据库不存在时,是否创建数据库
	- `bool error_if_exists;`,设置为真时,当数据库已经存在则报错
	- `bool paranoid_checks;`,是否开启完整检查(TODO:不是很清晰检查的内容),只要发现一点错误,整个数据库都不可读取
	- `Env* env;`,环境(TODO:不理解作用)
	- `Logger* info_log;`,日志系统,如果为空,则记录在数据库文件同目录下,否则记录在提供的日志系统中
- 性能属性
	- `size_t write_buffer_size;`,变成有序列表存储于磁盘前,在内存中的数据块大小(同时会同步在磁盘上的未排序日志上记录),同时最多会有2个这样的缓冲区
	- `int max_open_files;`,数据库最大可以同时打开的文件数量,假定每个文件大小为2MB(TODO:不确定超出这个数量会怎么样)
	- `Cache* block_cache;`,用于存储内存中的block的集合结构,默认会自动创建一个8MB的缓存结构
	- `size_t block_size;`,近似的block大小(这里是未压缩的数据的尺寸,压缩后存储在硬盘上的数据应该会更小)
	- `int block_restart_interval;`,记录key的变化数量,同时和这个值比较,当超过这个值时,开启压缩(TODO:这个功能不是很理解,待深入查看)
	- `size_t max_file_size;`,硬盘单文件存储最大尺寸,当文件尺寸小于这个值时,不会使用新文件存储数据
	- `CompressionType compression;`,存储block的压缩算法类型
	- `bool reuse_logs;`,开启数据库时,是否使用以前的`MANIFEST`和log文件进行载入优化
	- `const FilterPolicy* filter_policy;`,是否开启过滤器功能

## ReadOptions

读取数据时使用的option

### 构造函数

```cpp
  ReadOptions()
      : verify_checksums(false),
        fill_cache(true),
        snapshot(nullptr) {
  }
```

### 属性

- `bool verify_checksums;`,是否所有数据读取都要校验checksum
- `bool fill_cache;`,是否将读到的数据放在cashe中(遍历数据时一般应该设置为false)
- `const Snapshot* snapshot;`,如果为空,则自动创建一个,否则使用参数提供的(必须是可用的snapshot)

## WriteOptions

写数据时使用的option

### 构造函数

```cpp
  WriteOptions()
      : sync(false) {
  }
```

### 属性

- `bool sync;`,是否立刻将数据写入到硬盘文件中(不立刻写入的话,在机器重启的时候会丢数据(但是当进程宕机的话,是不会丢数据的,就是有没有立刻调用`fsync`函数的区别))
