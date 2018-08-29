---
title: NodeJS读写ProtoBuf的例子
tags:
  - nodejs
  - protobuf
  - redis
categories: nodejs
date: 2018-08-29 16:28:49
---


NodeJS读写ProtoBuf的例子

包含功能

- 生成proto的脚本
- js创建proto对象
- js序列化/反序列化proto对象
- js写redis数据库
- js写文件
- go读redis数据库
- go反序列化js生成的proto数据

## protobuff

实际测试的proto文件
使用proto2的语法(只是为了我这边方便)

test123.proto

```protobuf
syntax = "proto2";

package test123;

message Info
{
	optional string info = 1;
}

message Data
{
	message Equip
	{
		optional uint32 id = 1;
		optional string name = 2;
	}
	optional uint32 id = 1;
	optional string name = 2;
	optional bool flag = 3;
	repeated Equip equips = 4;
	optional Info info = 5;
}
```
<!-- more -->

导出代码文件方法:

- js
	`/D/pan/lib/protoc-3.5.0-win32/bin/protoc3 -I/D/pan/test_javascript/test/proto/src --js_out=import_style=commonjs,binary:D:/pan/test_javascript/test/proto/tar /D/pan/test_javascript/test/proto/src/test123.proto`
- go
	`/D/pan/lib/protoc-3.5.0-win32/bin/protoc3 -I/D/pan/test_javascript/test/proto/src --go_out=D:/pan/test_go/readjsproto/proto /D/pan/test_javascript/test/proto/src/test123.proto`

## js

测试用js代码,
包含了创建protomsg,
序列化写文件,
写redis数据库

相关的库

- redis	写数据库
- google-protobuf 解析protobuf

test.js

```javascript
// protobuf的用法
// 导出.proto文件
// /D/pan/lib/protoc-3.5.0-win32/bin/protoc3 -I/D/pan/test_javascript/test/proto/src --js_out=import_style=commonjs,binary:D:/pan/test_javascript/test/proto/tar /D/pan/test_javascript/test/proto/src/test123.proto
require("./proto/tar/test123_pb");
var msg = new proto.test123.Data();
msg.setId(1);
msg.setName("a啊哈b1");
msg.setFlag(true);
var equips = new Array();
for (var i = 0; i < 5; i++)
{
    var equip = new proto.test123.Data.Equip();
    equip.setId(i);
    equip.setName("aaa"+i);
    equips.push(equip);
}
msg.setEquipsList(equips);
var info = new proto.test123.Info();
info.setInfo("阿斯蒂芬");
msg.setInfo(info);
var bytes = msg.serializeBinary();
// console.log(bytes);
var msg2 = proto.test123.Data.deserializeBinary(bytes);
// console.log(msg2);
info = msg2.getInfo();
console.log(info.getInfo());
equips = msg2.getEquipsList();
for (idx in equips)
{
    var equip = equips[idx];
    console.log(equip.getId(), equip.getName());
}

// 写文件
var fs = require("fs");
fs.writeFileSync("./data.txt", bytes);

// redis的用法
var redis = require("redis");
var client = redis.createClient("9999", "127.0.0.1");
client.auth("password");
client.on("error",function(error){
    console.log(error);
});

client.select(0, function (error){
    if (error) {
        console.log("err:", error);
    } else {
        var buf = new Buffer(bytes);
        client.set("proto:data", buf, function(error, res){
            if (error) {
                console.log("err:", error);
            } else {
                console.log("res:", res);
            }
            client.end(true);
        });
    }
});
```

## go

使用go脚本读取js写的序列化proto数据,
包含反序列化redis数据
反序列化文件数据

包含的库

- ivanabc/radix/redis	redis客户端
- golang/protobuf/proto	protobuf解析

readjsproto.go

```go
package main

import (
	"github.com/ivanabc/radix/redis"
	"fmt"
	"proto"
	"github.com/golang/protobuf/proto"
	"io/ioutil"
)

// 读取js写的proto文件

// /D/pan/lib/protoc-3.5.0-win32/bin/protoc3 -I/D/pan/test_javascript/test/proto/src --go_out=D:/pan/test_go/readjsproto/proto /D/pan/test_javascript/test/proto/src/test123.proto

func main() {
	r, err := redis.Dial("tcp", "127.0.0.1:9999")
	if err != nil {
		fmt.Println(err)
		return
	}

	rep := r.Cmd("AUTH", "password");
	//fmt.Println(rep)

	rep = r.Cmd("GET", "proto:data")
	//fmt.Println(rep)

	data, err := rep.Bytes()
	if err != nil {
		fmt.Println("1错误:", err)
		return
	}
	msg := &test123.Data{}
	proto.Unmarshal(data, msg)
	fmt.Println("1", msg.GetId(), msg.GetName(), msg.GetInfo().GetInfo(), msg)

	data, err = ioutil.ReadFile("D:/pan/test_javascript/test/data.txt")
	if err != nil {
		fmt.Println("2错误:", err)
		return
	}
	proto.Unmarshal(data, msg)
	fmt.Println("2", msg.GetId(), msg.GetName(), msg.GetInfo().GetInfo(), msg)
}
```
