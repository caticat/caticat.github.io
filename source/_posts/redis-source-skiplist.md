---
title: Redis 源码分析-skiplist
tags:
  - redis
  - database
categories:
  - redis
  - source
date: 2018-05-07 15:16:12
---
跳表
就是分层级的有序链表
查询数据快,结构简单
跳表所有层级的第一个元素都是header的头元素(空数据)
结尾是实际插入的元素
跳表的第一个实际插入的元素是回退不到header的
代码中
forward的处理是遍历循环处理
backward的处理是一个if判断
是因为forward是层级相关的,所有层级都要处理
而backward只是一个值,backward本身只记录0级的数据

## 相关文件

- server.h
- t_zset.c
<!-- more -->

## 相关概念

- strtod
	原型`double strtod(const char *nptr,char **endptr);`
	将字符串转化为double

## 数据结构

```c
/* ZSETs use a specialized version of Skiplists */
typedef struct zskiplistNode { // 跳表节点
    robj *obj; // 数据(redis对象)
    double score; // 积分(排序用)
    struct zskiplistNode *backward; // 前一个节点(后退)
    struct zskiplistLevel { // 层级结构
        struct zskiplistNode *forward; // 下一个节点(前进)
        unsigned int span; // 跨度(和当前节点间隔了多少元素(包含下一个节点))
    } level[]; // 不同层级的信息
} zskiplistNode;

typedef struct zskiplist { // 跳表结构
    struct zskiplistNode *header, *tail; // 头(),尾节点
    unsigned long length; // 总元素个数
    int level; // 总层级(最大等级+1)
} zskiplist;

typedef struct zset { // 有序set结构
    dict *dict; // <值, 分数>
    zskiplist *zsl; // 跳表
} zset;

/* Struct to hold a inclusive/exclusive range spec by score comparison. */
typedef struct { // 查找用表示范围的数据结构
    double min, max; // 最大最小值
    int minex, maxex; /* are min or max exclusive? */ // 标记是否是开区间
} zrangespec;

/* Struct to hold an inclusive/exclusive range spec by lexicographic comparison. */
typedef struct {
    robj *min, *max;  /* May be set to shared.(minstring|maxstring) */ // 最大最小值
    int minex, maxex; /* are min or max exclusive? */ // 标记是否是开区间
} zlexrangespec;
```

## 主要宏

```c
#define ZSKIPLIST_MAXLEVEL 32 /* Should be enough for 2^32 elements */ // 最大层数
#define ZSKIPLIST_P 0.25      /* Skiplist P = 1/4 */ // 元素增加层数的概率
```

## 函数分析

### `zskiplistNode *zslCreateNode(int level, double score, robj *obj);`

#### 功能

创建一个跳表节点
一个节点,一旦创建出来就已经决定了它自身的层级
所以它的数组内存是固定的
不需要在后面扩展层级数据信息

#### 源码

```c
zskiplistNode *zslCreateNode(int level, double score, robj *obj) {
    zskiplistNode *zn = zmalloc(sizeof(*zn)+level*sizeof(struct zskiplistLevel)); // 内存申请
    zn->score = score; // 记录积分
    zn->obj = obj; // 记录数据
    return zn;
}
```

### `zskiplist *zslCreate(void);`

#### 功能

创建跳表

#### 源码

```c
zskiplist *zslCreate(void) {
    int j;
    zskiplist *zsl;

    zsl = zmalloc(sizeof(*zsl)); // 申请内存
    zsl->level = 1; // 初始等级为1
    zsl->length = 0; // 没有元素
    zsl->header = zslCreateNode(ZSKIPLIST_MAXLEVEL,0,NULL); // 创建一个头,包含所有层级,数据为空,0分
    for (j = 0; j < ZSKIPLIST_MAXLEVEL; j++) { // 初始化头数据
        zsl->header->level[j].forward = NULL; // 没有下一个元素
        zsl->header->level[j].span = 0; // 间隔元素数量为0
    }
    zsl->header->backward = NULL; // 没有前一个元素
    zsl->tail = NULL; // 结尾为空
    return zsl;
}
```

### `void zslFreeNode(zskiplistNode *node);`

#### 功能

释放节点内存

#### 源码

```c
void zslFreeNode(zskiplistNode *node) {
    decrRefCount(node->obj); // 减少obj的引用次数,当次数为1时释放内存
    zfree(node); // 释放节点本身申请的内存
}
```

### `void zslFree(zskiplist *zsl);`

#### 功能

释放跳表内存

#### 源码

```c
void zslFree(zskiplist *zsl) {
    zskiplistNode *node = zsl->header->level[0].forward, *next; // 获取到除头外的第一个元素

    zfree(zsl->header); // 释放头元素
    while(node) { // 遍历
        next = node->level[0].forward; // 记录下一个元素
        zslFreeNode(node); // 释放节点元素
        node = next; // 递增
    }
    zfree(zsl); // 释放跳表本身
}
```

### `int zslRandomLevel(void);`

#### 功能

返回一个随机的跳表层级算法

#### 源码

```c
/* Returns a random level for the new skiplist node we are going to create.
 * The return value of this function is between 1 and ZSKIPLIST_MAXLEVEL
 * (both inclusive), with a powerlaw-alike distribution where higher
 * levels are less likely to be returned. */
int zslRandomLevel(void) {
    int level = 1;
    while ((random()&0xFFFF) < (ZSKIPLIST_P * 0xFFFF))
        level += 1;
    return (level<ZSKIPLIST_MAXLEVEL) ? level : ZSKIPLIST_MAXLEVEL;
}
```

### `zskiplistNode *zslInsert(zskiplist *zsl, double score, robj *obj);`

#### 功能

跳表插入数据
这里的跳表没有检测重复数据信息
因为redis的跳表是配合dict使用的
判断数据是否重复使用dict来判断

#### 源码

```c
zskiplistNode *zslInsert(zskiplist *zsl, double score, robj *obj) {
    zskiplistNode *update[ZSKIPLIST_MAXLEVEL], *x; // update:记录所有需要变动的元素(新插入的元素在update的元素之后)
    unsigned int rank[ZSKIPLIST_MAXLEVEL]; // 不同层级,从起始到新插入元素的位置统计,包含的元素的个数
    int i, level;

    serverAssert(!isnan(score)); // 保证score必然有值
    x = zsl->header; // 记录起始位置
    for (i = zsl->level-1; i >= 0; i--) { // 倒叙遍历(所有跳表查询数据都是使用倒序)
        /* store rank that is crossed to reach the insert position */
        rank[i] = i == (zsl->level-1) ? 0 : rank[i+1]; // 最上层的头数据肯定没有rank值,下面层级的rank值的起始就是上一个层级的值
        while (x->level[i].forward &&
            (x->level[i].forward->score < score ||
                (x->level[i].forward->score == score &&
                compareStringObjects(x->level[i].forward->obj,obj) < 0))) { // 当前遍历元素比待插入元素小则继续遍历
            rank[i] += x->level[i].span; // 增加rank
            x = x->level[i].forward; // 获取下一个元素
        }
        update[i] = x; // 记录最符合条件的元素
    }
    /* we assume the key is not already inside, since we allow duplicated
     * scores, and the re-insertion of score and redis object should never
     * happen since the caller of zslInsert() should test in the hash table
     * if the element is already inside or not. */
    level = zslRandomLevel(); // 生成新插入数据的层级
    if (level > zsl->level) { // 比当前层级高的话
        for (i = zsl->level; i < level; i++) { // 初始化所有新层级
            rank[i] = 0; // 没有rank值
            update[i] = zsl->header; // 因为没有其他数据,所以变更的一定都是hader
            update[i]->level[i].span = zsl->length; // 初始间隔就是跳表的所有长度
        }
        zsl->level = level; // 记录当前跳表的等级
    }
    x = zslCreateNode(level,score,obj); // 创建一个新的node
    for (i = 0; i < level; i++) { // 更新所有需要更新的节点
        x->level[i].forward = update[i]->level[i].forward; // 新节点插入跳表
        update[i]->level[i].forward = x;

        /* update span covered by update[i] as x is inserted here */
        x->level[i].span = update[i]->level[i].span - (rank[0] - rank[i]); // 记录新节点的span间隔值
        update[i]->level[i].span = (rank[0] - rank[i]) + 1; // 修改update元节点的间隔值(多了一个新增节点,所以+1)
    }

    /* increment span for untouched levels */
    for (i = level; i < zsl->level; i++) { // 当随机的level<原链表大小时,需要把上层的间隔值做下递增调整,否则会漏数据
        update[i]->level[i].span++; // 递增
    }

    x->backward = (update[0] == zsl->header) ? NULL : update[0]; // 是否可以回退,元素回退不到头数据
    if (x->level[0].forward) // 不是结尾
        x->level[0].forward->backward = x; // 后面的元素记录前面的元素指针
    else
        zsl->tail = x; // 标记结尾
    zsl->length++; // 递增长度
    return x; // 返回新增节点
}
```

### `void zslDeleteNode(zskiplist *zsl, zskiplistNode *x, zskiplistNode **update);`

#### 功能

删除节点
不是放内存
只是整理跳表的元素结构关系
update为所有相关的需要处理的节点列表

#### 源码

```c
/* Internal function used by zslDelete, zslDeleteByScore and zslDeleteByRank */
void zslDeleteNode(zskiplist *zsl, zskiplistNode *x, zskiplistNode **update) {
    int i;
    for (i = 0; i < zsl->level; i++) { // 遍历跳表
        if (update[i]->level[i].forward == x) { // 下一个是要删除的节点(直接关联)
            update[i]->level[i].span += x->level[i].span - 1; // 扩展span间隔值
            update[i]->level[i].forward = x->level[i].forward; // 链表移除节点
        } else { // 不直接关联(上层链表)
            update[i]->level[i].span -= 1; // 减少span间隔值即可
        }
    }
    if (x->level[0].forward) { // 后面有值的话
        x->level[0].forward->backward = x->backward; // 修正下一个节点的后退节点
    } else {
        zsl->tail = x->backward; // 修改结尾
    }
    while(zsl->level > 1 && zsl->header->level[zsl->level-1].forward == NULL) // 当上层链表为空时
        zsl->level--; // 减少跳表层级
    zsl->length--; // 修改跳表实际长度
}
```

### `int zslDelete(zskiplist *zsl, double score, robj *obj);`

#### 功能

根据积分和对象删除跳表节点

#### 源码

```c
/* Delete an element with matching score/object from the skiplist. */
int zslDelete(zskiplist *zsl, double score, robj *obj) {
    zskiplistNode *update[ZSKIPLIST_MAXLEVEL], *x;
    int i;

    x = zsl->header;
    for (i = zsl->level-1; i >= 0; i--) { // 倒序遍历
        while (x->level[i].forward &&
            (x->level[i].forward->score < score ||
                (x->level[i].forward->score == score &&
                compareStringObjects(x->level[i].forward->obj,obj) < 0)))
            x = x->level[i].forward;
        update[i] = x; // 查找所有待处理及节点的前置节点
    }
    /* We may have multiple elements with the same score, what we need
     * is to find the element with both the right score and object. */
    x = x->level[0].forward; // 获取到带删除节点本身
    if (x && score == x->score && equalStringObjects(x->obj,obj)) { // 保证是==而不是>
        zslDeleteNode(zsl, x, update); // 删除节点的跳表关系
        zslFreeNode(x); // 释放内存
        return 1; // 返回成功
    }
    return 0; /* not found */ // 返回失败
}
```

### `static int zslValueGteMin(double value, zrangespec *spec);`

#### 功能

判断值是否大于(等于)最小范围

#### 源码

```c
static int zslValueGteMin(double value, zrangespec *spec) {
    return spec->minex ? (value > spec->min) : (value >= spec->min);
}
```

### `int zslValueLteMax(double value, zrangespec *spec);`

#### 功能

判断值是否小于(等于)最大范围

#### 源码

```c
int zslValueLteMax(double value, zrangespec *spec) {
    return spec->maxex ? (value < spec->max) : (value <= spec->max);
}
```

### `int zslIsInRange(zskiplist *zsl, zrangespec *range);`

#### 功能

判断跳表是否在给定范围内

#### 源码

```c
/* Returns if there is a part of the zset is in range. */
int zslIsInRange(zskiplist *zsl, zrangespec *range) {
    zskiplistNode *x;

    /* Test for ranges that will always be empty. */
    if (range->min > range->max ||
            (range->min == range->max && (range->minex || range->maxex))) // 范围本身就是空,不可能在范围内
        return 0;
    x = zsl->tail;
    if (x == NULL || !zslValueGteMin(x->score,range)) // 两端校验
        return 0;
    x = zsl->header->level[0].forward;
    if (x == NULL || !zslValueLteMax(x->score,range))
        return 0;
    return 1;
}
```

### `zskiplistNode *zslFirstInRange(zskiplist *zsl, zrangespec *range);`

#### 功能

获取到跳表第一个在范围内的元素

#### 源码

```c
/* Find the first node that is contained in the specified range.
 * Returns NULL when no element is contained in the range. */
zskiplistNode *zslFirstInRange(zskiplist *zsl, zrangespec *range) {
    zskiplistNode *x;
    int i;

    /* If everything is out of range, return early. */
    if (!zslIsInRange(zsl,range)) return NULL;

    x = zsl->header;
    for (i = zsl->level-1; i >= 0; i--) { // 遍历找到第一个大于最小值的元素
        /* Go forward while *OUT* of range. */
        while (x->level[i].forward &&
            !zslValueGteMin(x->level[i].forward->score,range))
                x = x->level[i].forward;
    }

    /* This is an inner range, so the next node cannot be NULL. */
    x = x->level[0].forward;
    serverAssert(x != NULL);

    /* Check if score <= max. */
    if (!zslValueLteMax(x->score,range)) return NULL; // 判断是否小于最大值
    return x;
}
```

### `zskiplistNode *zslLastInRange(zskiplist *zsl, zrangespec *range);`

#### 功能

获取最后一个在给定范围内的元素

#### 源码

```c
/* Find the last node that is contained in the specified range.
 * Returns NULL when no element is contained in the range. */
zskiplistNode *zslLastInRange(zskiplist *zsl, zrangespec *range) {
    zskiplistNode *x;
    int i;

    /* If everything is out of range, return early. */
    if (!zslIsInRange(zsl,range)) return NULL;

    x = zsl->header;
    for (i = zsl->level-1; i >= 0; i--) { // 遍历找到最后一个小于最大值的元素
        /* Go forward while *IN* range. */
        while (x->level[i].forward &&
            zslValueLteMax(x->level[i].forward->score,range))
                x = x->level[i].forward;
    }

    /* This is an inner range, so this node cannot be NULL. */
    serverAssert(x != NULL);

    /* Check if score >= min. */
    if (!zslValueGteMin(x->score,range)) return NULL; // 判断是否大于最小值
    return x;
}
```

### `unsigned long zslDeleteRangeByScore(zskiplist *zsl, zrangespec *range, dict *dict);`

#### 功能

根据分数范围删除跳表内的元素
dict是同时删除dict内的记录

#### 源码

```c
/* Delete all the elements with score between min and max from the skiplist.
 * Min and max are inclusive, so a score >= min || score <= max is deleted.
 * Note that this function takes the reference to the hash table view of the
 * sorted set, in order to remove the elements from the hash table too. */
unsigned long zslDeleteRangeByScore(zskiplist *zsl, zrangespec *range, dict *dict) {
    zskiplistNode *update[ZSKIPLIST_MAXLEVEL], *x;
    unsigned long removed = 0;
    int i;

    x = zsl->header;
    for (i = zsl->level-1; i >= 0; i--) {
        while (x->level[i].forward && (range->minex ?
            x->level[i].forward->score <= range->min :
            x->level[i].forward->score < range->min))
                x = x->level[i].forward;
        update[i] = x;
    }

    /* Current node is the last with score < or <= min. */
    x = x->level[0].forward;

    /* Delete nodes while in range. */
    while (x &&
           (range->maxex ? x->score < range->max : x->score <= range->max))
    {
        zskiplistNode *next = x->level[0].forward;
        zslDeleteNode(zsl,x,update);
        dictDelete(dict,x->obj);
        zslFreeNode(x);
        removed++;
        x = next;
    }
    return removed;
}
```

### `unsigned long zslDeleteRangeByLex(zskiplist *zsl, zlexrangespec *range, dict *dict);`

#### 功能

根据范围对象删除跳表元素
dict是同时删除dict内的记录

#### 源码

```c
unsigned long zslDeleteRangeByLex(zskiplist *zsl, zlexrangespec *range, dict *dict) {
    zskiplistNode *update[ZSKIPLIST_MAXLEVEL], *x;
    unsigned long removed = 0;
    int i;


    x = zsl->header;
    for (i = zsl->level-1; i >= 0; i--) {
        while (x->level[i].forward &&
            !zslLexValueGteMin(x->level[i].forward->obj,range))
                x = x->level[i].forward;
        update[i] = x;
    }

    /* Current node is the last with score < or <= min. */
    x = x->level[0].forward;

    /* Delete nodes while in range. */
    while (x && zslLexValueLteMax(x->obj,range)) {
        zskiplistNode *next = x->level[0].forward;
        zslDeleteNode(zsl,x,update);
        dictDelete(dict,x->obj);
        zslFreeNode(x);
        removed++;
        x = next;
    }
    return removed;
}
```

### `unsigned long zslDeleteRangeByRank(zskiplist *zsl, unsigned int start, unsigned int end, dict *dict);`

#### 功能

根据rank的起始和结束位置删除跳表数据
dict是同时删除dict内的记录

#### 源码

```c
/* Delete all the elements with rank between start and end from the skiplist.
 * Start and end are inclusive. Note that start and end need to be 1-based */
unsigned long zslDeleteRangeByRank(zskiplist *zsl, unsigned int start, unsigned int end, dict *dict) {
    zskiplistNode *update[ZSKIPLIST_MAXLEVEL], *x;
    unsigned long traversed = 0, removed = 0;
    int i;

    x = zsl->header;
    for (i = zsl->level-1; i >= 0; i--) {
        while (x->level[i].forward && (traversed + x->level[i].span) < start) {
            traversed += x->level[i].span;
            x = x->level[i].forward;
        }
        update[i] = x;
    }

    traversed++;
    x = x->level[0].forward;
    while (x && traversed <= end) {
        zskiplistNode *next = x->level[0].forward;
        zslDeleteNode(zsl,x,update);
        dictDelete(dict,x->obj);
        zslFreeNode(x);
        removed++;
        traversed++;
        x = next;
    }
    return removed;
}
```

### `unsigned long zslGetRank(zskiplist *zsl, double score, robj *o);`

#### 功能

根据积分和对象查找在跳表中的rank信息
不存在则返回0

#### 源码

```c
/* Find the rank for an element by both score and key.
 * Returns 0 when the element cannot be found, rank otherwise.
 * Note that the rank is 1-based due to the span of zsl->header to the
 * first element. */
unsigned long zslGetRank(zskiplist *zsl, double score, robj *o) {
    zskiplistNode *x;
    unsigned long rank = 0;
    int i;

    x = zsl->header;
    for (i = zsl->level-1; i >= 0; i--) {
        while (x->level[i].forward &&
            (x->level[i].forward->score < score ||
                (x->level[i].forward->score == score &&
                compareStringObjects(x->level[i].forward->obj,o) <= 0))) {
            rank += x->level[i].span;
            x = x->level[i].forward;
        }

        /* x might be equal to zsl->header, so test if obj is non-NULL */
        if (x->obj && equalStringObjects(x->obj,o)) {
            return rank;
        }
    }
    return 0;
}
```

### `zskiplistNode* zslGetElementByRank(zskiplist *zsl, unsigned long rank);`

#### 功能

根据rank信息查找对应的跳表元素

#### 源码

```c
/* Finds an element by its rank. The rank argument needs to be 1-based. */
zskiplistNode* zslGetElementByRank(zskiplist *zsl, unsigned long rank) {
    zskiplistNode *x;
    unsigned long traversed = 0;
    int i;

    x = zsl->header;
    for (i = zsl->level-1; i >= 0; i--) {
        while (x->level[i].forward && (traversed + x->level[i].span) <= rank)
        {
            traversed += x->level[i].span;
            x = x->level[i].forward;
        }
        if (traversed == rank) {
            return x;
        }
    }
    return NULL;
}
```
