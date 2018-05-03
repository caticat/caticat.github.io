---
title: Redis 源码分析-压缩map
tags:
  - redis
  - database
categories:
  - redis
  - source
date: 2018-05-02 14:22:52
---

本质上就是`char*`字符串
通过指定的格式排列的数据结构
基本格式
```
<zmlen>	// 当zmlen小于254时,记录的是键值对的个数,当等于254时,表示需要遍历整个zipmap才能指导具体的长度
		<len>$key1<len><free>$value1	// 键长度->键->值长度->1字节无用空间长度->无用空间->值(无用空间在代码中貌似不太对,有的地方有用,有的地方没有用(关于free的代码都不完善,没有统一),应该是所有使用的地方,无用空间长度都是0)
		<len>$key2<len><free>$value2
		...
<255> // zipmap结尾
```

```c
#define ZIPMAP_BIGLEN 254 // zm的长度上限,当数据长度超过254时,使用254标记,并将后4(根据unsigned int长度变化)为记录为数据长度
#define ZIPMAP_END 255 // zm的结尾标记
```

## 相关文件

- zipmap.h
- zipmap.c

<!-- more -->

## 相关概念

- `void *memmove( void* dest, const void* src, size_t count );`
	memmove用于从src拷贝count个字节到dest，如果目标区域和源区域有重叠的话，memmove能够保证源串在被覆盖之前将重叠区域的字节拷贝到目标区域中。但复制后src内容会被更改。但是当目标区域与源区域没有重叠则和memcpy函数功能相同。

## 函数分析

### `unsigned char *zipmapNew(void);`

#### 功能

创建一个空的zipmap

#### 源码

```c
/* Create a new empty zipmap. */
unsigned char *zipmapNew(void) {
    unsigned char *zm = zmalloc(2); // 只有开始,结束两个标记位

    zm[0] = 0; /* Length */
    zm[1] = ZIPMAP_END;
    return zm;
}
```

### `unsigned char *zipmapSet(unsigned char *zm, unsigned char *key, unsigned int klen, unsigned char *val, unsigned int vlen, int *update);`

#### 功能

insert/update(merge)功能,新增或者修改值

#### 源码

```c
/* Set key to value, creating the key if it does not already exist.
 * If 'update' is not NULL, *update is set to 1 if the key was
 * already preset, otherwise to 0. */
unsigned char *zipmapSet(unsigned char *zm, unsigned char *key, unsigned int klen, unsigned char *val, unsigned int vlen, int *update) {
    unsigned int zmlen, offset;
    unsigned int freelen, reqlen = zipmapRequiredLength(klen,vlen); // 获取到实际需要使用的内存的数量
    unsigned int empty, vempty;
    unsigned char *p;

    freelen = reqlen;
    if (update) *update = 0;
    p = zipmapLookupRaw(zm,key,klen,&zmlen); // 查找获取需要更新的key的指针
    if (p == NULL) { // 没有找到,新增
        /* Key not found: enlarge */
        zm = zipmapResize(zm, zmlen+reqlen);
        p = zm+zmlen-1;
        zmlen = zmlen+reqlen;

        /* Increase zipmap length (this is an insert) */
        if (zm[0] < ZIPMAP_BIGLEN) zm[0]++;
    } else {
        /* Key found. Is there enough space for the new value? */
        /* Compute the total length: */
        if (update) *update = 1; // 标记是更新,不是新增
        freelen = zipmapRawEntryLength(p); // 获取到原始键值对的总长度
        if (freelen < reqlen) { // 当前zipmap长度不够,需要扩展
            /* Store the offset of this key within the current zipmap, so
             * it can be resized. Then, move the tail backwards so this
             * pair fits at the current position. */
            offset = p-zm;
            zm = zipmapResize(zm, zmlen-freelen+reqlen); // 扩展空间
            p = zm+offset;

            /* The +1 in the number of bytes to be moved is caused by the
             * end-of-zipmap byte. Note: the *original* zmlen is used. */
            memmove(p+reqlen, p+freelen, zmlen-(offset+freelen+1)); // 将旧数据去掉,后面的数据前移
            zmlen = zmlen-freelen+reqlen;
            freelen = reqlen;
        }
    }

    /* We now have a suitable block where the key/value entry can
     * be written. If there is too much free space, move the tail
     * of the zipmap a few bytes to the front and shrink the zipmap,
     * as we want zipmaps to be very space efficient. */
    empty = freelen-reqlen; // 这里永远是0,所以数据结构中的`free`实际上完全没有使用
    if (empty >= ZIPMAP_VALUE_MAX_FREE) {
        /* First, move the tail <empty> bytes to the front, then resize
         * the zipmap to be <empty> bytes smaller. */
        offset = p-zm;
        memmove(p+reqlen, p+freelen, zmlen-(offset+freelen+1));
        zmlen -= empty;
        zm = zipmapResize(zm, zmlen);
        p = zm+offset;
        vempty = 0;
    } else {
        vempty = empty;
    }

    /* Just write the key + value and we are done. */
    /* Key: */
    p += zipmapEncodeLength(p,klen); // 写键长度
    memcpy(p,key,klen); // 复制键
    p += klen; // 指针后移
    /* Value: */
    p += zipmapEncodeLength(p,vlen); // 写值长度
    *p++ = vempty; // 写free的长度(就是0,后面连按照free长度写空字节的代码都没有,如果free真有意义,这里就有逻辑问题了)
    memcpy(p,val,vlen); // 复制值
    return zm; // 返回新的zipmap
}
```

### `unsigned char *zipmapDel(unsigned char *zm, unsigned char *key, unsigned int klen, int *deleted);`

#### 功能

删除指定键值对

#### 源码

```c
/* Remove the specified key. If 'deleted' is not NULL the pointed integer is
 * set to 0 if the key was not found, to 1 if it was found and deleted. */
unsigned char *zipmapDel(unsigned char *zm, unsigned char *key, unsigned int klen, int *deleted) {
    unsigned int zmlen, freelen;
    unsigned char *p = zipmapLookupRaw(zm,key,klen,&zmlen); // 找到key的起始位置
    if (p) { // 找到了
        freelen = zipmapRawEntryLength(p); // 获取整体的键值对长度
        memmove(p, p+freelen, zmlen-((p-zm)+freelen+1)); // 后面的前移覆盖
        zm = zipmapResize(zm, zmlen-freelen); // 重新分配内存使用大小

        /* Decrease zipmap length */
        if (zm[0] < ZIPMAP_BIGLEN) zm[0]--; // 更新头部的长度记录

        if (deleted) *deleted = 1; // 标记已找到
    } else { // 没找到
        if (deleted) *deleted = 0; // 标记未找到
    }
    return zm;
}
```

### `unsigned char *zipmapRewind(unsigned char *zm);`

#### 功能

跳过zm开头的长度记录字节,遍历用的统一起始接口

#### 源码

```c
/* Call before iterating through elements via zipmapNext() */
unsigned char *zipmapRewind(unsigned char *zm) {
    return zm+1;
}
```

### `unsigned char *zipmapNext(unsigned char *zm, unsigned char **key, unsigned int *klen, unsigned char **value, unsigned int *vlen);`

#### 功能

遍历,获取下一个数据,无数据则返回空

#### 源码

```c
/* This function is used to iterate through all the zipmap elements.
 * In the first call the first argument is the pointer to the zipmap + 1.
 * In the next calls what zipmapNext returns is used as first argument.
 * Example:
 *
 * unsigned char *i = zipmapRewind(my_zipmap);
 * while((i = zipmapNext(i,&key,&klen,&value,&vlen)) != NULL) {
 *     printf("%d bytes key at $p\n", klen, key);
 *     printf("%d bytes value at $p\n", vlen, value);
 * }
 */
unsigned char *zipmapNext(unsigned char *zm, unsigned char **key, unsigned int *klen, unsigned char **value, unsigned int *vlen) {
    if (zm[0] == ZIPMAP_END) return NULL; // 结尾返回空
    if (key) {
        *key = zm; // 记录键的起始指针
        *klen = zipmapDecodeLength(zm); // 获取键的长度
        *key += ZIPMAP_LEN_BYTES(*klen); // 获取实际键的偏移指针
    }
    zm += zipmapRawKeyLength(zm); // 过掉键字段
    if (value) {
        *value = zm+1; // 获取到值的首地址
        *vlen = zipmapDecodeLength(zm); // 获取值的长度
        *value += ZIPMAP_LEN_BYTES(*vlen); // 获取值的实际偏移指针
    }
    zm += zipmapRawValueLength(zm); // 过掉值字段
    return zm; // 返回偏移后的zipmap数据
}
```

### `int zipmapGet(unsigned char *zm, unsigned char *key, unsigned int klen, unsigned char **value, unsigned int *vlen);`

#### 功能

根据键,获取值,返回是否找到

#### 源码

```c
/* Search a key and retrieve the pointer and len of the associated value.
 * If the key is found the function returns 1, otherwise 0. */
int zipmapGet(unsigned char *zm, unsigned char *key, unsigned int klen, unsigned char **value, unsigned int *vlen) {
    unsigned char *p;

    if ((p = zipmapLookupRaw(zm,key,klen,NULL)) == NULL) return 0; // 查找键的位置
    p += zipmapRawKeyLength(p); // 跳过键的整体长度
    *vlen = zipmapDecodeLength(p); // 获取值的长度
    *value = p + ZIPMAP_LEN_BYTES(*vlen) + 1; // 获取值的指针
    return 1;
}
```

### `int zipmapExists(unsigned char *zm, unsigned char *key, unsigned int klen);`

#### 功能

判断键是否存在

#### 源码

```c
/* Return 1 if the key exists, otherwise 0 is returned. */
int zipmapExists(unsigned char *zm, unsigned char *key, unsigned int klen) {
    return zipmapLookupRaw(zm,key,klen,NULL) != NULL;
}
```

### `unsigned int zipmapLen(unsigned char *zm);`

#### 功能

获取zipmap的长度
zm[0] < ZIPMAP_BIGLEN则取首地址值,否则遍历计算

#### 源码

```c
/* Return the number of entries inside a zipmap */
unsigned int zipmapLen(unsigned char *zm) {
    unsigned int len = 0;
    if (zm[0] < ZIPMAP_BIGLEN) {
        len = zm[0];
    } else {
        unsigned char *p = zipmapRewind(zm);
        while((p = zipmapNext(p,NULL,NULL,NULL,NULL)) != NULL) len++;

        /* Re-store length if small enough */
        if (len < ZIPMAP_BIGLEN) zm[0] = len;
    }
    return len;
}
```

### `size_t zipmapBlobLen(unsigned char *zm);`

#### 功能

获取zipmap所占的所有字节数(从头到结束)

#### 源码

```c
/* Return the raw size in bytes of a zipmap, so that we can serialize
 * the zipmap on disk (or everywhere is needed) just writing the returned
 * amount of bytes of the C array starting at the zipmap pointer. */
size_t zipmapBlobLen(unsigned char *zm) {
    unsigned int totlen;
    zipmapLookupRaw(zm,NULL,0,&totlen); // 这里不需要查找键值对,只需要统计总字节数
    return totlen;
}
```

---

### `static unsigned int zipmapDecodeLength(unsigned char *p);`

#### 功能

通用的获取长度值的方法

#### 源码

```c
/* Decode the encoded length pointed by 'p' */
static unsigned int zipmapDecodeLength(unsigned char *p) {
    unsigned int len = *p; // 获取首地址值

    if (len < ZIPMAP_BIGLEN) return len; // 小于254,直接返回
    memcpy(&len,p+1,sizeof(unsigned int)); // 获取后4(动态)位
    memrev32ifbe(&len); // 将数据按照host本地字节序转化
    return len;
}
```

### `static unsigned int zipmapEncodeLength(unsigned char *p, unsigned int len);`

#### 功能

根据实际长度,获取到编码后占用的字节长度

#### 源码

```c
/* Encode the length 'l' writing it in 'p'. If p is NULL it just returns
 * the amount of bytes required to encode such a length. */
static unsigned int zipmapEncodeLength(unsigned char *p, unsigned int len) {
    if (p == NULL) { // 没有传入zm
        return ZIPMAP_LEN_BYTES(len); // 直接返回容纳这个长度需要的字节数
    } else { // 记录数据长度
        if (len < ZIPMAP_BIGLEN) {
            p[0] = len;
            return 1;
        } else {
            p[0] = ZIPMAP_BIGLEN;
            memcpy(p+1,&len,sizeof(len));
            memrev32ifbe(p+1);
            return 1+sizeof(len);
        }
    }
}
```

### `static unsigned char *zipmapLookupRaw(unsigned char *zm, unsigned char *key, unsigned int klen, unsigned int *totlen);`

#### 功能

key存在,查找指定key所在的头指针
totlen存在,返回整个zm占用的字节长度

#### 源码

```c
/* Search for a matching key, returning a pointer to the entry inside the
 * zipmap. Returns NULL if the key is not found.
 *
 * If NULL is returned, and totlen is not NULL, it is set to the entire
 * size of the zimap, so that the calling function will be able to
 * reallocate the original zipmap to make room for more entries. */
static unsigned char *zipmapLookupRaw(unsigned char *zm, unsigned char *key, unsigned int klen, unsigned int *totlen) {
    unsigned char *p = zm+1, *k = NULL;
    unsigned int l,llen;

    while(*p != ZIPMAP_END) { // 循环遍历字节到结尾
        unsigned char free;

        /* Match or skip the key */
        l = zipmapDecodeLength(p);
        llen = zipmapEncodeLength(NULL,l);
        if (key != NULL && k == NULL && l == klen && !memcmp(p+llen,key,l)) { // 查找匹配的key
            /* Only return when the user doesn't care
             * for the total length of the zipmap. */
            if (totlen != NULL) { // 不需要计算长度,则直接返回,否则继续循环
                k = p;
            } else {
                return p;
            }
        }
        p += llen+l;
        /* Skip the value as well */
        l = zipmapDecodeLength(p);
        p += zipmapEncodeLength(NULL,l);
        free = p[0];
        p += l+1+free; /* +1 to skip the free byte */
    }
    if (totlen != NULL) *totlen = (unsigned int)(p-zm)+1; // 计算最终字节长度
    return k;
}
```

### `static unsigned long zipmapRequiredLength(unsigned int klen, unsigned int vlen);`

#### 功能

根据键值长度,计算存储需要的数据量

#### 源码

```c
static unsigned long zipmapRequiredLength(unsigned int klen, unsigned int vlen) {
    unsigned int l;

    l = klen+vlen+3;
    if (klen >= ZIPMAP_BIGLEN) l += 4;
    if (vlen >= ZIPMAP_BIGLEN) l += 4;
    return l;
}
```

### `static unsigned int zipmapRawKeyLength(unsigned char *p);`

#### 功能

获取key的总长度(数据+长度记录)

#### 源码

```c
/* Return the total amount used by a key (encoded length + payload) */
static unsigned int zipmapRawKeyLength(unsigned char *p) {
    unsigned int l = zipmapDecodeLength(p);
    return zipmapEncodeLength(NULL,l) + l;
}
```

### `static unsigned int zipmapRawValueLength(unsigned char *p);`

#### 功能

获取value的总长度(数据+长度记录)

#### 源码

```c
/* Return the total amount used by a value
 * (encoded length + single byte free count + payload) */
static unsigned int zipmapRawValueLength(unsigned char *p) {
    unsigned int l = zipmapDecodeLength(p);
    unsigned int used;

    used = zipmapEncodeLength(NULL,l);
    used += p[used] + 1 + l; // 多了一个free的处理
    return used;
}
```

### `static unsigned int zipmapRawEntryLength(unsigned char *p);`

#### 功能

获取键值对的完整长度

#### 源码

```c
/* If 'p' points to a key, this function returns the total amount of
 * bytes used to store this entry (entry = key + associated value + trailing
 * free space if any). */
static unsigned int zipmapRawEntryLength(unsigned char *p) {
    unsigned int l = zipmapRawKeyLength(p);
    return l + zipmapRawValueLength(p+l);
}
```

### `static inline unsigned char *zipmapResize(unsigned char *zm, unsigned int len);`

#### 功能

重新设置zm的内存大小(新长度小于就长度会截断)

#### 源码

```c
static inline unsigned char *zipmapResize(unsigned char *zm, unsigned int len) {
    zm = zrealloc(zm, len);
    zm[len-1] = ZIPMAP_END;
    return zm;
}
```
