---
title: Redis 源码分析-intset
tags:
  - redis
  - database
categories:
  - redis
  - source
date: 2018-05-04 11:44:36
---

set的一种优化数据结构
试用于元素数量较少
元素类型为int16_t,int32_t,int64_t
的情况
本质是uint8_t[]
set的编码会根据内容元素自动变更
不需要手动变更编码
从小到大递增排序

## 相关文件

- intset.h
- intset.c

<!-- more -->

## 相关概念

- rand
    随机数生成
    范围:0-RAND_MAX
    RAND_MAX:系统相关,至少为32767
- 大小端
    - 大端
        高位字节存放在内存的低位地址中
        就是和阅读顺序一致,高位放在前面的低位地址中
    - 小端
        低位字节存放在内存的低位地址中
    - 网络字节序
        就是大端字节序
    - 本地字节序
        根据机器不同而不同

## 数据结构

```c
typedef struct intset {
    uint32_t encoding; // 编码长度(就是sizeof(类型))
    uint32_t length; // 元素个数,不是占用字节数
    int8_t contents[]; // 实际数据存储结构
} intset;
```

## 主要宏

```c
/* Note that these encodings are ordered, so:
 * INTSET_ENC_INT16 < INTSET_ENC_INT32 < INTSET_ENC_INT64. */
#define INTSET_ENC_INT16 (sizeof(int16_t))
#define INTSET_ENC_INT32 (sizeof(int32_t))
#define INTSET_ENC_INT64 (sizeof(int64_t))
```

## 函数分析

### `static uint8_t _intsetValueEncoding(int64_t v);`

#### 功能

判断存储v需要的编码类型长度

#### 源码

```c
/* Return the required encoding for the provided value. */
static uint8_t _intsetValueEncoding(int64_t v) {
    if (v < INT32_MIN || v > INT32_MAX)
        return INTSET_ENC_INT64;
    else if (v < INT16_MIN || v > INT16_MAX)
        return INTSET_ENC_INT32;
    else
        return INTSET_ENC_INT16;
}
```

### `static int64_t _intsetGetEncoded(intset *is, int pos, uint8_t enc);`

#### 功能

根据指定编码获取intset的指定位置的值

#### 源码

```c
/* Return the value at pos, given an encoding. */
static int64_t _intsetGetEncoded(intset *is, int pos, uint8_t enc) {
    int64_t v64;
    int32_t v32;
    int16_t v16;

    if (enc == INTSET_ENC_INT64) {
        memcpy(&v64,((int64_t*)is->contents)+pos,sizeof(v64));
        memrev64ifbe(&v64);
        return v64;
    } else if (enc == INTSET_ENC_INT32) {
        memcpy(&v32,((int32_t*)is->contents)+pos,sizeof(v32));
        memrev32ifbe(&v32);
        return v32;
    } else {
        memcpy(&v16,((int16_t*)is->contents)+pos,sizeof(v16));
        memrev16ifbe(&v16);
        return v16;
    }
}
```

### `static int64_t _intsetGet(intset *is, int pos);`

#### 功能

根据intset的编码类型获取指定位置的值

#### 源码

```c
/* Return the value at pos, using the configured encoding. */
static int64_t _intsetGet(intset *is, int pos) {
    return _intsetGetEncoded(is,pos,intrev32ifbe(is->encoding));
}
```

### `static void _intsetSet(intset *is, int pos, int64_t value);`

#### 功能

根据intset的编码类型设置指定位置的值

#### 源码

```c
/* Set the value at pos, using the configured encoding. */
static void _intsetSet(intset *is, int pos, int64_t value) {
    uint32_t encoding = intrev32ifbe(is->encoding);

    if (encoding == INTSET_ENC_INT64) {
        ((int64_t*)is->contents)[pos] = value;
        memrev64ifbe(((int64_t*)is->contents)+pos);
    } else if (encoding == INTSET_ENC_INT32) {
        ((int32_t*)is->contents)[pos] = value;
        memrev32ifbe(((int32_t*)is->contents)+pos);
    } else {
        ((int16_t*)is->contents)[pos] = value;
        memrev16ifbe(((int16_t*)is->contents)+pos);
    }
}
```

### `intset *intsetNew(void);`

#### 功能

创建一个空的intset

#### 源码

```c
/* Create an empty intset. */
intset *intsetNew(void) {
    intset *is = zmalloc(sizeof(intset)); // 申请内存
    is->encoding = intrev32ifbe(INTSET_ENC_INT16); // 设置默认编码
    is->length = 0; // 设置初始长度
    return is;
}
```

### `static intset *intsetResize(intset *is, uint32_t len);`

#### 功能

为intset重新分配内存大小

#### 源码

```c
/* Resize the intset */
static intset *intsetResize(intset *is, uint32_t len) {
    uint32_t size = len*intrev32ifbe(is->encoding); // 获取默认编码对应的所有数据的长度
    is = zrealloc(is,sizeof(intset)+size); // 变更内存大小
    return is;
}
```

### `static uint8_t intsetSearch(intset *is, int64_t value, uint32_t *pos);`

#### 功能

查找value在intset的位置
返回是否找到
pos指针为value的位置或可以插入到的位置

#### 源码

```c
/* Search for the position of "value". Return 1 when the value was found and
 * sets "pos" to the position of the value within the intset. Return 0 when
 * the value is not present in the intset and sets "pos" to the position
 * where "value" can be inserted. */
static uint8_t intsetSearch(intset *is, int64_t value, uint32_t *pos) {
    int min = 0, max = intrev32ifbe(is->length)-1, mid = -1;
    int64_t cur = -1;

    /* The value can never be found when the set is empty */
    if (intrev32ifbe(is->length) == 0) { // 空集合
        if (pos) *pos = 0; // 没有找到
        return 0; // 没有找到
    } else {
        /* Check for the case where we know we cannot find the value,
         * but do know the insert position. */
        if (value > _intsetGet(is,intrev32ifbe(is->length)-1)) { // 值如果大于最大值
            if (pos) *pos = intrev32ifbe(is->length); // 可以直接添加到数组末尾
            return 0; // 没有找到
        } else if (value < _intsetGet(is,0)) { // 比最小的小
            if (pos) *pos = 0; // 可以插入到最前面
            return 0; // 没有找到
        }
    }

    while(max >= min) { // 二分法查找value的pos
        mid = ((unsigned int)min + (unsigned int)max) >> 1; // 取到中间值位置
        cur = _intsetGet(is,mid); // 获取中间的值
        if (value > cur) {
            min = mid+1;
        } else if (value < cur) {
            max = mid-1;
        } else {
            break;
        }
    }

    if (value == cur) { // 找到了
        if (pos) *pos = mid; // 设置找到的位置
        return 1; // 找到了
    } else {
        if (pos) *pos = min; // 设置可以插入的位置
        return 0; // 没找到
    }
}
```

### `static intset *intsetUpgradeAndAdd(intset *is, int64_t value);`

#### 功能

当编码类型发生扩大时调用,
整体扩展intset的所有数据到更大的数据编码
并将value的值插入到intset的开头或结尾
必然在开头或结尾的原因是大的数据结构的取值范围一定大于小的数据结构
所以整数肯定在最后,负数肯定在起始位置

#### 源码

```c
/* Upgrades the intset to a larger encoding and inserts the given integer. */
static intset *intsetUpgradeAndAdd(intset *is, int64_t value) {
    uint8_t curenc = intrev32ifbe(is->encoding); // 获取当前编码
    uint8_t newenc = _intsetValueEncoding(value); // 获取新编码
    int length = intrev32ifbe(is->length); // 获取原始长度
    int prepend = value < 0 ? 1 : 0; // 是插入在前面还是插入在最后(负数在前面,正数在后面)

    /* First set new encoding and resize */
    is->encoding = intrev32ifbe(newenc); // 设置新编码
    is = intsetResize(is,intrev32ifbe(is->length)+1); // 调整intset的容量

    /* Upgrade back-to-front so we don't overwrite values.
     * Note that the "prepend" variable is used to make sure we have an empty
     * space at either the beginning or the end of the intset. */
    while(length--) // 按照从后向前的顺序遍历移动每个元素(倒序的原因是不会覆盖没有移动的数据)
        _intsetSet(is,length+prepend,_intsetGetEncoded(is,length,curenc)); // 将原数据移动到新位置

    /* Set the value at the beginning or the end. */
    if (prepend) // 是否插入在前面
        _intsetSet(is,0,value); // 插入在前面
    else
        _intsetSet(is,intrev32ifbe(is->length),value); // 插入在后面
    is->length = intrev32ifbe(intrev32ifbe(is->length)+1); // 更新长度
    return is; // 返回新的intset指针
}
```

### `static void intsetMoveTail(intset *is, uint32_t from, uint32_t to);`

#### 功能

将intset的连续内存地址从from开始到数据结尾移动到to的位置
就是为插入/删除数据操作封装的移动数据的接口

#### 源码

```c
static void intsetMoveTail(intset *is, uint32_t from, uint32_t to) {
    void *src, *dst;
    uint32_t bytes = intrev32ifbe(is->length)-from; // 获取到总共要移动多少个元素
    uint32_t encoding = intrev32ifbe(is->encoding); // 获取当前编码

    if (encoding == INTSET_ENC_INT64) { // 统计起始位置,目标位置,总共移动的字节数
        src = (int64_t*)is->contents+from;
        dst = (int64_t*)is->contents+to;
        bytes *= sizeof(int64_t);
    } else if (encoding == INTSET_ENC_INT32) {
        src = (int32_t*)is->contents+from;
        dst = (int32_t*)is->contents+to;
        bytes *= sizeof(int32_t);
    } else {
        src = (int16_t*)is->contents+from;
        dst = (int16_t*)is->contents+to;
        bytes *= sizeof(int16_t);
    }
    memmove(dst,src,bytes); // 移动内存数据
}
```

### `intset *intsetAdd(intset *is, int64_t value, uint8_t *success);`

#### 功能

添加一个新的值
success:成功失败
返回新的intset指针

#### 源码

```c
/* Insert an integer in the intset */
intset *intsetAdd(intset *is, int64_t value, uint8_t *success) {
    uint8_t valenc = _intsetValueEncoding(value); // 获取新的值的编码
    uint32_t pos;
    if (success) *success = 1; // 初始标记为成功

    /* Upgrade encoding if necessary. If we need to upgrade, we know that
     * this value should be either appended (if > 0) or prepended (if < 0),
     * because it lies outside the range of existing values. */
    if (valenc > intrev32ifbe(is->encoding)) { // 数据编码超出当前intset编码范围
        /* This always succeeds, so we don't need to curry *success. */
        return intsetUpgradeAndAdd(is,value); // 扩展intset编码并插入数据
    } else {
        /* Abort if the value is already present in the set.
         * This call will populate "pos" with the right position to insert
         * the value when it cannot be found. */
        if (intsetSearch(is,value,&pos)) { // 查找是否已经存在这个值并获取可插入的位置
            if (success) *success = 0; // 已经存在,则插入失败
            return is; // 返回原始intset地址
        }

        is = intsetResize(is,intrev32ifbe(is->length)+1); // 扩展容量
        if (pos < intrev32ifbe(is->length)) intsetMoveTail(is,pos,pos+1); // 插入位置不是结尾的话,所有插入位置之后的数据需要向后移动
    }

    _intsetSet(is,pos,value); // 在指定位置插入数据
    is->length = intrev32ifbe(intrev32ifbe(is->length)+1); // 扩展intset的长度
    return is; // 返回新的intset指针
}
```

### `intset *intsetRemove(intset *is, int64_t value, int *success);`

#### 功能

删除value的值
success表示是否成功

#### 源码

```c
/* Delete integer from intset */
intset *intsetRemove(intset *is, int64_t value, int *success) {
    uint8_t valenc = _intsetValueEncoding(value); // 获取元素编码
    uint32_t pos;
    if (success) *success = 0;

    if (valenc <= intrev32ifbe(is->encoding) && intsetSearch(is,value,&pos)) { // 判断元素编码是否在intset编码范围内,同时可以查找到指定的值
        uint32_t len = intrev32ifbe(is->length); // 获取到intset的元素个数

        /* We know we can delete */
        if (success) *success = 1; // 标记删除成功

        /* Overwrite value with tail and update length */
        if (pos < (len-1)) intsetMoveTail(is,pos+1,pos); // 直接移动数据覆盖以前的value值
        is = intsetResize(is,len-1); // 缩小intset容量
        is->length = intrev32ifbe(len-1); // 记录intset长度
    }
    return is; // 返回新的intset指针
}
```

### `uint8_t intsetFind(intset *is, int64_t value);`

#### 功能

查找值是否在intset中

#### 源码

```c
/* Determine whether a value belongs to this set */
uint8_t intsetFind(intset *is, int64_t value) {
    uint8_t valenc = _intsetValueEncoding(value); // 获取编码
    return valenc <= intrev32ifbe(is->encoding) && intsetSearch(is,value,NULL); // 判断值的编码在intset范围内,并且可以找到这个值
}
```

### `int64_t intsetRandom(intset *is);`

#### 功能

获取随机的元素

#### 源码

```c
/* Return random member */
int64_t intsetRandom(intset *is) {
    return _intsetGet(is,rand()%intrev32ifbe(is->length));
}
```

### `uint8_t intsetGet(intset *is, uint32_t pos, int64_t *value)`

#### 功能

获取intset指定位置的值
返回成功失败

#### 源码

```c
/* Sets the value to the value at the given position. When this position is
 * out of range the function returns 0, when in range it returns 1. */
uint8_t intsetGet(intset *is, uint32_t pos, int64_t *value) {
    if (pos < intrev32ifbe(is->length)) {
        *value = _intsetGet(is,pos);
        return 1;
    }
    return 0;
}
```

### `uint32_t intsetLen(intset *is);`

#### 功能

获取intset的数据个数

#### 源码

```c
/* Return intset length */
uint32_t intsetLen(intset *is) {
    return intrev32ifbe(is->length);
}
```

### `size_t intsetBlobLen(intset *is);`

#### 功能

获取intset的占用内存空间
全部空间(结构体大小+数据量大小)

#### 源码

```c
/* Return intset blob size in bytes. */
size_t intsetBlobLen(intset *is) {
    return sizeof(intset)+intrev32ifbe(is->length)*intrev32ifbe(is->encoding);
}
```
