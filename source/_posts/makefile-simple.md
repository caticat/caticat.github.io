---
title: 简单的makefile示例
tags: makefile
categories: cpp
date: 2018-06-08 15:02:19
---

简单的makefile示例
使用了命令查找所有的cpp源文件

<!-- more -->
```makefile
NAME=test
LINK=g++
CC=gcc
LINKOPTS+= -pthread
CCOPTS+= -std=c++11
CCOPTS+= -g
CCOPTS+= -Wall

SRCS=$(shell find . -iname "*.cpp")
OBJS=$(patsubst %.cpp, %.o, $(SRCS))

$(NAME) : $(OBJS)
	$(LINK) -o $(NAME) $(OBJS) $(LINKOPTS)

.cpp.o:
	$(CC) -c $< $(CCOPTS)

clean:
	rm -f $(OBJS) $(NAME)
```
