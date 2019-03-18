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
(valgrind,callgrind同样可以分析)

## 输出内容

- 函数cpu耗时百分比
- 函数调用次数

## makefile需要添加库引用

`-lprofiler`

## 输出途径

- 全程序整体分析
	- `env LD_PRELOAD="/path/to/libprofiler.a" CPUPROFILE=gmon.out ./执行程序名`
	- 注:要生成文件必须要程序正常退出才行,如果是信号触发的退出,必须在信号处理中加入`ProfilerStop()`函数的调用才能生成分析文件
- 指定代码段分析
	- 开始处调用函数`ProfilerStart("gmon.out")`
	- 结束处调用函数`ProfilerStop()`

## 将输出结果转化为pdf可是图片

`pprof --pdf ./运行程序名 gmon.out > XXX.pdf`
查看分析生成的pdf即可
