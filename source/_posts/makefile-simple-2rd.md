---
title: 简单的makefile示例(不使用shell系统命令的版本)
tags: makefile
categories: cpp
date: 2018-11-23 16:23:19
---

简单的makefile示例
没有使用系统命令
所以平台通用
但是需要手动调整添加新增的目录

<!-- more -->
```makefile
TARGET = mk
DIR = a b .
OBJS = $(foreach dir,$(DIR), $(patsubst %.cpp,%.o,$(wildcard $(dir)/*.cpp)))

$(TARGET) : $(OBJS)
	$(CXX) -o $@ $^

$(OBJS) : %.o : %.cpp
	$(CXX) -o $@ -c $<

clean:
	-$(RM) $(TARGET) $(OBJS)
```
