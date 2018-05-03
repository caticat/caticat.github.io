---
title: Redis 源码分析-哈希表
tags:
  - redis
  - database
categories:
  - redis
  - source
date: 2018-05-03 16:37:25
---

本质是链表
dict本身包含一个长度是2的链表数组
原因:
	- 减少rehashing过程中阻塞操作的时常
	- 可以方便的rehash,提高hash表效率

## 相关文件

- dict.h
- dict.c

<!-- more -->

## 相关概念

- hash函数算法
- 函数指针

## 数据结构

```c
typedef struct dictEntry { // 元素的实体类
    void *key; // 键
    union {
        void *val;
        uint64_t u64;
        int64_t s64;
        double d;
    } v; // 值
    struct dictEntry *next; // 下个元素
} dictEntry;

typedef struct dictType { // 字典类型(接口)
    unsigned int (*hashFunction)(const void *key); // hash运算函数指针
    void *(*keyDup)(void *privdata, const void *key); // 键复制函数指针
    void *(*valDup)(void *privdata, const void *obj); // 值复制函数指针
    int (*keyCompare)(void *privdata, const void *key1, const void *key2); // 键比较函数指针
    void (*keyDestructor)(void *privdata, void *key); // 键删除函数指针
    void (*valDestructor)(void *privdata, void *obj); // 值删除函数指针
} dictType;

/* This is our hash table structure. Every dictionary has two of this as we
 * implement incremental rehashing, for the old to the new table. */
typedef struct dictht { // 包含dict的元素的数据结构(单个实例)
    dictEntry **table; // 元素数组
    unsigned long size; // 容量
    unsigned long sizemask; // 取余数计算数组索引用(值:容量-1)
    unsigned long used; // 使用数量
} dictht;

typedef struct dict { // dict数据结构
    dictType *type; // 操作接口类型(提供各种操作函数实现)
    void *privdata; // 初始的私有数据(初始化时设置)
    dictht ht[2]; // dict实际数据,0:主数据;1:rehash时操作的缓存数据
    long rehashidx; /* rehashing not in progress if rehashidx == -1 */ // rehash的数组下标索引(-1:没有在rehashing)
    int iterators; /* number of iterators currently running */ // 当前正在使用的安全的迭代器数量(安全的迭代器:可以进行添加删除操作的迭代器)
} dict;

/* If safe is set to 1 this is a safe iterator, that means, you can call
 * dictAdd, dictFind, and other functions against the dictionary even while
 * iterating. Otherwise it is a non safe iterator, and only dictNext()
 * should be called while iterating. */
typedef struct dictIterator { // dict的迭代器
    dict *d; // 迭代的dict
    long index; // 当前迭代的数组下标
    int table, safe; // ht的索引, 是否是安全迭代器
    dictEntry *entry, *nextEntry; // 当前返回的元素指针,下一个元素指针(因为可能会删除当前元素指针进而找不到下一个元素指针)
    /* unsafe iterator fingerprint for misuse detection. */
    long long fingerprint; // 非安全迭代器校验用指纹(计算方法:ht[2]的指针+size+used计算的一个64位长度的值)(校验方法:使用前和使用后做指纹比较,一旦不同则是使用过程中有非安全的操作)
} dictIterator;
```

## 主要宏

```c
/* This is the initial size of every hash table */
#define DICT_HT_INITIAL_SIZE     4 // 所有dict的初始尺寸

/* ------------------------------- Macros ------------------------------------*/
#define dictFreeVal(d, entry) \ // 释放值
    if ((d)->type->valDestructor) \
        (d)->type->valDestructor((d)->privdata, (entry)->v.val)

#define dictSetVal(d, entry, _val_) do { \ // 设置值
    if ((d)->type->valDup) \
        entry->v.val = (d)->type->valDup((d)->privdata, _val_); \
    else \
        entry->v.val = (_val_); \
} while(0)

#define dictSetSignedIntegerVal(entry, _val_) \ // 设置int64值
    do { entry->v.s64 = _val_; } while(0)

#define dictSetUnsignedIntegerVal(entry, _val_) \ // 设置uint64值
    do { entry->v.u64 = _val_; } while(0)

#define dictSetDoubleVal(entry, _val_) \ // 设置double值
    do { entry->v.d = _val_; } while(0)

#define dictFreeKey(d, entry) \ // 释放键
    if ((d)->type->keyDestructor) \
        (d)->type->keyDestructor((d)->privdata, (entry)->key)

#define dictSetKey(d, entry, _key_) do { \ // 设置键
    if ((d)->type->keyDup) \
        entry->key = (d)->type->keyDup((d)->privdata, _key_); \
    else \
        entry->key = (_key_); \
} while(0)

#define dictCompareKeys(d, key1, key2) \ // 比较键
    (((d)->type->keyCompare) ? \
        (d)->type->keyCompare((d)->privdata, key1, key2) : \
        (key1) == (key2))

#define dictHashKey(d, key) (d)->type->hashFunction(key) // 计算键的hash值
#define dictGetKey(he) ((he)->key) // 获取键
#define dictGetVal(he) ((he)->v.val) // 获取值
#define dictGetSignedIntegerVal(he) ((he)->v.s64) // 获取int64值
#define dictGetUnsignedIntegerVal(he) ((he)->v.u64) // 获取uint64值
#define dictGetDoubleVal(he) ((he)->v.d) // 获取double值
#define dictSlots(d) ((d)->ht[0].size+(d)->ht[1].size) // 获取dict的所有容量
#define dictSize(d) ((d)->ht[0].used+(d)->ht[1].used) // 获取dict的所有已使用键值对数量
#define dictIsRehashing(d) ((d)->rehashidx != -1) // 是否在rehash过程中
```

## hash算法

```c
/* Thomas Wang's 32 bit Mix Function */
unsigned int dictIntHashFunction(unsigned int key)
{
    key += ~(key << 15);
    key ^=  (key >> 10);
    key +=  (key << 3);
    key ^=  (key >> 6);
    key += ~(key << 11);
    key ^=  (key >> 16);
    return key;
}

/* MurmurHash2, by Austin Appleby
 * Note - This code makes a few assumptions about how your machine behaves -
 * 1. We can read a 4-byte value from any address without crashing
 * 2. sizeof(int) == 4
 *
 * And it has a few limitations -
 *
 * 1. It will not work incrementally.
 * 2. It will not produce the same results on little-endian and big-endian
 *    machines.
 */
unsigned int dictGenHashFunction(const void *key, int len) {
    /* 'm' and 'r' are mixing constants generated offline.
     They're not really 'magic', they just happen to work well.  */
    uint32_t seed = dict_hash_function_seed;
    const uint32_t m = 0x5bd1e995;
    const int r = 24;

    /* Initialize the hash to a 'random' value */
    uint32_t h = seed ^ len;

    /* Mix 4 bytes at a time into the hash */
    const unsigned char *data = (const unsigned char *)key;

    while(len >= 4) {
        uint32_t k = *(uint32_t*)data;

        k *= m;
        k ^= k >> r;
        k *= m;

        h *= m;
        h ^= k;

        data += 4;
        len -= 4;
    }

    /* Handle the last few bytes of the input array  */
    switch(len) {
    case 3: h ^= data[2] << 16;
    case 2: h ^= data[1] << 8;
    case 1: h ^= data[0]; h *= m;
    };

    /* Do a few final mixes of the hash to ensure the last few
     * bytes are well-incorporated. */
    h ^= h >> 13;
    h *= m;
    h ^= h >> 15;

    return (unsigned int)h;
}

/* And a case insensitive hash function (based on djb hash) */
unsigned int dictGenCaseHashFunction(const unsigned char *buf, int len) {
    unsigned int hash = (unsigned int)dict_hash_function_seed;

    while (len--)
        hash = ((hash << 5) + hash) + (tolower(*buf++)); /* hash * 33 + c */
    return hash;
}
```

## 函数分析

### `dict *dictCreate(dictType *type, void *privDataPtr);`

#### 功能

创建空dict

#### 源码

```c
/* Create a new hash table */
dict *dictCreate(dictType *type,
        void *privDataPtr)
{
    dict *d = zmalloc(sizeof(*d)); // 申请地址

    _dictInit(d,type,privDataPtr); // 初始化dict
    return d;
}
```

### `int dictExpand(dict *d, unsigned long size);`

#### 功能

变更dict的容量
size:可容纳键值对的数量

#### 源码

```c
/* Expand or create the hash table */
int dictExpand(dict *d, unsigned long size)
{
    dictht n; /* the new hash table */
    unsigned long realsize = _dictNextPower(size); // 根据size计算实际需要的容量(为2的指数)

    /* the size is invalid if it is smaller than the number of
     * elements already inside the hash table */
    if (dictIsRehashing(d) || d->ht[0].used > size) // 重新hash过程中不能扩展,低于已使用的值无效
        return DICT_ERR;

    /* Rehashing to the same table size is not useful. */
    if (realsize == d->ht[0].size) return DICT_ERR; // 尺寸无变化,不处理

    /* Allocate the new hash table and initialize all pointers to NULL */
    n.size = realsize;
    n.sizemask = realsize-1;
    n.table = zcalloc(realsize*sizeof(dictEntry*)); // 申请数据内存
    n.used = 0;

    /* Is this the first initialization? If so it's not really a rehashing
     * we just set the first hash table so that it can accept keys. */
    if (d->ht[0].table == NULL) { // #0ht为空,则是全新的dict,直接初始化设置即可
        d->ht[0] = n;
        return DICT_OK;
    }

    /* Prepare a second hash table for incremental rehashing */
    d->ht[1] = n; // #1设置为新的ht,为后续rehash做准备
    d->rehashidx = 0; // 标记为开始rehash状态,并且索引为0
    return DICT_OK;
}
```

### `int dictAdd(dict *d, void *key, void *val);`

#### 功能

向dict中添加键值对

#### 源码

```c
/* Add an element to the target hash table */
int dictAdd(dict *d, void *key, void *val)
{
    dictEntry *entry = dictAddRaw(d,key); // 尝试向dict中添加一个key,成功后返回entry,失败返回NULL

    if (!entry) return DICT_ERR; // 添加失败了
    dictSetVal(d, entry, val); // 设置新添加的entry的值
    return DICT_OK; // 返回成功
}
```

### `dictEntry *dictAddRaw(dict *d, void *key);`

#### 功能

向dict中添加键

#### 源码

```c
/* Low level add. This function adds the entry but instead of setting
 * a value returns the dictEntry structure to the user, that will make
 * sure to fill the value field as he wishes.
 *
 * This function is also directly exposed to the user API to be called
 * mainly in order to store non-pointers inside the hash value, example:
 *
 * entry = dictAddRaw(dict,mykey);
 * if (entry != NULL) dictSetSignedIntegerVal(entry,1000);
 *
 * Return values:
 *
 * If key already exists NULL is returned.
 * If key was added, the hash entry is returned to be manipulated by the caller.
 */
dictEntry *dictAddRaw(dict *d, void *key)
{
    int index;
    dictEntry *entry;
    dictht *ht;

    if (dictIsRehashing(d)) _dictRehashStep(d); // 如果是在rehash过程中,则rehash一个slot的链表(就是将ht[0]的一个索引的内容迁移到ht[1]中)

    /* Get the index of the new element, or -1 if
     * the element already exists. */
    if ((index = _dictKeyIndex(d, key)) == -1) // 获取到key新插入的索引位置(-1:已经插入过了)
        return NULL;

    /* Allocate the memory and store the new entry.
     * Insert the element in top, with the assumption that in a database
     * system it is more likely that recently added entries are accessed
     * more frequently. */
    ht = dictIsRehashing(d) ? &d->ht[1] : &d->ht[0]; // 如果是在rehash过程中,则直接插入新的ht[1]中,否则插入ht[0]
    entry = zmalloc(sizeof(*entry)); // 申请内存
    entry->next = ht->table[index]; // 插入到链表开头(通用假定:新插入的数据使用频率更高,所以放在最前面)
    ht->table[index] = entry; // 链表原始数据后移
    ht->used++; // 记录已插入的条目数

    /* Set the hash entry fields. */
    dictSetKey(d, entry, key); // entry设置key的值
    return entry;
}
```

### `int dictReplace(dict *d, void *key, void *val);`

#### 功能

插入/更新键值对
返回是否是插入
0:更新
1:插入

#### 源码

```c
/* Add an element, discarding the old if the key already exists.
 * Return 1 if the key was added from scratch, 0 if there was already an
 * element with such key and dictReplace() just performed a value update
 * operation. */
int dictReplace(dict *d, void *key, void *val)
{
    dictEntry *entry, auxentry;

    /* Try to add the element. If the key
     * does not exists dictAdd will suceed. */
    if (dictAdd(d, key, val) == DICT_OK) // 添加成功
        return 1;
    /* It already exists, get the entry */
    entry = dictFind(d, key); // 找到原有值
    /* Set the new value and free the old one. Note that it is important
     * to do that in this order, as the value may just be exactly the same
     * as the previous one. In this context, think to reference counting,
     * you want to increment (set), and then decrement (free), and not the
     * reverse. */
    auxentry = *entry; // 复制原有值
    dictSetVal(d, entry, val); // 设置新值(这里的顺序是因为有一个引用记数的存在,当新旧值一样时,需要先增加后减少,否则可能出现减少后引用记数为0,增加时出现问题的情况)
    dictFreeVal(d, &auxentry); // 释放旧值
    return 0;
}
```

### `dictEntry *dictReplaceRaw(dict *d, void *key);`

#### 功能

从dict中获取到指定键的entry
可能是插入或更新

#### 源码

```c
/* dictReplaceRaw() is simply a version of dictAddRaw() that always
 * returns the hash entry of the specified key, even if the key already
 * exists and can't be added (in that case the entry of the already
 * existing key is returned.)
 *
 * See dictAddRaw() for more information. */
dictEntry *dictReplaceRaw(dict *d, void *key) {
    dictEntry *entry = dictFind(d,key); // 查找旧数据

    return entry ? entry : dictAddRaw(d,key); // 有旧数据就返回旧数据,否则返回新数据
}
```

### `int dictDelete(dict *d, const void *key);`

#### 功能

删除指定键
释放键值对内存空间

#### 源码

```c
int dictDelete(dict *ht, const void *key) {
    return dictGenericDelete(ht,key,0); // 删除指定键,参数0:释放键值对对应的内存空间
}
```

### `int dictDeleteNoFree(dict *d, const void *key);`

#### 功能

删除指定键
不释放键值对内存空间

#### 源码

```c
int dictDeleteNoFree(dict *ht, const void *key) {
    return dictGenericDelete(ht,key,1);
}
```

### `void dictRelease(dict *d);`

#### 功能

释放整个dict的所有数据

#### 源码

```c
/* Clear & Release the hash table */
void dictRelease(dict *d)
{
    _dictClear(d,&d->ht[0],NULL); // 清空主数据
    _dictClear(d,&d->ht[1],NULL); // 清空从数据
    zfree(d); // 释放dict内存
}
```

### `dictEntry * dictFind(dict *d, const void *key);`

#### 功能

查找键

#### 源码

```c
dictEntry *dictFind(dict *d, const void *key)
{
    dictEntry *he;
    unsigned int h, idx, table;

    if (d->ht[0].used + d->ht[1].used == 0) return NULL; /* dict is empty */ // 空dict
    if (dictIsRehashing(d)) _dictRehashStep(d); // 尝试rehash一个slot
    h = dictHashKey(d, key); // 获取键的hash值
    for (table = 0; table <= 1; table++) { // 遍历dict数据
        idx = h & d->ht[table].sizemask; // 获取对应的下标索引
        he = d->ht[table].table[idx]; // 获取到链表头数据
        while(he) { // 遍历链表
            if (key==he->key || dictCompareKeys(d, key, he->key)) // 匹配键
                return he; // 相同返回
            he = he->next; // 获取下一个数据
        }
        if (!dictIsRehashing(d)) return NULL; // 如果没有在rehash,则不存在ht[1],所以可以直接返回NULL
    }
    return NULL; // 没有找到,返回NULL
}
```

### `void *dictFetchValue(dict *d, const void *key);`

#### 功能

根据键直接找到值指针

#### 源码

```c
void *dictFetchValue(dict *d, const void *key) {
    dictEntry *he;

    he = dictFind(d,key); // 查找entry
    return he ? dictGetVal(he) : NULL; // 返回结果
}
```

### `int dictResize(dict *d);`

#### 功能

将dict占用内存缩小到最小的可用尺寸

#### 源码

```c
/* This is the initial size of every hash table */
#define DICT_HT_INITIAL_SIZE     4
/* Resize the table to the minimal size that contains all the elements,
 * but with the invariant of a USED/BUCKETS ratio near to <= 1 */
int dictResize(dict *d)
{
    int minimal;

    if (!dict_can_resize || dictIsRehashing(d)) return DICT_ERR;
    minimal = d->ht[0].used;
    if (minimal < DICT_HT_INITIAL_SIZE)
        minimal = DICT_HT_INITIAL_SIZE;
    return dictExpand(d, minimal);
}
```

### `dictIterator *dictGetIterator(dict *d);`

#### 功能

生成一个指定dict的迭代器
默认非安全

#### 源码

```c
dictIterator *dictGetIterator(dict *d)
{
    dictIterator *iter = zmalloc(sizeof(*iter));

    iter->d = d;
    iter->table = 0;
    iter->index = -1;
    iter->safe = 0;
    iter->entry = NULL;
    iter->nextEntry = NULL;
    return iter;
}
```

### `dictIterator *dictGetSafeIterator(dict *d);`

#### 功能

生成一个指定dict的迭代器
安全

#### 源码

```c
dictIterator *dictGetSafeIterator(dict *d) {
    dictIterator *i = dictGetIterator(d);

    i->safe = 1;
    return i;
}
```

### `dictEntry *dictNext(dictIterator *iter);`

#### 功能

根据迭代器
获取下一个dict的元素

#### 源码

```c
dictEntry *dictNext(dictIterator *iter)
{
    while (1) { // 死循环
        if (iter->entry == NULL) { // 迭代器没有元素
            dictht *ht = &iter->d->ht[iter->table]; // 获取到当前迭代的ht
            if (iter->index == -1 && iter->table == 0) { // 如果是第一次迭代(这两个条件只有在初始化时才满足)
                if (iter->safe) // 安全迭代器
                    iter->d->iterators++; // 增加dict的安全迭代器记数
                else // 非安全迭代器
                    iter->fingerprint = dictFingerprint(iter->d); // 生成指纹记录
            }
            iter->index++; // 增加索引
            if (iter->index >= (long) ht->size) { // 索引超过容量长度
                if (dictIsRehashing(iter->d) && iter->table == 0) { // 如果存在ht[1]的话
                    iter->table++; // 标记使用ht[1]
                    iter->index = 0; // 重置查询索引
                    ht = &iter->d->ht[1]; // 使用ht[1]
                } else {
                    break; // 遍历完成,没有其他数据了
                }
            }
            iter->entry = ht->table[iter->index]; // 记录当前找到的entry
        } else {
            iter->entry = iter->nextEntry; // 直接获取下一个entry
        }
        if (iter->entry) { // 如果查询到的entry存在
            /* We need to save the 'next' here, the iterator user
             * may delete the entry we are returning. */
            iter->nextEntry = iter->entry->next; // 记录下一个entry
            return iter->entry; // 返回查询到的entry
        }
    }
    return NULL; // 没有查询到,返回NULL
}
```

### `void dictReleaseIterator(dictIterator *iter);`

#### 功能

释放迭代器

#### 源码

```c
void dictReleaseIterator(dictIterator *iter)
{
    if (!(iter->index == -1 && iter->table == 0)) { // 是否是使用过的迭代器
        if (iter->safe) // 是否安全
            iter->d->iterators--; // 减少dict迭代器数量
        else
            assert(iter->fingerprint == dictFingerprint(iter->d)); // 断言指纹一致
    }
    zfree(iter);
}
```

### `dictEntry *dictGetRandomKey(dict *d);`

#### 功能

获取随机键
流程:
	1. 随机获取两个ht的总index
	2. 随机一个链表的索引

#### 源码

```c
/* Return a random entry from the hash table. Useful to
 * implement randomized algorithms */
dictEntry *dictGetRandomKey(dict *d)
{
    dictEntry *he, *orighe;
    unsigned int h;
    int listlen, listele;

    if (dictSize(d) == 0) return NULL; // 空dict直接返回NULL
    if (dictIsRehashing(d)) _dictRehashStep(d); // 递进rehash()
    if (dictIsRehashing(d)) { // 如果在rehashing中
        do {
            /* We are sure there are no elements in indexes from 0
             * to rehashidx-1 */
            h = d->rehashidx + (random() % (d->ht[0].size +
                                            d->ht[1].size -
                                            d->rehashidx)); // 合并ht[0]和ht[1]的索引并跳过ht[0]的空索引部分随机
            he = (h >= d->ht[0].size) ? d->ht[1].table[h - d->ht[0].size] :
                                      d->ht[0].table[h]; // 获取到entry
        } while(he == NULL); // 没有随机到有效数据时
    } else { // 正常状况
        do {
            h = random() & d->ht[0].sizemask; // 直接随机整个ht[0]
            he = d->ht[0].table[h]; // 获取到entry
        } while(he == NULL); // 没有随机到有效数据时
    }

    /* Now we found a non empty bucket, but it is a linked
     * list and we need to get a random element from the list.
     * The only sane way to do so is counting the elements and
     * select a random index. */
    listlen = 0;
    orighe = he;
    while(he) { // 统计链表长度
        he = he->next;
        listlen++;
    }
    listele = random() % listlen; // 随机索引
    he = orighe;
    while(listele--) he = he->next; // 遍历获取对应的entry
    return he; // 返回最终随机结果
}
```

### `unsigned int dictGetSomeKeys(dict *d, dictEntry **des, unsigned int count);`

#### 功能

获取到`count`个从一个随机键开始的连续元素
实际返回元素数<=count值
返回内容也不保证无重复

#### 源码

```c
/* This function samples the dictionary to return a few keys from random
 * locations.
 *
 * It does not guarantee to return all the keys specified in 'count', nor
 * it does guarantee to return non-duplicated elements, however it will make
 * some effort to do both things.
 *
 * Returned pointers to hash table entries are stored into 'des' that
 * points to an array of dictEntry pointers. The array must have room for
 * at least 'count' elements, that is the argument we pass to the function
 * to tell how many random elements we need.
 *
 * The function returns the number of items stored into 'des', that may
 * be less than 'count' if the hash table has less than 'count' elements
 * inside, or if not enough elements were found in a reasonable amount of
 * steps.
 *
 * Note that this function is not suitable when you need a good distribution
 * of the returned items, but only when you need to "sample" a given number
 * of continuous elements to run some kind of algorithm or to produce
 * statistics. However the function is much faster than dictGetRandomKey()
 * at producing N elements. */
unsigned int dictGetSomeKeys(dict *d, dictEntry **des, unsigned int count) {
    unsigned long j; /* internal hash table id, 0 or 1. */
    unsigned long tables; /* 1 or 2 tables? */
    unsigned long stored = 0, maxsizemask;
    unsigned long maxsteps;

    if (dictSize(d) < count) count = dictSize(d); // 整理实际可以获得的count数量
    maxsteps = count*10; // 最大循环次数,防止长时阻塞

    /* Try to do a rehashing work proportional to 'count'. */
    for (j = 0; j < count; j++) { // 步进rehash,count次
        if (dictIsRehashing(d))
            _dictRehashStep(d);
        else
            break;
    }

    tables = dictIsRehashing(d) ? 2 : 1; // 是否有ht[1]参与
    maxsizemask = d->ht[0].sizemask;
    if (tables > 1 && maxsizemask < d->ht[1].sizemask) // 获取最大的mask
        maxsizemask = d->ht[1].sizemask;

    /* Pick a random point inside the larger table. */
    unsigned long i = random() & maxsizemask; // 随机索引值
    unsigned long emptylen = 0; /* Continuous empty entries so far. */
    while(stored < count && maxsteps--) { // 存储数量不足并且没有达到最大步数的话
        for (j = 0; j < tables; j++) { // 遍历表
            /* Invariant of the dict.c rehashing: up to the indexes already
             * visited in ht[0] during the rehashing, there are no populated
             * buckets, so we can skip ht[0] for indexes between 0 and idx-1. */
            if (tables == 2 && j == 0 && i < (unsigned long) d->rehashidx) { // rehashing中ht[0]的0-rehashidx的索引都是空的,因为已经移动到ht[1]中了
                /* Moreover, if we are currently out of range in the second
                 * table, there will be no elements in both tables up to
                 * the current rehashing index, so we jump if possible.
                 * (this happens when going from big to small table). */
                if (i >= d->ht[1].size) i = d->rehashidx;
                continue;
            }
            if (i >= d->ht[j].size) continue; /* Out of range for this table. */
            dictEntry *he = d->ht[j].table[i]; // 获取到指定的索引内容

            /* Count contiguous empty buckets, and jump to other
             * locations if they reach 'count' (with a minimum of 5). */
            if (he == NULL) { // 是否为空
                emptylen++;
                if (emptylen >= 5 && emptylen > count) { // 连续5次或超过count次为空
                    i = random() & maxsizemask; // 重新随机索引
                    emptylen = 0; // 重置空次数
                }
            } else {
                emptylen = 0;
                while (he) { // 遍历填充链表的后续元素
                    /* Collect all the elements of the buckets found non
                     * empty while iterating. */
                    *des = he;
                    des++;
                    he = he->next;
                    stored++;
                    if (stored == count) return stored; // 数量足够,返回
                }
            }
        }
        i = (i+1) & maxsizemask; // 向后遍历取数据
    }
    return stored; // 数据不足count,返回
}
```

### `static void _dictReset(dictht *ht);`

#### 功能

ht重置

#### 源码

```c
/* Reset a hash table already initialized with ht_init().
 * NOTE: This function should only be called by ht_destroy(). */
static void _dictReset(dictht *ht)
{
    ht->table = NULL;
    ht->size = 0;
    ht->sizemask = 0;
    ht->used = 0;
}
```

### `int _dictInit(dict *d, dictType *type, void *privDataPtr);`

#### 功能

dict初始化

#### 源码

```c
/* Initialize the hash table */
int _dictInit(dict *d, dictType *type,
        void *privDataPtr)
{
    _dictReset(&d->ht[0]);
    _dictReset(&d->ht[1]);
    d->type = type;
    d->privdata = privDataPtr;
    d->rehashidx = -1;
    d->iterators = 0;
    return DICT_OK;
}
```

### `int dictRehash(dict *d, int n)`

#### 功能

dict的rehash
将数据从ht[0]迁移到ht[1]中
当全部迁移完毕后
释放旧数据
统一将ht[1]移动到ht[0]
分多次运行处理
以保证不会阻塞

#### 源码

```c
/* Performs N steps of incremental rehashing. Returns 1 if there are still
 * keys to move from the old to the new hash table, otherwise 0 is returned.
 *
 * Note that a rehashing step consists in moving a bucket (that may have more
 * than one key as we use chaining) from the old to the new hash table, however
 * since part of the hash table may be composed of empty spaces, it is not
 * guaranteed that this function will rehash even a single bucket, since it
 * will visit at max N*10 empty buckets in total, otherwise the amount of
 * work it does would be unbound and the function may block for a long time. */
int dictRehash(dict *d, int n) {
    int empty_visits = n*10; /* Max number of empty buckets to visit. */ // 空处理的数量
    if (!dictIsRehashing(d)) return 0; // 没有在rehash状态,不操作

    while(n-- && d->ht[0].used != 0) { // 当有数据存在并且没有到达操作次数上限时
        dictEntry *de, *nextde;

        /* Note that rehashidx can't overflow as we are sure there are more
         * elements because ht[0].used != 0 */
        assert(d->ht[0].size > (unsigned long)d->rehashidx);
        while(d->ht[0].table[d->rehashidx] == NULL) { // 遍历到下一个有效数据
            d->rehashidx++;
            if (--empty_visits == 0) return 1;
        }
        de = d->ht[0].table[d->rehashidx]; // 获取到entry
        /* Move all the keys in this bucket from the old to the new hash HT */
        while(de) { // 遍历链表并移动到ht[1]中
            unsigned int h;

            nextde = de->next;
            /* Get the index in the new hash table */
            h = dictHashKey(d, de->key) & d->ht[1].sizemask;
            de->next = d->ht[1].table[h];
            d->ht[1].table[h] = de;
            d->ht[0].used--;
            d->ht[1].used++;
            de = nextde;
        }
        d->ht[0].table[d->rehashidx] = NULL; // 清空旧链表
        d->rehashidx++; // 递增rehashidx
    }

    /* Check if we already rehashed the whole table... */
    if (d->ht[0].used == 0) { // 全部处理完成
        zfree(d->ht[0].table); // 释放就数据
        d->ht[0] = d->ht[1]; // 复制
        _dictReset(&d->ht[1]); // 释放ht[1]
        d->rehashidx = -1; // 标记为未rehash状态
        return 0;
    }

    /* More to rehash... */
    return 1;
}
```

### `long long timeInMilliseconds(void);`

#### 功能

获取当前时间戳
毫秒

#### 源码

```c
long long timeInMilliseconds(void) {
    struct timeval tv;

    gettimeofday(&tv,NULL);
    return (((long long)tv.tv_sec)*1000)+(tv.tv_usec/1000);
}
```

### `int dictRehashMilliseconds(dict *d, int ms);`

#### 功能

在指定毫秒内持续rehash

#### 源码

```c
/* Rehash for an amount of time between ms milliseconds and ms+1 milliseconds */
int dictRehashMilliseconds(dict *d, int ms) {
    long long start = timeInMilliseconds();
    int rehashes = 0;

    while(dictRehash(d,100)) {
        rehashes += 100;
        if (timeInMilliseconds()-start > ms) break;
    }
    return rehashes;
}
```

### `static void _dictRehashStep(dict *d);`

#### 功能

在没有安全迭代器的时候
rehash一个slot
通常在查找和更新dict时调用
目的是在使用dict的同时
自动rehash

#### 源码

```c
/* This function performs just a step of rehashing, and only if there are
 * no safe iterators bound to our hash table. When we have iterators in the
 * middle of a rehashing we can't mess with the two hash tables otherwise
 * some element can be missed or duplicated.
 *
 * This function is called by common lookup or update operations in the
 * dictionary so that the hash table automatically migrates from H1 to H2
 * while it is actively used. */
static void _dictRehashStep(dict *d) {
    if (d->iterators == 0) dictRehash(d,1);
}
```

### `static int dictGenericDelete(dict *d, const void *key, int nofree);`

#### 功能

通用删除操作

#### 源码

```c
/* Search and remove an element */
static int dictGenericDelete(dict *d, const void *key, int nofree)
{
    unsigned int h, idx;
    dictEntry *he, *prevHe;
    int table;

    if (d->ht[0].size == 0) return DICT_ERR; /* d->ht[0].table is NULL */ // 空表
    if (dictIsRehashing(d)) _dictRehashStep(d); // 步进rehash
    h = dictHashKey(d, key); // 获取hash值

    for (table = 0; table <= 1; table++) { // 遍历ht
        idx = h & d->ht[table].sizemask; // 获取下标
        he = d->ht[table].table[idx]; // 获取entry
        prevHe = NULL;
        while(he) { // 遍历链表
            if (key==he->key || dictCompareKeys(d, key, he->key)) { // entry和目标键是否相同
                /* Unlink the element from the list */
                if (prevHe) // 有前置的entry
                    prevHe->next = he->next; // 更新前置entry的next的值
                else
                    d->ht[table].table[idx] = he->next; // 将entry的next值标记为链表头数据
                if (!nofree) { // 是否需要释放内存
                    dictFreeKey(d, he); // 释放键
                    dictFreeVal(d, he); // 释放值
                }
                zfree(he); // 释放entry
                d->ht[table].used--; // 减少使用记数
                return DICT_OK; // 返回成功
            }
            prevHe = he; // 记录前一个数据entry
            he = he->next; // 继续遍历
        }
        if (!dictIsRehashing(d)) break; // 没有rehash则停止
    }
    return DICT_ERR; /* not found */ // 没有找到
}
```

### `int _dictClear(dict *d, dictht *ht, void(callback)(void *));`

#### 功能

清空指定的ht数据

#### 源码

```c
/* Destroy an entire dictionary */
int _dictClear(dict *d, dictht *ht, void(callback)(void *)) {
    unsigned long i;

    /* Free all the elements */
    for (i = 0; i < ht->size && ht->used > 0; i++) {
        dictEntry *he, *nextHe;

        if (callback && (i & 65535) == 0) callback(d->privdata);

        if ((he = ht->table[i]) == NULL) continue;
        while(he) {
            nextHe = he->next;
            dictFreeKey(d, he);
            dictFreeVal(d, he);
            zfree(he);
            ht->used--;
            he = nextHe;
        }
    }
    /* Free the table and the allocated cache structure */
    zfree(ht->table);
    /* Re-initialize the table */
    _dictReset(ht);
    return DICT_OK; /* never fails */
}
```

### `long long dictFingerprint(dict *d);`

#### 功能

计算dict的指纹数据

#### 源码

```c
/* A fingerprint is a 64 bit number that represents the state of the dictionary
 * at a given time, it's just a few dict properties xored together.
 * When an unsafe iterator is initialized, we get the dict fingerprint, and check
 * the fingerprint again when the iterator is released.
 * If the two fingerprints are different it means that the user of the iterator
 * performed forbidden operations against the dictionary while iterating. */
long long dictFingerprint(dict *d) {
    long long integers[6], hash = 0;
    int j;

    integers[0] = (long) d->ht[0].table;
    integers[1] = d->ht[0].size;
    integers[2] = d->ht[0].used;
    integers[3] = (long) d->ht[1].table;
    integers[4] = d->ht[1].size;
    integers[5] = d->ht[1].used;

    /* We hash N integers by summing every successive integer with the integer
     * hashing of the previous sum. Basically:
     *
     * Result = hash(hash(hash(int1)+int2)+int3) ...
     *
     * This way the same set of integers in a different order will (likely) hash
     * to a different number. */
    for (j = 0; j < 6; j++) {
        hash += integers[j];
        /* For the hashing step we use Tomas Wang's 64 bit integer hash. */
        hash = (~hash) + (hash << 21); // hash = (hash << 21) - hash - 1;
        hash = hash ^ (hash >> 24);
        hash = (hash + (hash << 3)) + (hash << 8); // hash * 265
        hash = hash ^ (hash >> 14);
        hash = (hash + (hash << 2)) + (hash << 4); // hash * 21
        hash = hash ^ (hash >> 28);
        hash = hash + (hash << 31);
    }
    return hash;
}
```

### `static unsigned long rev(unsigned long v);`

#### 功能

反转操作位数据

#### 源码

```c
/* Function to reverse bits. Algorithm from:
 * http://graphics.stanford.edu/~seander/bithacks.html#ReverseParallel */
static unsigned long rev(unsigned long v) {
    unsigned long s = 8 * sizeof(v); // bit size; must be power of 2
    unsigned long mask = ~0;
    while ((s >>= 1) > 0) {
        mask ^= (mask << s);
        v = ((v >> s) & mask) | ((v << s) & ~mask);
    }
    return v;
}
```

### `unsigned long dictScan(dict *d, unsigned long v, dictScanFunction *fn, void *privdata);`

#### 功能

dict的scan迭代操作
防止命令阻塞
无状态,无额外内存占用的遍历
(没太明白,后面有时间仔细看看)

#### 源码

```c
/* dictScan() is used to iterate over the elements of a dictionary.
 *
 * Iterating works the following way:
 *
 * 1) Initially you call the function using a cursor (v) value of 0.
 * 2) The function performs one step of the iteration, and returns the
 *    new cursor value you must use in the next call.
 * 3) When the returned cursor is 0, the iteration is complete.
 *
 * The function guarantees all elements present in the
 * dictionary get returned between the start and end of the iteration.
 * However it is possible some elements get returned multiple times.
 *
 * For every element returned, the callback argument 'fn' is
 * called with 'privdata' as first argument and the dictionary entry
 * 'de' as second argument.
 *
 * HOW IT WORKS.
 *
 * The iteration algorithm was designed by Pieter Noordhuis.
 * The main idea is to increment a cursor starting from the higher order
 * bits. That is, instead of incrementing the cursor normally, the bits
 * of the cursor are reversed, then the cursor is incremented, and finally
 * the bits are reversed again.
 *
 * This strategy is needed because the hash table may be resized between
 * iteration calls.
 *
 * dict.c hash tables are always power of two in size, and they
 * use chaining, so the position of an element in a given table is given
 * by computing the bitwise AND between Hash(key) and SIZE-1
 * (where SIZE-1 is always the mask that is equivalent to taking the rest
 *  of the division between the Hash of the key and SIZE).
 *
 * For example if the current hash table size is 16, the mask is
 * (in binary) 1111. The position of a key in the hash table will always be
 * the last four bits of the hash output, and so forth.
 *
 * WHAT HAPPENS IF THE TABLE CHANGES IN SIZE?
 *
 * If the hash table grows, elements can go anywhere in one multiple of
 * the old bucket: for example let's say we already iterated with
 * a 4 bit cursor 1100 (the mask is 1111 because hash table size = 16).
 *
 * If the hash table will be resized to 64 elements, then the new mask will
 * be 111111. The new buckets you obtain by substituting in ??1100
 * with either 0 or 1 can be targeted only by keys we already visited
 * when scanning the bucket 1100 in the smaller hash table.
 *
 * By iterating the higher bits first, because of the inverted counter, the
 * cursor does not need to restart if the table size gets bigger. It will
 * continue iterating using cursors without '1100' at the end, and also
 * without any other combination of the final 4 bits already explored.
 *
 * Similarly when the table size shrinks over time, for example going from
 * 16 to 8, if a combination of the lower three bits (the mask for size 8
 * is 111) were already completely explored, it would not be visited again
 * because we are sure we tried, for example, both 0111 and 1111 (all the
 * variations of the higher bit) so we don't need to test it again.
 *
 * WAIT... YOU HAVE *TWO* TABLES DURING REHASHING!
 *
 * Yes, this is true, but we always iterate the smaller table first, then
 * we test all the expansions of the current cursor into the larger
 * table. For example if the current cursor is 101 and we also have a
 * larger table of size 16, we also test (0)101 and (1)101 inside the larger
 * table. This reduces the problem back to having only one table, where
 * the larger one, if it exists, is just an expansion of the smaller one.
 *
 * LIMITATIONS
 *
 * This iterator is completely stateless, and this is a huge advantage,
 * including no additional memory used.
 *
 * The disadvantages resulting from this design are:
 *
 * 1) It is possible we return elements more than once. However this is usually
 *    easy to deal with in the application level.
 * 2) The iterator must return multiple elements per call, as it needs to always
 *    return all the keys chained in a given bucket, and all the expansions, so
 *    we are sure we don't miss keys moving during rehashing.
 * 3) The reverse cursor is somewhat hard to understand at first, but this
 *    comment is supposed to help.
 */
unsigned long dictScan(dict *d,
                       unsigned long v,
                       dictScanFunction *fn,
                       void *privdata)
{
    dictht *t0, *t1;
    const dictEntry *de;
    unsigned long m0, m1;

    if (dictSize(d) == 0) return 0;

    if (!dictIsRehashing(d)) {
        t0 = &(d->ht[0]);
        m0 = t0->sizemask;

        /* Emit entries at cursor */
        de = t0->table[v & m0];
        while (de) {
            fn(privdata, de);
            de = de->next;
        }

    } else {
        t0 = &d->ht[0];
        t1 = &d->ht[1];

        /* Make sure t0 is the smaller and t1 is the bigger table */
        if (t0->size > t1->size) {
            t0 = &d->ht[1];
            t1 = &d->ht[0];
        }

        m0 = t0->sizemask;
        m1 = t1->sizemask;

        /* Emit entries at cursor */
        de = t0->table[v & m0];
        while (de) {
            fn(privdata, de);
            de = de->next;
        }

        /* Iterate over indices in larger table that are the expansion
         * of the index pointed to by the cursor in the smaller table */
        do {
            /* Emit entries at cursor */
            de = t1->table[v & m1];
            while (de) {
                fn(privdata, de);
                de = de->next;
            }

            /* Increment bits not covered by the smaller mask */
            v = (((v | m0) + 1) & ~m0) | (v & m0);

            /* Continue while bits covered by mask difference is non-zero */
        } while (v & (m0 ^ m1));
    }

    /* Set unmasked bits so incrementing the reversed cursor
     * operates on the masked bits of the smaller table */
    v |= ~m0;

    /* Increment the reverse cursor */
    v = rev(v);
    v++;
    v = rev(v);

    return v;
}
```
