---
title: pprof简述
tags:
  - profiler
  - cpu
categories:
  - cpp
  - profiler
date: 2019-03-04 11:19:48
---

pprof是google的测试c++代码性能的工具

## 输出内容

- 函数cpu耗时百分比
- 函数调用次数

## makefile需要添加库引用

`-lprofiler`

## 输出途径

- 全程序整体分析
	- `env LD_PRELOAD="/path/to/libprofile.a" CPUPROFILE=gmon.out`
- 指定代码段分析
	- 开始处调用函数`ProfilerStart("gmon.out")`
	- 结束处调用函数`ProfilerStop()`

## 将输出结果转化为pdf可是图片

`pprof --pdf ./运行程序名 gmon.out > XXX.pdf`
查看分析生成的pdf即可
