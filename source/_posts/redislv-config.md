---
title: REDISLV配置分析
tags:
  - redis
  - redislv
  - configuration
categories:
  - redis
date: 2018-07-19 20:31:07
---

REDISLV的配置文件解析redis-config.md

## 使用配置文件的方法

```bash
./redis-server $(path)/redis.conf
```

## 常用修改参数

```conf
bind 127.0.0.1
port 6379
```

## INCLUDE

使用include可以引用其他配置文件
使用用方法:`include $(path)/xxx.conf`
可以同时使用多个include

注:**redis是按照顺序解析配置文件参数的,同样的参数后面的设置会覆盖前面的设置**
如果不希望include被覆盖,
就将include放置在配置文件最后,
否则就放在前面的位置

<!-- more -->
## NETWORK

### bind

#### 说明

使用bind参数开启网络监听绑定
只有被bind的地址的主机可以访问数据库
可以同时bind多个ip(根据代码内宏定义,最多16个ip)

```c
#define CONFIG_BINDADDR_MAX 16
```
如果没有bind参数,则接受所有主机的访问

#### 例子

```conf
bind 192.168.1.100 10.0.0.1
```

### protected-mode

#### 说明

额外一层防护,防止用户忘记限制ip,同时忘记密码
就将数据库暴露在公网上

#### 例子

```conf
protected-mode yes
protected-mode no
```

#### 校验触发条件

1. 开启protected-mode
2. 没用bind任何ip
3. 没有启用密码校验
4. 客户端不是通过unix-socket连接过来的
5. 不是来自本机客户端的连接操作

同时满足上述条件,则会返回连接失败提示,并告知失败原因

对应代码`acceptCommonHandler`中

```c
if (server.protected_mode &&
        server.bindaddr_count == 0 &&
        server.requirepass == NULL &&
        !(flags & CLIENT_UNIX_SOCKET) &&
        ip != NULL)
    {
        if (strcmp(ip,"127.0.0.1") && strcmp(ip,"::1")) {
            ...
        }
    }
```

### port

#### 说明

监听端口
设置为0则不开启网络端口监听

#### 例子

```conf
prot 6379
```

### tcp-backlog

#### 说明

只有当每秒钟有很多个客户端进行连接数据库时才需要扩大这个值

1. backlog本身
tcp-backlog是对应函数`listen(backlog)`中的参数的一个值
backlog本身是一个队列长度
当同时请求连接的数量超过这个值时,
会连接失败.

注:**这个值不是最大连接数,是等待处理连接的数量.**
当多个连接间隔时间比较长的情况下连接服务器,是不会超出连接等待队列的

2. backlog的值
redis的配置文件本身可以设置一个值
系统`/proc/sys/net/core/somaxconn`文件中也有一个这个值
实际上这个值是这两个位置的最小值
如果需要扩大这个值,需要同时扩大这两个地方

#### 例子

```conf
tcp-backlog 511
```

### unixsocket

#### 说明

该功能默认关闭
模式使用普通网络通信端口进行通信
该功能是使用unixsocket进行与客户端之间的通信

##### unixsocket本身的说明

unixsocket是unix根据一般的网络IPC通信发展出来的本地文件通信方式.
是通过一个文件进行本地进程之间的通信.
传统IPC通信是不稳定,不可靠,有乱序.
而unixsocket通信是稳定可靠,无乱序,不需要校验的.

#### 例子

```conf
unixsocket /tmp/redis.sock # 指定进行通信的文件
unixsocketperm 777 # 指定对文件的操作权限(700可能会无法清除缓存?没有尝试过)
```

### timeout

#### 说明

客户端连接超时配置
单位:秒
客户端与服务器上次交互时间到现在超过这个时间则会被断开连接
参数:0,无时间限制

#### 例子

```conf
timeout 0
```

### tcp-keepalive

#### 说明

tcp保持连接的心跳跑检测时间设置
tcp网络本身提供了心跳包的检测参数配置
可以用于检测客户端是否掉线
tcp-keepalive参数单位:秒

##### SO_KEEPALIVE说明

- `SO_KEEPALIVE`,这个是表明启用TCP心跳包
- `TCP_KEEPIDLE`,连续多长时间(秒)后没有通信,则发送心跳包
- `TCP_KEEPINTVL`,发送心跳包的间隔时间
- `TCP_KEEPCNT`,心跳包发送的次数,连续多少次发送没有返回,则说明断开连接,只要有一次返回,则不会发送后续的心跳包

注:这个心跳包本身可能有些地方检测不了,当远端突然掉线,拔网线,关机等操作行为导致无法连接时,
心跳包机制会以为是发送失败不断重新发送单条协议,而不是判断已经掉线了.TCP的自动重传机制优先度要
高于KEEPALIVE机制,导致我们只知道我们自己发送失败,而不是对方已经掉线.

```cpp
/* Set TCP keep alive option to detect dead peers. The interval option
 * is only used for Linux as we are using Linux-specific APIs to set
 * the probe send time, interval, and count. */
int anetKeepAlive(char *err, int fd, int interval)
{
    int val = 1;

    if (setsockopt(fd, SOL_SOCKET, SO_KEEPALIVE, &val, sizeof(val)) == -1)
    {
        anetSetError(err, "setsockopt SO_KEEPALIVE: %s", strerror(errno));
        return ANET_ERR;
    }

#ifdef __linux__
    /* Default settings are more or less garbage, with the keepalive time
     * set to 7200 by default on Linux. Modify settings to make the feature
     * actually useful. */

    /* Send first probe after interval. */
    val = interval;
    if (setsockopt(fd, IPPROTO_TCP, TCP_KEEPIDLE, &val, sizeof(val)) < 0) {
        anetSetError(err, "setsockopt TCP_KEEPIDLE: %s\n", strerror(errno));
        return ANET_ERR;
    }

    /* Send next probes after the specified interval. Note that we set the
     * delay as interval / 3, as we send three probes before detecting
     * an error (see the next setsockopt call). */
    val = interval/3;
    if (val == 0) val = 1;
    if (setsockopt(fd, IPPROTO_TCP, TCP_KEEPINTVL, &val, sizeof(val)) < 0) {
        anetSetError(err, "setsockopt TCP_KEEPINTVL: %s\n", strerror(errno));
        return ANET_ERR;
    }

    /* Consider the socket in error state after three we send three ACK
     * probes without getting a reply. */
    val = 3;
    if (setsockopt(fd, IPPROTO_TCP, TCP_KEEPCNT, &val, sizeof(val)) < 0) {
        anetSetError(err, "setsockopt TCP_KEEPCNT: %s\n", strerror(errno));
        return ANET_ERR;
    }
#else
    ((void) interval); /* Avoid unused var warning for non Linux systems. */
#endif

    return ANET_OK;
}
```

#### 例子

```conf
tcp-keepalive 300
```

## GENERAL

### daemonize

#### 说明

标明redis进程为前台进程还是后台守护进程

- 前台进程,当远程连接关闭后,进程也会随之关闭
- 后台进程,当远程连接关闭后,进程不会随之关闭,同时会在`/var/run/redis.pid`文件中记录当前进程的pid

#### 例子

```conf
daemonize yes
```

### supervised

#### 说明

提供不同方式的redis启动和管理的配置
- `no`,没有启动控制系统,手动启动关闭
- `upstart`,以upstart方式启动redis
- `systemd`,以`systemctl`方式启动redis
- `auto`,自动判断是以上那种方式

#### 例子

```conf
supervised no
```

### pidfile

#### 说明

- 前台运行时,不指定这个文件,则不会生成pid文件
- 后台运行时,指定这个文件则在这个文件生成,否则会在默认文件`/var/run/redis.pid`中生成

进程结束后会删除这个文件
另外,即时创建pid文件失败也不会影响redis的正常运行

#### 例子

```conf
pidfile /var/run/redis-6379.pid
```

### loglevel

#### 说明

日志等级
- debug,最多日志输出
- verbose,比debug少
- notice,比verbose少,一般用于实际生产中
- warning,只看最重要的信息

#### 例子

```conf
loglevel notice
```

### logfile

#### 说明

日志文件(完整地址:路径+文件名)
为空表示使用标准输出

- 前台运行,控制台可以直接看到
- 后台运行,直接输出到`/dev/null`中,不会有日志存在

#### 例子

```conf
logfile "redis.log"
```

### syslog-enabled

#### 说明

是否使用系统日志记录
默认是关闭
和上面配置的logfile不冲突,同时开启会记录双份日志

#### 例子

```conf
syslog-enabled yes
```

### syslog-ident

#### 说明

系统日志的标识名称
在`/var/log/message`日志文件中的每行日志都有这个文字作为日志来源的标识
TODO:PAN 具体功能有待测试

#### 例子

```conf
syslog-ident redis
```

### syslog-facility

#### 说明

表明日志的来源信息

```cpp
/* facility codes */
#define	LOG_KERN	(0<<3)	/* kernel messages */
#define	LOG_USER	(1<<3)	/* random user-level messages */
#define	LOG_MAIL	(2<<3)	/* mail system */
#define	LOG_DAEMON	(3<<3)	/* system daemons */
#define	LOG_AUTH	(4<<3)	/* security/authorization messages */
#define	LOG_SYSLOG	(5<<3)	/* messages generated internally by syslogd */
#define	LOG_LPR		(6<<3)	/* line printer subsystem */
#define	LOG_NEWS	(7<<3)	/* network news subsystem */
#define	LOG_UUCP	(8<<3)	/* UUCP subsystem */
#define	LOG_CRON	(9<<3)	/* clock daemon */
#define	LOG_AUTHPRIV	(10<<3)	/* security/authorization messages (private) */
#define	LOG_FTP		(11<<3)	/* ftp daemon */

/* other codes through 15 reserved for system use */
#define	LOG_LOCAL0	(16<<3)	/* reserved for local use */
#define	LOG_LOCAL1	(17<<3)	/* reserved for local use */
#define	LOG_LOCAL2	(18<<3)	/* reserved for local use */
#define	LOG_LOCAL3	(19<<3)	/* reserved for local use */
#define	LOG_LOCAL4	(20<<3)	/* reserved for local use */
#define	LOG_LOCAL5	(21<<3)	/* reserved for local use */
#define	LOG_LOCAL6	(22<<3)	/* reserved for local use */
#define	LOG_LOCAL7	(23<<3)	/* reserved for local use */

configEnum syslog_facility_enum[] = {
    {"user",    LOG_USER},
    {"local0",  LOG_LOCAL0},
    {"local1",  LOG_LOCAL1},
    {"local2",  LOG_LOCAL2},
    {"local3",  LOG_LOCAL3},
    {"local4",  LOG_LOCAL4},
    {"local5",  LOG_LOCAL5},
    {"local6",  LOG_LOCAL6},
    {"local7",  LOG_LOCAL7},
    {NULL, 0}
};
```

#### 例子

```conf
syslog-facility local0
```

### databases

#### 说明

数据库的数量
默认数量是16,
分别对应数据库编号:0-15,
初始数据库使用的时候0
可以通过使用命令`select ${dbnum}`来切换当前使用的数据库

#### 例子

```conf
databases 16
```

## SNAPSHOTTING

### save

#### 说明

- 条件
	- <=指定时间
	- \>=指定次数
- 结果
	- 保存数据到硬盘

另外:该参数不会互相覆盖,本质是一个数组,校验的时候会遍历每条数据的条件进行
`save ""`会重置它所在行之前的所有save命令,是一个清空的功能

#### 例子

```conf
save 900 1
save 300 10
save 60 10000
```

### stop-writes-on-bgsave-error

#### 说明

当后台保存数据到硬盘失败时,
是否停止对redis的写命令的执行.
默认为开启.

当最近一次对数据持久化写硬盘失败后,
会在内存中标记写硬盘失败.
当该选项开启时,写硬盘失败的话,
会同时停止redis对所有写命令的执行.
已这种方式来提示用户硬盘写入有问题.

当出现问题后,再次后台保存数据成功时,
redis会自动恢复对写命令的执行.

#### 例子

```conf
stop-writes-on-bgsave-error yes
```

### rdbcompression

#### 说明

在进行rdb的dump时,是否对内容进行lzf压缩
默认开启,
如果为了节省cpu,可以关闭,但是可能会占用更多硬盘

#### 例子

```conf
rdbcompression yes
```

### rdbchecksum

#### 说明

rdb保存在版本5之后会在结尾追加8字节的checksum
这个校验和可以增加数据的完整性安全,
但是会额外增加大概10%的性能消耗
默认开启

#### 例子

```conf
rdbchecksum yes
```

### dbfilename

#### 说明

rdb保存时对应的文件名

#### 例子

```conf
dbfilename dump.rdb
```

### dir

#### 说明

rdb,aof文件保存时所在的文件夹
**这里必须是文件夹,而不是一个文件**
注:leveldb数据保存不在这个文件夹

#### 例子

```conf
dir ./
```

## REPLICATION

主从备份
一个主数据库可以对应多个从数据库
从数据库的数据是从主数据库异步同步过来的

1. 同步是异步的,但是可以设置主数据库的最少从数据库连接数.
	当当前连接的从数据库数量少于最少配置数量时,可以停止
	主数据库对写命令的执行
2. 当从数据库在相对短的时间内与主数据库断开连接口,再次连接
	时,可以对局部的数据进行重新同步.这个相对短的时间取决于
	主数据库设置的backlog的大小
3. 主从备份是自动的,无需手动操作,网络断线后会自动重连

### slaveof

#### 说明

指明自己是那个redis的从数据库

#### 例子

```conf
slaveof 127.0.0.1 6688
```

### masterauth

#### 说明

如果master启动了密码认证
从服务器连接的时候就需要提供密码
这里是设置连接主服务器时用的密码的设置

#### 例子

```conf
masterauth <master-password>
```

### slave-serve-stale-data

#### 说明

当从数据库数据不是最新的时候是否提供数据读写服务

可能发生的原因
- 从数据库与主数据库断开连接
- 从数据库正在从主数据库备份数据过程中

处理方式
- 当该参数设置为真,会使用旧数据提供读写服务
- 当该参数设置为假,除了命令`info`和`slaveof`
	之外的所有命令都会得到`SYNC with master in progress`的错误信息

#### 例子

```conf
slave-serve-stale-data yes
```

### slave-read-only

#### 说明

从数据库是否可写
有的时候可能有从数据库可以给非主数据库连接改些的情况(正常不用)
从数据库即使设置成只读,
也不会屏蔽掉一些管理命令,
比如`config`,`debug`之类的,
如果为了安全考虑,可以使用`rename-command`来隐藏这些命令

#### 例子

```conf
slave-read-only yes
```

### repl-diskless-sync

#### 说明

当全新的从数据库连接或者重连的从数据库已经超过backlog提供的恢复信息后
从数据库需要一个完整的数据同步来达到和主数据库一直的状态
有两种方式
- 基于硬盘数据的
	主数据库新建进程来创建RDB文件,
	主数据库进程将这个RDB文件增量传输给需要的从数据库
- 无硬盘的
	主数据库新建进程
	新进程直接创建RDB文件并并直接通过socket发送给相应的从数据库
	在硬盘慢带宽大的情况下效果更好

#### 例子

```conf
repl-diskless-sync no
```

### repl-diskless-sync-delay

#### 说明

复制同步的延迟
当无硬盘备份启动时
一旦传输开始,到传输完成为止,
期间都不能为新增的从数据库提供同步服务
这个延迟是为了等待更多的从数据库
进行平行同步用的
单位(秒)
设置为0则是禁用延迟,立刻同步

#### 例子

```conf
repl-diskless-sync-delay 5
```

### repl-ping-slave-period 

#### 说明

主数据库定时ping从数据库,
用于检测从数据库是否掉线失去连接.
单位:秒
默认10秒

#### 例子

```conf
repl-ping-slave-period 10
```

### repl-timeout

#### 说明

这是一个公用的超时时间设置

- 从数据库长时间没有收到主数据库的数据信息
	- 连接过程中
	- 连接成功后
	- 数据库传输过程中
- 主数据库长时间没有收到从数据库的数据信息
	- 没有收到ACK信息

#### 例子

```conf
repl-timeout 60
```

### repl-disable-tcp-nodelay

#### 说明

是否禁用TCP的nodelay选项
禁用后会降低slave的延迟,但是会增加通信量
这个配置很绕
- no是没有延迟高带宽负载
- yes是有延迟低带宽负载

#### 例子

```conf
repl-disable-tcp-nodelay no
```

### repl-backlog-size

#### 说明

主从备份的backlog的日志大小
当从数据库与主数据库断开一段时间内
只要间隔操作还在backlog的记录时间内
都可以通过主数据库的backlog来进行数据恢复
而不是一次完整的同步
backlog只有在任意从数据库初次连接时才会分配内存

#### 例子

```conf
repl-backlog-size 1mb
```

### repl-backlog-ttl

#### 说明

当没有任何从数据库连接时
主数据库释放backlog内存空间的延时时间
单位:秒
从最后一个从数据库断开连接后开始计时

#### 例子

```conf
repl-backlog-ttl 3600
```

### slave-priority

#### 说明

当有哨兵存在时有效
哨兵会根据这个值来决定当主数据库失效无法连接时,
选取那个从数据库提升为主数据库.
哨兵会选取这个值最小的为主数据库.
当这个值为0时,表示该数据库不会被选为主数据库.

注:哨兵为`redis-sentinel`这个程序,启动哨兵只需要修改`sentinel.conf`
文件中的主数据库的ip和端口就可以了,哨兵在连接主数据库失败时会自动
选举主数据库.
注:客户端需要连接哨兵才能知道是那个数据库被提升为主数据库了.

#### 例子

```conf
slave-priority 100
```

### min-slaves-to-write & min-slaves-max-lag

#### 说明

redis可以根据从数据库的数量和从数据库的连接延迟来
组织写命令的执行.
这是保证数据安全的一种机制

- `min-slaves-to-write`,最小从数据库数量,当从数据库数量<这个值时,主数据库禁用写命令
- `min-slaves-max-lag`,从数据库最大延迟时间,当单个从数据库的延迟时间<这个值时,从数据库数量+1,单位:秒

只有同时设置这两个参数,功能才会生效,任意一个没有设置或为0
功能不生效

#### 例子

```conf
min-slaves-to-write 3
min-slaves-max-lag 10
```

## SECURITY

### requirepass

#### 说明

密码设置,默认注释
因为一般都是本机运行
因为redis很快,每秒钟可以尝试150k次密码校验
所以除非密码异常复杂,否则很容易被试出来.
没有任何加密,就是明码字符串,
和客户端传来的字符串做比较

#### 例子

```conf
requirepass foobared
```

### rename-command

#### 说明

重命名命令
因为有一些命令非常危险
重命名命令为一些很难想想的内容可以保证安全,同时又不影响内部管理员的使用
重命名命令为空字符串会完全禁用这个命令

注:**如果使用aof记录数据或者存在从数据库,使用重命名命令可能会导致问题,因为它们的命令可能还是以前正常的命令**

#### 例子

```conf
rename-command CONFIG b840fc02d524045429941cc15f59e41cb7be6c52
rename-command CONFIG ""
```

## LIMITS

### maxclients

#### 说明

redis可以同时连接的最大客户端数量
因为redis内部也会有模拟客户端连接
所以实际上可以同时连接的最大客户端数量为
这个值-32的结果.
当连接数超过这个值时,后面的连接会受到'max number of clients reached'
默认值为10000

#### 例子

```conf
maxclients 10000
```

### maxmemory 

#### 说明

redis存储数据(不包括主从备份使用的通信用缓冲区大小)内存使用的大小限制
单位:字节

当maxmemory为0时
- 32位机器,maxmemory自动设置为3GB
- 64位机器,maxmemory为0(不做限制)

#### 例子

```conf
maxmemory <bytes>
```

### maxmemory-policy

#### 说明

当内存到达上限时,
redis的内存策略

- volatile-lru,根据LRU规则删除有时效的数据
- allkeys-lru,根据LRU规则删除所有的数据
- volatile-random,随机删除有时效的数据
- allkeys-random,随机删除所有的数据
- volatile-ttl,根据键的失效时间排序,按最快失效的键依次删除(不是精确排序)
- noeviction,不删除,只返回错误

**redis模式采用的是volatile-lru规则**
该配置配合maxmemory来使用,当maxmemory非0时(x32会自动设置为3GB,要注意),
会按照这条规则处理超出内存的数据

#### 例子

```conf
maxmemory-policy volatile-lru
```

### maxmemory-samples

#### 说明

LRU算法和TTL算法都不是精确算法
而是估算算法(可以提高效率)
这个参数是算法的样本个数
取这个个数的值的样本进行比较得出的键就是算法的结果
提高这个值会降低效率,但是会提高算法精度

#### 例子

```conf
maxmemory-samples 3
```

## APPEND ONLY MODE

### appendonly 

#### 说明

是否开启AOF功能
AOF是相对于RDB的另外一种REDIS自带的数据持久化功能
RDB在发生突发情况(断电,REDIS崩溃)后,会丢失自上次保存后的所有数据
AOF只会丢失突发情况前1秒钟的内容,是一种持续持久化方式
AOF可以和RDB同时开启,当同时开启时,REDIS会使用AOF的存储文件,
因为AOF相对更可靠一些.

#### 例子

```conf
appendonly no
```

### appendfilename

#### 说明

AOF保存的文件名

#### 例子

```conf
appendfilename "appendonly.aof"
```

### appendfsync 

#### 说明

文件写入磁盘实际是有延迟的,
这个参数的作用是何时通知系统将日志写入磁盘

- no,不通知,按操作系统内部逻辑写磁盘
- everysec,每秒通知系统写磁盘
- always,每次变更都通知系统写磁盘

#### 例子

```conf
appendfsync everysec
```

### no-appendfsync-on-rewrite

#### 说明

当有子进程正在写AOF或者RDB文件时,
同时还要追加写AOF日志会使Redis在fsync()阻塞
比较长的时间,解决方法是当有子进程
在写文件时,日志追加写文件为等同于不通知,
这样就不会阻塞很长时间了.
但是有可能在发生灾难情况后丢失比较长时间的日志.
默认为关闭,当性能有问题时,可以打开.

#### 例子

```conf
no-appendfsync-on-rewrite no
```

### auto-aof-rewrite-percentage & auto-aof-rewrite-min-size

#### 说明

AOF有自动重写功能
当AOF文件尺寸超过基础尺寸的该设置的百分比时
会对AOF文件进行重写合并处理
最小尺寸表示最小进行合并的值,
当AOF文件不到这个尺寸是,即时满足百分比条件
也不会进行重写(太小了,重写没有意义)
当AOF重写百分比设置为0是,是关闭该功能,
关闭后将不会自动重写AOF文件
基础尺寸是本次启动时的尺寸,和最后一次重写后的尺寸

#### 例子

```conf
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb
```

### aof-load-truncated

#### 说明

当AOF文件因为系统原因导致不完整时
(宕机,断电等原因)是否读取不完整的
AOF文件.
注:当AOF文件从中间断掉了,还是会退出
启动,该选项只会在尝试读取指定数量的
字节数据失败时生效
TODO:PAN 这里不是理解的很清楚,后面需要在查看下

#### 例子

```conf
aof-load-truncated yes
```

## LUA SCRIPTING

### lua-time-limit

#### 说明

脚本执行超时的警告时间设置
lua脚本执行的毫秒数超出这个值,
则会在日志中记录超时警告.
这个值设置为0则关闭警告,无限时间等待脚本执行完成.
这个时候执行脚本的客户端除了等待
脚本执行完毕后,只有两条命令可以执行

- `script kill`,在脚本没有调用写命令时可以调用,可以停止脚本的执行
- `shutdown nosave`,当脚本已经调用了写命令操作后,只能通过关闭redis来终止脚本执行

#### 例子

```conf
lua-time-limit 5000
```

## SLOW LOG

### slowlog-log-slower-than

#### 说明

慢日志触发的时间
单位:微秒
1000000微秒=1秒
当命令的执行时间(不包含I/O操作)(实际就是命令对应的的`proc`函数的执行时间)超过这个设置的时间后
会被记录到慢日志当中
用于查询执行缓慢的命令
设置为0则每条命令都记录
设置为负数则关闭该功能

时间统计

```c
start = ustime();
//if true 说明是在leveldb下禁止的命令.直接回复error
if (c->cmd->flags & REDIS_CMD_FORBID_LEVELDB) {
	addReplyErrorFormat(c,"command:%s invalid in leveldb", c->cmd->name);
} else {
	c->cmd->proc(c);
}
duration = ustime()-start;
```

#### 例子

```conf
slowlog-log-slower-than 10000
```

### slowlog-max-len

#### 说明

慢日志的最大条目数
这个没有限制具体的大小限制
但是要注意,这个记录会占用内存
如有需要,可以使用命令`slowlog reset`
来重置慢日志记录

#### 例子

```conf
slowlog-max-len 128
```

## LATENCY MONITOR

### latency-monitor-threshold

#### 说明

延迟监控
纳入延迟监控的命令的运行时间.
redis是单线程的,处理命令只能逐个处理
帮助用户检查排除可能导致延迟的问题.
单位:毫秒
当延迟值>=设置值时,会增加记录
使用`latency`命令可以查看记录的详细信息
默认关闭
因为会影响性能

#### 例子

```conf
latency-monitor-threshold 0
```

## Event notification

### notify-keyspace-events

#### 说明

pub/sub功能的监听内容设置
参数说明:
```conf
#  K     Keyspace events, published with __keyspace@<db>__ prefix.
#  E     Keyevent events, published with __keyevent@<db>__ prefix.
#  g     Generic commands (non-type specific) like DEL, EXPIRE, RENAME, ...
#  $     String commands
#  l     List commands
#  s     Set commands
#  h     Hash commands
#  z     Sorted set commands
#  x     Expired events (events generated every time a key expires)
#  e     Evicted events (events generated when a key is evicted for maxmemory)
#  A     Alias for g$lshzxe, so that the "AKE" string means all the events.
```
两种事件类型:K/E,
如果要使用该功能,必须至少监听其中一种
然后在配合具体的监听对象来启用监听时间
开启监听后
客户端添加订阅redis的监听,并提供相应的回调处理
当监听时间发生后,
客户端对应的回调函数会收到redis的调用.
默认为""关闭,
因为大部分情况下都用不到
也会消耗性能

#### 例子

监听所有的键过期事件

```conf
notify-keyspace-events Ex
```

## ADVANCED CONFIG

### hash-max-ziplist-entries & hash-max-ziplist-value

#### 说明

哈希表在元素数<=配置值,
并且每个元素的长度<=配置值时,
Redis启用特殊编码,对数据进行封装
而不是直接使用哈希表.
这对内存大小和查询性能都有优化

#### 例子

```conf
hash-max-ziplist-entries 512
hash-max-ziplist-value 64
```

### list-max-ziplist-entries & list-max-ziplist-value

#### 例子

列表元素数<=配置值,
并且列表元素长度<=配置值,
会使用压缩数据优化.

#### 例子

```conf
list-max-ziplist-entries 512
list-max-ziplist-value 64
```

### set-max-intset-entries

#### 说明

由`int64_t`组成的set在
元素个数<=配置值时,
会使用压缩数据优化.

#### 例子

```conf
set-max-intset-entries 512
```

### zset-max-ziplist-entries & zset-max-ziplist-value

#### 说明

当有序set的元素个数<=配置值,
并且元素的长度都<=配置值,
会使用压缩数据优化.

#### 例子

```conf
zset-max-ziplist-entries 128
zset-max-ziplist-value 64
```

### hll-sparse-max-bytes

#### 说明

MARK:hll的功能其实完全不知道
稀疏结构的最大字节数
默认值3000
当不关心cpu而在意内存占用的话
可以设置为10000
可用值范围一般为0-15000
当设置为16000时还不如使用密集结构

#### 例子

```conf
hll-sparse-max-bytes 3000
```

### activerehashing 

#### 说明

这是对redis最上层的哈希表的rehash的处理方式
是否主动rehash
主动rehash会节省内存,但是会占用cpu(1/100)的时间
默认的dict是被动rehash,当dict被操作时,才会进行
rehash,不会占用额外cpu时间,但是当没有访问表时,
会导致rehash停止,从而会占用更多的内存
默认是开启主动rehash,节省内存

#### 例子

```conf
activerehashing yes
```

### client-output-buffer-limit

#### 说明

当客户端读取数据速度比不上服务器推送的速度时
服务端的推送数据缓冲会积压
当积压大于这个配置值时,
服务端会主动断开与客户端的连接
(一般的客户端不会有这个问题,因为是请求-返回的模式)

客户端的类型

```conf
# normal -> normal clients including MONITOR clients
# slave  -> slave clients
# pubsub -> clients subscribed to at least one pubsub channel or pattern
```

操作语法

```conf
client-output-buffer-limit <class> <hard limit> <soft limit> <soft seconds>
```

值设置为0则表示不限制

#### 例子

```conf
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit slave 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
```

### hz 

#### 说明

就是决定函数`serverCron`函数内部分功能的调用频率的
默认为10次/秒
取值范围为1-500
正常使用10即可,
对过期键等判断要求严格的可以上调至100
但会在空闲时占用更多的cpu.

#### 例子

```conf
hz 10
```

### aof-rewrite-incremental-fsync

#### 说明

当重写AOF文件时,开启该功能会按照每
32MB数据写一次磁盘.
就是开启增量写文件的功能.
可以防止一次性写很大的数据使延迟很大

#### 例子

```conf
aof-rewrite-incremental-fsync yes
```

## LEVELDB

### leveldb

#### 说明

是否使用leveldb持久化数据

#### 例子

```conf
leveldb yes
```

### leveldb-path

#### 说明

leveldb数据的存放目录
这个目录是在上面的`dir`配置的基础上拼装出来的,
并不是从根目录开始计算

#### 例子

```conf
leveldb-path ./var
```

