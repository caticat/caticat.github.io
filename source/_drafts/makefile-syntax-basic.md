---
title: Makefile基本语法
tags: makefile
categories: makefile
---
makefile是简化编译的脚本
和shell脚本类似
通过自身的语法来实现编译生成文件

## 注意

- 所有的命令,必须要以`\t`开头
<!-- more -->

## 预制定义变量

预制定义变量中有些变量实际上是用空格分隔的文件列表
make命令会根据语法判断是遍历还是

符号 | 内容说明 | 实例
-|
$@ | 目标文件 | main.o
$< | 构造所需文件列表的第一个文件的名字 | main.cpp
$^ | 构造所需文件列表的所有文件的名字 | main.cpp a.cpp
$% | (无视)库相关 |
$? | (无视)所有比目标新的依赖目标的集合 |
$+ | 同$^,但是去掉重组文件 | 

## 云算符

- `=`,延后赋值(右面还有`=`的话会被覆盖)
- `:=`,立刻赋值

```makefile
# make会将整个makefile展开后,再决定变量的值,实际就是最后的值会覆盖前面的值
x = foo
y = $(x) bar # xyz bar
x = xyz
```
```makefile
# 按照顺序进行赋值
x := foo
y := $(x) bar # foo bar
x := xyz
```

## 函数

### 字符串处理函数

- `$(subst <from>,<to>,<text>)`
	替换字符串
	示例:`$(subst ee,EE,feet on the street)`结果为"fEEt on the strEEt"
- `$(patsubst <pattern>,<replacement>,<text>)`
	模式替换
	`<pattern>`可以使用通配符"%"表示任意长度的字符串
	`<replacement>`中的通配符"%"表示`<pattern>`中通配符的同一个字符串
	示例:`$(patsubst %c,%o,x.c.c bar.c)`结果为"x.c.o bar.o"
- `$(strip <string>)`
	去除两端空格
	示例:`$(strip a b c )`结果为"a b c"
- `$(findstring <find>,<in>)`
	在`<in>`中查找字符串`<find>`,找到则返回`<find>`字符串,没有找到返回""字符串
	示例:`$(findstring a,a b c)`返回"a"
- `$(filter <pattern...>,<text>)`
	按照提供的模式来过滤后面的`text`内容,保留所有符合模式的内容,模式可以有多个
	示例:
	```makefile
	sources := foo.c bar.c baz.s ugh.h
	foo:$(sources)
		cc $(filter %c %s,$(sources)) -o foo
	```
	会把"foo.c bar.c baz.s"返回出来
- `$(filter-out <pattern...>,<text>)`
	反向过滤,和`filter`一样,不过是取反,所有不符合模式的内容返回出来
	示例:
	```makefile
	objects = main1.o foo.o main2.o bar.o
	mains = main1.o main2.o
	$(filter-out $(mains),$(objects))
	```
	返回值是"foo.o bar.o"
- `$(sort <list>)`
	返回按字符串升序"<"排序,会去掉相同的字符串
	示例:`$(sort foo bar lost)`返回"bar foo lose"
- `$(word <n>,<text>)`
	返回`<text>`中的第`<n>`个字符串,索引从1开始,索引超出列表长度返回空字符串
	示例:`$(word 2,foo bar baz)`返回"bar"
- `$(wordlist <start>,<end>,<text>)`
	返回开始到结束的字符串列表,超出部分不返回,包含开始和结束
	示例:`$(wordlist 2,3,foo bar baz)`返回"bar baz"
- `words <text>`
	统计单词个数
	示例:`$(words foo bar baz)`返回3
	取字符列表最后一个字符:`$(word $(words <text>), <text>)`
- `firstword <text>`
	取字符列表第一个单次
	示例:`$(firstword foo bar)`返回"foo"

### 文件名操作函数

- `$(wildcard <pattern1> <pattern2>...)`
	取所有符合通配符的文件
	示例:`$(wildcard *.cpp)`取到所有当前目录的cpp文件
- `$(dir <names...>)`
	取目录,按最后一个`/`之前的内容计算,没有则返回"./"
	示例:`$(dir src/foo.c hacks)`返回"src/ ./"
- `notdir <names...>`
	取文件名
	示例:`$(notdir src/foo.c hacks)`返回"foo.c hacks"
- `$(suffix <names...>)`
	取后缀
	示例:`$(suffix src/foo.c src-1.0/bar.c hacks)`返回".c .c"
- `$(basename <names...>)`
	取前缀
	示例:`$(basename src/foo.c src-1.0/bar.c hacks)`返回"src/foo src-1.0/bar hacks"
- `$(addsuffix <suffix>,<names...>)`
	添加后缀
	示例:`$(addsuffix .c,foo bar)`返回"foo.c bar.c"
- `$(addprefix <prefix>,<names...>)`
	添加前缀
	示例:`$(addprefix src/,foo bar)`返回"src/foo src/bar"
- `$(join <list1>,<list2>)`
	按顺序连接两个列表
	示例:`$(join aaa bbb,111 222 333)`返回"aaa111 bbb222 333"

### 特殊函数

- `$(shell <shell command>)`
	执行shell命令,和使用反引号"\`"执行命令是一样的
	因为会新开一个shell来执行命令,所以注意性能影响
	示例:`$(shell find . -iname "*.cpp")`返回当前路径下所有的cpp文件
- `$(call <expression>,<param>,<param>...)`
	自定义函数
	```makefile
	reverse = $(1) $(2)
	foo = $(call reverse,a,b) # a b
	```
	```makefile
	reverse = $(2) $(1)
	foo = $(call reverse,a,b) # b a
	```
- `$(origin <variable>)`
	(这个不仔细看了)返回变量的来源
	来源:
		- "undefined" 未定义
		- "default" 默认变量,比如"CC"
		- "environment" 环境变量
		- "file" 被定义在makefile中的变量
		- "commandline" 命令行变量
		- "override" 被override重定义的
		- "automatic" 自动变量

## 可能也会用到的内容

- `include`,想cpp中一样,引用其他的makefile文件
- `export`,是变量传递到下一级makefile中

## 编写示例

这里参考了==陈皓==的`跟我一起写makefile`

### 最基本写法,全部手写

```makefile
test : main.o a.o # 目标 : 所有依赖项
    g++ -o test main.o a.o # 命令

main.o : main.cpp a.h # 所有依赖项的修改时间会决定是否需要重新生成目标
    g++ -c main.cpp

a.o : a.cpp a.h
    g++ -c a.cpp

clean :
    rm test main.o a.o
```

### 定义变量

```makefile
OBJS = main.o a.o # 定义变量,后面可以像宏一样使用  

test : $(OBJS)
    g++ -o test $(OBJS)

main.o : main.cpp a.h
    g++ -c main.cpp

a.o : a.cpp a.h
    g++ -c a.cpp

clean :
    rm test $(OBJS)
```

### 自动推导

```makefile
OBJS = main.o a.o      

test : $(OBJS)
    g++ -o test $(OBJS)
main.o : a.h # 默认根据*.o会推导出*.cpp文件肯定在依赖项中,所以无需手动写出,另外命令也会自动推导出来,所以可以省略
a.o : a.h # 如果依赖只有a.cpp,则可以写成`a.o:`即可

.PHONY : clean
clean :
    rm test $(OBJS)
```

### 伪目标

```makefile
OBJS = main.o a.o      

test : $(OBJS)
    g++ -o test $(OBJS)
main.o : a.h
a.o : a.h

.PHONY : clean # `.PHONY`明确的标识了clean是一个伪目标
clean : # 伪目标:不存在实际生成文件的目标,就像标签,函数一样,调用需要手动明确调用,如:`make clean`
    -rm test $(OBJS) # `-`表明了出现错误不中断,正常没有减号,make出错会停止运行
```

### 一个命令生成多个目标程序

make一下,可以生成多个程序的方法
使用伪目标实现

```makefile
all : prog1 prog2 prog3
.PHONY : all

prog1 : prog1.o utils.o
	cc -o
```

### levelDB源码继承的测试代码时自己写的例子

```makefile
TARGET=test

LINKER=g++

LINKOPTS+= -pthread
CCOPTS+= -std=c++11
CCOPTS+= -g
CCOPTS+= -Wall
CCOPTS+= -I./deps/leveldb/include
SRCS=$(wildcard *.cpp)
OBJS=$(patsubst %.cpp, %.o, $(SRCS))

LVDBOPTS+= $(CCOPTS)
LVDBOPTS+= -I./deps/leveldb
LVDBOPTS+= -DOS_LINUX
LVDBOPTS+= -DLEVELDB_PLATFORM_POSIX
LVDBOPTS+= -DLEVELDB_ATOMIC_PRESENT
LVDBOPTS+= -DSNAPPY
LVDBOPTS+= -DLEVELDB_IS_BIG_ENDIAN=0
LVDB_SRCS_DB = $(filter-out %_test.cc %db_bench.cc %leveldbutil.cc, $(wildcard deps/leveldb/db/*.cc))
LVDB_SRCS_TABLE = $(filter-out %_test.cc, $(wildcard deps/leveldb/table/*.cc))
LVDB_SRCS_UTIL = $(filter-out %_test.cc, $(wildcard deps/leveldb/util/*.cc))
LVDB_SRCS_HELPERS = $(filter-out %_test.cc, $(wildcard deps/leveldb/helpers/memenv/*.cc))
LVDB_SRCS_PORT = $(filter-out %_test.cc, $(wildcard deps/leveldb/port/*.cc))
OBJS_LVDB = $(patsubst %cc,%o,$(LVDB_SRCS_DB)) \
	$(patsubst %cc,%o,$(LVDB_SRCS_TABLE)) \
	$(patsubst %cc,%o,$(LVDB_SRCS_UTIL)) \
	$(patsubst %cc,%o,$(LVDB_SRCS_HELPERS)) \
	$(patsubst %cc,%o,$(LVDB_SRCS_PORT))

$(TARGET) : $(OBJS) $(OBJS_LVDB)
	$(LINKER) -o $(TARGET) $(OBJS) $(OBJS_LVDB) $(LINKOPTS)

.cpp.o:
	$(LINKER) -c $(CCOPTS) -o $@ $<

.cc.o:
	$(LINKER) -c $(LVDBOPTS) -o $@ $<

clean:
	-rm -f $(OBJS) $(OBJS_LVDB) $(TARGET)

.PHONY : clean

t:
	@echo $(LVDB_SRCS_DB)
	@echo $(wildcard *.cpp)
	@echo $(wildcard %.cpp)

.PHONY : t
```
