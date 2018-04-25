---
title: Redis 源码分析-内存管理
tags:
  - redis
  - database
categories:
  - redis
  - source
date: 2018-04-25 16:37:45
---

在所有申请的指定长度的内存前加了一个`sizeof(size_t)`的长度
用于记录实际申请的内存长度,
方便统计内存使用占用和内存使用状态分析

## 相关文件

- zmalloc.h
- zmalloc.c

<!-- more -->

## 相关概念

- RSS
	Resident Set Size,进程实际锁驻留在内存的空间大小,不包括交换区数据(swap)值
	RSS = Shared_Clean + Shared_Dirty + Private_Clean + Private_Dirty
	- Shared_Clean
		多进程共享内存,且其内容未被任意进程修改
	- Shared_Dirty
		多进程共享内存,且其内容已经被某个程序修改
	- Private_Clean
		进程独享内存,且其内容未被修改
	- Private_Dirty
		进程独享内存,且其内容已经被修改
- 内存碎片
	- 内部碎片
		已经被分配给程序进程的,不能被操作系统使用的内存
	- 外部碎片
		没有分配给程序进程,但是因为连续空间过小导致无法使用的内存
- `/proc/self/*`与`/proc/$pid/`
	系统使用`self`来代替`$pid`,实际上两个目录一样的.不同的进程调用`self`是对应的文件夹连接就是自己的`$pid`文件夹连接
- 共享内存
	在Linux中主要是`.so`动态库文件,还有一些其他内容
- 内存对齐
    系统版本与CPU同时决定对齐的位数
    x86是4,x64是8
    gcc中申请的内存默认都是要对齐的,不足位数的需要凑齐为对齐位数的整数倍
    (可以使用`__attribute__ ((__packed__))`来强制不对齐)

## 函数分析

### `void *zmalloc(size_t size);`

#### 功能

申请指定大小的内存,不会初始化

#### 源码

```c
static size_t used_memory = 0;
void *zmalloc(size_t size) {
    void *ptr = malloc(size+PREFIX_SIZE); // `PREFIX_SIZE`就是`sizeof(size_t)`

    if (!ptr) zmalloc_oom_handler(size); // `zmalloc_oom_handler`是当`malloc`失败是Redis的处理机制
#ifdef HAVE_MALLOC_SIZE // `HAVE_MALLOC_SIZE`在GCC中是0,不会定义
    update_zmalloc_stat_alloc(zmalloc_size(ptr));
    return ptr;
#else
    *((size_t*)ptr) = size; // 将申请的内存的开头用于记录申请的内存的大小(不包括记录这个长度所用的PREFIX_SIZE长度)
    update_zmalloc_stat_alloc(size+PREFIX_SIZE); // 更新并记录当前使用的内存大小(实际是更新字段`used_memory`的值)
    return (char*)ptr+PREFIX_SIZE; // 返回新申请的去掉记录长度的字符数组的指针
#endif
}
```

### `static void zmalloc_default_oom(size_t size);`

#### 功能

Redis默认内存`Out Of Memory`的处理函数

#### 源码

```c
static void zmalloc_default_oom(size_t size) {
    fprintf(stderr, "zmalloc: Out of memory trying to allocate %zu bytes\n",
        size); // 记录申请了多少内存失败了
    fflush(stderr); // 立刻写入日志系统
    abort(); // 抛出异常,终止程序继续运行
}
```

### `#define update_zmalloc_stat_alloc(__n)`

#### 功能

记录实际使用的内存的大小(增加)

#### 源码

```c
#define update_zmalloc_stat_alloc(__n) do { \
    size_t _n = (__n); \
    if (_n&(sizeof(long)-1)) _n += sizeof(long)-(_n&(sizeof(long)-1)); \ // 这里是保证used_memory记录的申请的内存的尺寸是8的倍数(malloc本身已经保证申请的内存是8位对齐了)(另外在gcc中64位系统的size_t就是long unsigned int)
    if (zmalloc_thread_safe) { \ // 是否启用线程安全功能
        update_zmalloc_stat_add(_n); \ // 以线程安全的方式增加used_memory
    } else { \
        used_memory += _n; \ // 不考虑线程安全直接增加used_memory
    } \
} while(0) // 这种写法的两个好处:1:代替`{}`可以限制变量作用域;2:可以随时使用break来达到goto的效果
```

### `#define update_zmalloc_stat_add(__n)`

#### 功能

保证线程安全的增加`used_memory`

#### 源码

```c
#define update_zmalloc_stat_add(__n) do { \
    pthread_mutex_lock(&used_memory_mutex); \ // 加锁
    used_memory += (__n); \ // 修改used_memory
    pthread_mutex_unlock(&used_memory_mutex); \ // 解锁
} while(0)
```

---

### `void *zcalloc(size_t size);`

#### 功能

同`zmalloc`一样,但是会将所申请的所有内存初始化为0

#### 源码

```c
void *zcalloc(size_t size) {
    void *ptr = calloc(1, size+PREFIX_SIZE); // 申请并清空带长度的连续内存

    if (!ptr) zmalloc_oom_handler(size); // 内存不足处理
#ifdef HAVE_MALLOC_SIZE
    update_zmalloc_stat_alloc(zmalloc_size(ptr));
    return ptr;
#else
    *((size_t*)ptr) = size; // 记录实际数据长度(无PREFIX_SIZE长度)
    update_zmalloc_stat_alloc(size+PREFIX_SIZE); // 记录实际内存申请数量
    return (char*)ptr+PREFIX_SIZE; // 返回申请的地址指针
#endif
}
```

---

### `void *zrealloc(void *ptr, size_t size);`

#### 功能

重新分配指针的数据的长度,不会初始化新增数据

#### 源码

```c
void *zrealloc(void *ptr, size_t size) {
#ifndef HAVE_MALLOC_SIZE
    void *realptr; // 声明ptr的实际指针(就是从记录长度的头地址开始计算)
#endif
    size_t oldsize; // 原始大小
    void *newptr; // 新分配的指针

    if (ptr == NULL) return zmalloc(size); // 如果原指针是空,则同重新申请地址
#ifdef HAVE_MALLOC_SIZE // 特殊平台操作
    oldsize = zmalloc_size(ptr);
    newptr = realloc(ptr,size);
    if (!newptr) zmalloc_oom_handler(size);

    update_zmalloc_stat_free(oldsize);
    update_zmalloc_stat_alloc(zmalloc_size(newptr));
    return newptr;
#else
    realptr = (char*)ptr-PREFIX_SIZE; // 获取实际指针
    oldsize = *((size_t*)realptr); // 获取实际指针指向的数据长度
    newptr = realloc(realptr,size+PREFIX_SIZE); // 重新非配指针所指的连续内存的大小(分两种情况,1:新需要内存比原内存小或一样,则数据截断;3:新数据长度比旧数据长度长,则申请新数据长度的连续内存,将旧数据按顺序拷贝到新地址中,自动释放旧数据地址指针,返回新地址指针)
    if (!newptr) zmalloc_oom_handler(size); // 内存分配失败处理

    *((size_t*)newptr) = size; // 记录新长度
    update_zmalloc_stat_free(oldsize); // 维护used_memory长度(没有PREFIX_SIZE的原因是一减一增无需处理,是减少计算的优化)
    update_zmalloc_stat_alloc(size); // 维护used_memory长度
    return (char*)newptr+PREFIX_SIZE; // 返回新指针
#endif
}
```

### `#define update_zmalloc_stat_free(__n)`

#### 功能

记录实际使用的内存的大小(减少)

#### 源码

```c
#define update_zmalloc_stat_free(__n) do { \
    size_t _n = (__n); \ // 记录实际使用的内存
    if (_n&(sizeof(long)-1)) _n += sizeof(long)-(_n&(sizeof(long)-1)); \ // 保证内存的对齐
    if (zmalloc_thread_safe) { \ // 是否启用线程安全接口
        update_zmalloc_stat_sub(_n); \ // 线程安全的减少used_memory
    } else { \ // 非线程安全操作
        used_memory -= _n; \ // 减少used_memory
    } \
} while(0)
```

### `#define update_zmalloc_stat_sub(__n)`

#### 功能

保证线程安全的减小`used_memory`

#### 源码

```c
#define update_zmalloc_stat_sub(__n) do { \
    pthread_mutex_lock(&used_memory_mutex); \ // 上锁
    used_memory -= (__n); \ // 减少used_memory
    pthread_mutex_unlock(&used_memory_mutex); \ // 解锁
} while(0)
```

---

### `void zfree(void *ptr);`

#### 功能

释放指针空间

#### 源码

```c
void zfree(void *ptr) {
#ifndef HAVE_MALLOC_SIZE
    void *realptr; // 实际指针
    size_t oldsize; // 实际指针数据长度
#endif

    if (ptr == NULL) return; // 空指针直接返回
#ifdef HAVE_MALLOC_SIZE
    update_zmalloc_stat_free(zmalloc_size(ptr));
    free(ptr);
#else
    realptr = (char*)ptr-PREFIX_SIZE; // 获取实际指针
    oldsize = *((size_t*)realptr); // 获取实际指针数据长度
    update_zmalloc_stat_free(oldsize+PREFIX_SIZE); // 维护used_memory,减少实际使用内存的记录值
    free(realptr); // 释放实际指针
#endif
}
```

---

### `char *zstrdup(const char *s);`

#### 功能

字符串复制(因为复制的原始字符串结尾是什么,这里复制出的字符串结尾就是什么(一定是`\0`))

#### 源码

```c
char *zstrdup(const char *s) {
    size_t l = strlen(s)+1; // 获取字符串长度+1
    char *p = zmalloc(l); // 申请新的连续内存

    memcpy(p,s,l); // 复制字符串
    return p; // 返回新的字符串指针
}
```

---

### `size_t zmalloc_used_memory(void);`

#### 功能

获取当前已经使用的内存大小(字节)(used_memory的值)

#### 源码

```c
size_t zmalloc_used_memory(void) {
    size_t um;

    if (zmalloc_thread_safe) { // 是否使用线程安全接口
#if defined(__ATOMIC_RELAXED) || defined(HAVE_ATOMIC)
        um = update_zmalloc_stat_add(0);
#else
        pthread_mutex_lock(&used_memory_mutex); // 上锁
        um = used_memory; // 复制
        pthread_mutex_unlock(&used_memory_mutex); // 解锁
#endif
    }
    else { // 非线程安全
        um = used_memory; // 复制
    }

    return um; // 返回当前内存用量
}
```

### `void zmalloc_enable_thread_safeness(void);`

#### 功能

开启内存用量记录的线程安全模式(开启后所有内存用量记录都会上锁)

#### 源码

```c
static int zmalloc_thread_safe = 0;
void zmalloc_enable_thread_safeness(void) {
    zmalloc_thread_safe = 1; // 标记为真
}
```

### `void zmalloc_set_oom_handler(void (*oom_handler)(size_t));`

#### 功能

设置内存溢出触发时的回调函数

#### 源码

```c
static void (*zmalloc_oom_handler)(size_t) = zmalloc_default_oom;
void zmalloc_set_oom_handler(void (*oom_handler)(size_t)) {
    zmalloc_oom_handler = oom_handler; // 设置函数指针
}
```

### `float zmalloc_get_fragmentation_ratio(size_t rss);`

#### 功能

获取当前Redis的内存碎片率(内部碎片)

#### 源码

```c
float zmalloc_get_fragmentation_ratio(size_t rss) {
    return (float)rss/zmalloc_used_memory(); // rss是程序占用的所有内存(文件内存+匿名内存)(包含共享内存)(rss内存有重复统计的可能);zmalloc_used_memory就是实际redis通过命令分配出去的内存大小;这里的rss值使用过`serverCron`函数循环调用更新的
}
```

### `size_t zmalloc_get_rss(void);`

#### 功能

通过系统信息截取到当前Redis使用的RSS(Resident Set Size)(进程实际所驻留在内存的空间大小,不包括交换区数据(swap))值

#### 源码

```c
size_t zmalloc_get_rss(void) {
    int page = sysconf(_SC_PAGESIZE); // 获取单个页面大小
    size_t rss; // 声明rss
    char buf[4096]; // 数据缓冲
    char filename[256]; // 文件名
    int fd, count;
    char *p, *x;

    snprintf(filename,256,"/proc/%d/stat",getpid()); // 拼接Redis的相关进程状态文件名
    if ((fd = open(filename,O_RDONLY)) == -1) return 0; // 打开状态文件
    if (read(fd,buf,4096) <= 0) { // 读取全部状态文件
        close(fd);
        return 0;
    }
    close(fd); // 关闭fd

    p = buf;
    count = 23; /* RSS is the 24th field in /proc/<pid>/stat */
    while(p && count--) { // 获取文件中的rss的页面数量
        p = strchr(p,' ');
        if (p) p++;
    }
    if (!p) return 0;
    x = strchr(p,' ');
    if (!x) return 0;
    *x = '\0';

    rss = strtoll(p,NULL,10); // 字符串转数字(10进制)
    rss *= page; // 程序占用总内存=单个页面尺寸*页面总数
    return rss;
}
```

### `size_t zmalloc_get_private_dirty(void);`

#### 功能

获取当前Redis所有私有的已实际使用过的内存的大小(字节)

#### 源码

```c
size_t zmalloc_get_private_dirty(void) {
    return zmalloc_get_smap_bytes_by_field("Private_Dirty:"); // 获取"Private_Dirty"字段
}
```

### `size_t zmalloc_get_smap_bytes_by_field(char *field);`

#### 功能

根据参数字段,在`/proc/self/smaps`中(就是当前进程的smaps文件)中查找对应的属性的值

#### 源码

```c
size_t zmalloc_get_smap_bytes_by_field(char *field) {
    char line[1024];
    size_t bytes = 0;
    FILE *fp = fopen("/proc/self/smaps","r"); // 打开状态文件
    int flen = strlen(field);

    if (!fp) return 0;
    while(fgets(line,sizeof(line),fp) != NULL) { // 逐行读取
        if (strncmp(line,field,flen) == 0) { // 查找字段
            char *p = strchr(line,'k');
            if (p) {
                *p = '\0';
                bytes += strtol(line+flen,NULL,10) * 1024; // 将字符串转化为数字并从`kb`转化成`byte`
            }
        }
    }
    fclose(fp); // 关闭文件
    return bytes;
}
```

### `size_t zmalloc_get_memory_size(void);`

#### 功能

简洁的获得物理内存尺寸(单位:字节)(跨平台)

#### 源码

```c
size_t zmalloc_get_memory_size(void) {
#if defined(__unix__) || defined(__unix) || defined(unix) || \
    (defined(__APPLE__) && defined(__MACH__))
#if defined(CTL_HW) && (defined(HW_MEMSIZE) || defined(HW_PHYSMEM64))
    int mib[2];
    mib[0] = CTL_HW;
#if defined(HW_MEMSIZE)
    mib[1] = HW_MEMSIZE;            /* OSX. --------------------- */
#elif defined(HW_PHYSMEM64)
    mib[1] = HW_PHYSMEM64;          /* NetBSD, OpenBSD. --------- */
#endif
    int64_t size = 0;               /* 64-bit */
    size_t len = sizeof(size);
    if (sysctl( mib, 2, &size, &len, NULL, 0) == 0)
        return (size_t)size;
    return 0L;          /* Failed? */

#elif defined(_SC_PHYS_PAGES) && defined(_SC_PAGESIZE)
    /* FreeBSD, Linux, OpenBSD, and Solaris. -------------------- */
    return (size_t)sysconf(_SC_PHYS_PAGES) * (size_t)sysconf(_SC_PAGESIZE);

#elif defined(CTL_HW) && (defined(HW_PHYSMEM) || defined(HW_REALMEM))
    /* DragonFly BSD, FreeBSD, NetBSD, OpenBSD, and OSX. -------- */
    int mib[2];
    mib[0] = CTL_HW;
#if defined(HW_REALMEM)
    mib[1] = HW_REALMEM;        /* FreeBSD. ----------------- */
#elif defined(HW_PYSMEM)
    mib[1] = HW_PHYSMEM;        /* Others. ------------------ */
#endif
    unsigned int size = 0;      /* 32-bit */
    size_t len = sizeof(size);
    if (sysctl(mib, 2, &size, &len, NULL, 0) == 0)
        return (size_t)size;
    return 0L;          /* Failed? */
#else
    return 0L;          /* Unknown method to get the data. */
#endif
#else
    return 0L;          /* Unknown OS. */
#endif
}
```

### `void zlibc_free(void *ptr);`

#### 功能

libc的free的封装(This is useful for instance to free results obtained by backtrace_symbols())

#### 源码

```c
void zlibc_free(void *ptr) {
    free(ptr);
}
```

### `size_t zmalloc_size(void *ptr)`

#### 功能

获取按位对齐后的实际指针所占用的总内存量

#### 源码

```c
size_t zmalloc_size(void *ptr) {
    void *realptr = (char*)ptr-PREFIX_SIZE;
    size_t size = *((size_t*)realptr);
    /* Assume at least that all the allocations are padded at sizeof(long) by
     * the underlying allocator. */
    if (size&(sizeof(long)-1)) size += sizeof(long)-(size&(sizeof(long)-1));
    return size+PREFIX_SIZE;
}
```
