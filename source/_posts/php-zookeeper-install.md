---
title: php安装zookeeper扩展
date: 2018-04-03 20:14:51
tags:
  - php
  - zookeeper
categories:
  - php
---

下面的`.so`是生成的,生成方法后面有些,这里就不上传附件了.

## 使用方法

1. 将`zookeeper.so`复制到php扩展目录里面,如:`/usr/lib64/php/modules/zookeeper.so`
2. 在`/etc/php.ini`结尾追加内容:
```ini
[zookeeper]
extension=zookeeper.so
```
3. 重启php服务

## 说明

`zookeeper.so`库是根据`zookeeper-3.4.10`和php扩展`zookeeper-0.4.0`编译生成

## 追加自主编译流程说明

```shell
# 编译zookeeper生成so文件
tar -xzf zookeeper-3.4.9.tar.gz
cd zookeeper-3.4.9/src/c
./configure –prefix=/usr/local/zookeeper-lib/
make && make install

# 编译php-zookeeper生成so文件
tar xzf zookeeper-0.3.1.tgz
cd zookeeper-0.3.1
phpize
./configure -with-php-config=/usr/local/php7/bin/php-config -with-libzookeeper-dir=/usr/local/zookeeper-lib/
make 
make install
```
