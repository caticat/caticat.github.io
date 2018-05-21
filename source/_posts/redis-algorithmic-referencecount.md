---
title: Redis算法 引用计数
tags:
  - redis
  - algorithmic
categories: redis
date: 2018-05-21 17:05:07
---

Redis的内存回收算法采用
引用计数算法
通过增减对象的引用计数来判断
是否需要回收对象的内存

- 优点
	- 代码逻辑清晰
	- 不会有集中清理数据时造成的假死现象
- 缺点
	- 无法解决循环引用问题(无视弱指针吧)
	- 增加/减少引用数时的函数要对称,不能漏掉(c里面没有构造析构函数)

<!-- more -->

## 引用计数算法

```c
// 数据结构
typedef struct redisObject {
    unsigned type:4;
    unsigned encoding:4;
    unsigned lru:LRU_BITS; /* lru time (relative to server.lruclock) */
    int refcount; // 引用计数器
    void *ptr;
} robj;

// 创建对象
// 引用数为1
robj *createObject(int type, void *ptr) {
    robj *o = zmalloc(sizeof(*o));
    o->type = type;
    o->encoding = OBJ_ENCODING_RAW;
    o->ptr = ptr;
    o->refcount = 1;

    /* Set the LRU to the current lruclock (minutes resolution). */
    o->lru = LRU_CLOCK();
    return o;
}

// 增加引用数
void incrRefCount(robj *o) {
    o->refcount++;
}

// 减少引用数
// 当引用数为0时,释放内存
void decrRefCount(robj *o) {
    if (o->refcount <= 0) serverPanic("decrRefCount against refcount <= 0");
    if (o->refcount == 1) {
        switch(o->type) {
        case OBJ_STRING: freeStringObject(o); break;
        case OBJ_LIST: freeListObject(o); break;
        case OBJ_SET: freeSetObject(o); break;
        case OBJ_ZSET: freeZsetObject(o); break;
        case OBJ_HASH: freeHashObject(o); break;
        default: serverPanic("Unknown object type"); break;
        }
        zfree(o);
    } else {
        o->refcount--;
    }
}
```
